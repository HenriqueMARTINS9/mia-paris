"use server";

import { revalidatePath } from "next/cache";

import { mapUiPriorityToDatabasePriority } from "@/features/requests/metadata";
import type { RequestPriority } from "@/features/requests/types";
import { mapUiEmailStatusToDatabaseValues } from "@/features/emails/metadata";
import type {
  EmailMutationResult,
  EmailProcessingStatus,
} from "@/features/emails/types";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  supabaseRestPatch,
} from "@/lib/supabase/rest";

interface UpdateEmailStatusInput {
  emailId: string;
  status: EmailProcessingStatus;
}

interface AttachEmailToRequestInput {
  emailId: string;
  requestId: string;
}

interface CreateRequestFromEmailInput {
  deadline: string | null;
  detectedType: string | null;
  emailId: string;
  previewText: string;
  priority: RequestPriority;
  subject: string;
  summary: string | null;
}

export async function markEmailProcessedAction(
  input: Omit<UpdateEmailStatusInput, "status">,
): Promise<EmailMutationResult> {
  return updateEmailStatus({
    emailId: input.emailId,
    status: "processed",
  });
}

export async function markEmailForReviewAction(
  input: Omit<UpdateEmailStatusInput, "status">,
): Promise<EmailMutationResult> {
  return updateEmailStatus({
    emailId: input.emailId,
    status: "review",
  });
}

export async function attachEmailToRequestAction(
  input: AttachEmailToRequestInput,
): Promise<EmailMutationResult> {
  if (!input.requestId) {
    return {
      ok: false,
      field: "request_link",
      message: "Sélectionne une demande existante à rattacher.",
    };
  }

  const payloads = [
    { request_id: input.requestId },
    { linked_request_id: input.requestId },
    { crm_request_id: input.requestId },
  ];

  return patchEmailWithPayloads({
    emailId: input.emailId,
    field: "request_link",
    payloads,
    successMessage: "Email rattaché à la demande existante.",
  });
}

export async function createRequestFromEmailAction(
  input: CreateRequestFromEmailInput,
): Promise<EmailMutationResult> {
  if (!input.emailId) {
    return {
      ok: false,
      field: "request_creation",
      message: "Identifiant email manquant.",
    };
  }

  const requestInsertResult = await insertRequestFromEmail(input);

  if (!requestInsertResult.ok || !requestInsertResult.requestId) {
    return requestInsertResult;
  }

  const attachResult = await attachEmailToRequestAction({
    emailId: input.emailId,
    requestId: requestInsertResult.requestId,
  });

  revalidatePath("/demandes");
  revalidatePath(`/requests/${requestInsertResult.requestId}`);

  return {
    ok: true,
    field: "request_creation",
    message: attachResult.ok
      ? "Demande créée depuis l’email et rattachée avec succès."
      : "Demande créée depuis l’email. Le rattachement automatique de l’email n’a pas pu être finalisé.",
    requestId: requestInsertResult.requestId,
  };
}

async function updateEmailStatus(
  input: UpdateEmailStatusInput,
): Promise<EmailMutationResult> {
  const payloads: Array<Record<string, unknown>> = [];

  for (const column of ["processing_status", "status", "triage_status"]) {
    for (const value of mapUiEmailStatusToDatabaseValues(input.status)) {
      payloads.push({
        [column]: value,
      });
    }
  }

  return patchEmailWithPayloads({
    emailId: input.emailId,
    field: "status",
    payloads,
    successMessage:
      input.status === "processed"
        ? "Email marqué comme traité."
        : "Email marqué à revoir.",
  });
}

async function patchEmailWithPayloads(options: {
  emailId: string;
  field: EmailMutationResult["field"];
  payloads: Array<Record<string, unknown>>;
  successMessage: string;
}): Promise<EmailMutationResult> {
  if (!options.emailId) {
    return {
      ok: false,
      field: options.field,
      message: "Identifiant email manquant.",
    };
  }

  let latestError: string | null = null;

  for (const payload of options.payloads) {
    const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
      "emails",
      {
        ...payload,
        updated_at: new Date().toISOString(),
      },
      {
        id: `eq.${options.emailId}`,
        select: "id",
      },
    );

    if (!result.error && result.data && result.data.length > 0) {
      revalidatePath("/emails");
      revalidatePath("/", "layout");

      return {
        ok: true,
        field: options.field,
        message: options.successMessage,
      };
    }

    if (!result.error && (!result.data || result.data.length === 0)) {
      latestError =
        "Aucun email n'a été mis à jour. Vérifie les policies RLS et la visibilité de la ligne.";
      continue;
    }

    latestError = getEmailMutationErrorMessage(result.error ?? "Mutation impossible.");

    if (!isMissingSupabaseColumnError(result.rawError)) {
      break;
    }
  }

  return {
    ok: false,
    field: options.field,
    message:
      latestError ??
      "Mutation impossible sur emails. Vérifie les colonnes disponibles.",
  };
}

async function insertRequestFromEmail(
  input: CreateRequestFromEmailInput,
): Promise<EmailMutationResult> {
  const dueAt = toIsoDate(input.deadline);
  const normalizedType = normalizeRequestType(input.detectedType);
  const payloadCandidates: Array<Record<string, unknown>> = [
    {
      title: input.subject.trim(),
      request_type: normalizedType,
      status: "new",
      priority: mapUiPriorityToDatabasePriority(input.priority),
      source_email_id: input.emailId,
      summary: input.summary ?? input.previewText,
      due_at: dueAt,
      updated_at: new Date().toISOString(),
    },
    {
      title: input.subject.trim(),
      request_type: normalizedType,
      status: "new",
      priority: mapUiPriorityToDatabasePriority(input.priority),
      summary: input.summary ?? input.previewText,
      due_at: dueAt,
      updated_at: new Date().toISOString(),
    },
    {
      title: input.subject.trim(),
      request_type: normalizedType,
      status: "new",
      priority: mapUiPriorityToDatabasePriority(input.priority),
      updated_at: new Date().toISOString(),
    },
    {
      title: input.subject.trim(),
      status: "new",
      priority: mapUiPriorityToDatabasePriority(input.priority),
      updated_at: new Date().toISOString(),
    },
  ];

  let latestError: string | null = null;

  for (const payload of payloadCandidates) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      "requests",
      payload,
      {
        select: "id",
      },
    );

    if (!result.error && result.data && result.data.length > 0) {
      const requestId = result.data[0]?.id;

      return {
        ok: true,
        field: "request_creation",
        message: "Demande créée depuis l’email.",
        requestId: typeof requestId === "string" ? requestId : null,
      };
    }

    if (!result.error && (!result.data || result.data.length === 0)) {
      latestError =
        "Aucune demande n'a été créée. Vérifie les policies RLS et la structure de la table requests.";
      continue;
    }

    latestError = `Création de demande impossible: ${result.error}`;

    if (!isMissingSupabaseColumnError(result.rawError)) {
      break;
    }
  }

  return {
    ok: false,
    field: "request_creation",
    message:
      latestError ??
      "Création de demande impossible depuis l’email. Vérifie les colonnes attendues sur requests.",
  };
}

function getEmailMutationErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("policy")
  ) {
    return "Mise à jour refusée par Supabase RLS sur emails.";
  }

  return `Mutation impossible sur emails: ${message}`;
}

function normalizeRequestType(value: string | null) {
  if (!value) {
    return "email_request";
  }

  return value.toLowerCase().trim().replace(/\s+/g, "_");
}

function toIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
