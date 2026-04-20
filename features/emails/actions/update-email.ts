"use server";

import { revalidatePath } from "next/cache";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import { mapUiEmailStatusToDatabaseValues } from "@/features/emails/metadata";
import type {
  EmailInboxBucket,
  EmailMutationResult,
  EmailProcessingStatus,
} from "@/features/emails/types";
import {
  isMissingSupabaseColumnError,
  isMissingSupabaseResourceError,
  supabaseRestInsert,
  supabaseRestPatch,
  supabaseRestSelectMaybeSingle,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";
import type { EmailRecord } from "@/types/crm";
import { parseJsonObject, readNumber, readObject, readString } from "@/lib/record-helpers";

interface UpdateEmailStatusInput {
  emailId: string;
  status: EmailProcessingStatus;
}

interface AttachEmailToRequestInput {
  emailId: string;
  requestId: string;
}

interface SetEmailInboxBucketInput {
  bucket: EmailInboxBucket;
  confidence?: number | null;
  emailId: string;
  reason?: string | null;
  source?: "assistant" | "system" | "ui";
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

export async function ignoreEmailForNowAction(
  input: Omit<UpdateEmailStatusInput, "status">,
): Promise<EmailMutationResult> {
  return updateEmailStatus({
    emailId: input.emailId,
    status: "new",
  });
}

export async function setEmailInboxBucketAction(
  input: SetEmailInboxBucketInput,
): Promise<EmailMutationResult> {
  const authorization = await authorizeServerAction("emails.qualify");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "inbox_bucket",
      message: authorization.message,
    };
  }

  if (!input.emailId) {
    return {
      ok: false,
      field: "inbox_bucket",
      message: "Identifiant email manquant.",
    };
  }

  const emailResult = await supabaseRestSelectMaybeSingle<EmailRecord>("emails", {
    id: `eq.${input.emailId}`,
    select: "*",
  });

  if (emailResult.error || !emailResult.data) {
    return {
      ok: false,
      field: "inbox_bucket",
      message: `Impossible de charger l’email à classer: ${emailResult.error ?? "email introuvable."}`,
    };
  }

  const classificationPatch = {
    assistant_bucket: input.bucket,
    assistant_bucket_confidence: normalizeBucketConfidence(input.confidence),
    assistant_bucket_reason: input.reason ?? null,
    triage_source: input.source ?? "assistant",
    triaged_at: new Date().toISOString(),
  };
  const mergedClassification = mergeEmailClassificationPayload(
    emailResult.data,
    classificationPatch,
  );
  const payloads: Array<Record<string, unknown>> = [
    {
      ai_classification: mergedClassification,
      assistant_bucket: input.bucket,
      assistant_bucket_confidence: normalizeBucketConfidence(input.confidence),
      assistant_bucket_reason: input.reason ?? null,
    },
    {
      classification_json: mergedClassification,
      assistant_bucket: input.bucket,
      assistant_bucket_confidence: normalizeBucketConfidence(input.confidence),
      assistant_bucket_reason: input.reason ?? null,
    },
    {
      ai_classification: mergedClassification,
    },
    {
      classification_json: mergedClassification,
    },
  ];

  const result = await patchEmailWithPayloads({
    emailId: input.emailId,
    field: "inbox_bucket",
    payloads,
    successMessage:
      input.bucket === "important"
        ? "Email classé comme important."
        : input.bucket === "promotional"
          ? "Email classé dans Pub."
          : "Email déplacé dans À vérifier.",
  });

  if (result.ok) {
    await createActivityLogEntry({
      action: "email_inbox_bucket_updated",
      actorId: authorization.actorId,
      description: `Email ${input.emailId} classé dans ${input.bucket}.`,
      entityId: input.emailId,
      entityType: "email",
      payload: classificationPatch,
      requestId: null,
      source: input.source ?? "ui",
      status: "success",
    });
  }

  return result;
}

export async function attachEmailToRequestAction(
  input: AttachEmailToRequestInput,
): Promise<EmailMutationResult> {
  const authorization = await authorizeServerAction("emails.qualify");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "request_link",
      message: authorization.message,
    };
  }

  if (!input.requestId) {
    return {
      ok: false,
      field: "request_link",
      message: "Sélectionne une demande existante à rattacher.",
    };
  }

  const classificationPayload = {
    linkedRequestId: input.requestId,
    linkMode: "existing_request",
    validatedAt: new Date().toISOString(),
  };
  const payloads: Array<Record<string, unknown>> = [];

  for (const statusColumn of ["processing_status", "status", "triage_status"]) {
    for (const statusValue of ["classified", "processed"]) {
      for (const requestColumn of [
        "request_id",
        "linked_request_id",
        "crm_request_id",
      ]) {
        payloads.push({
          [requestColumn]: input.requestId,
          [statusColumn]: statusValue,
          ai_classification: classificationPayload,
          is_processed: true,
        });
        payloads.push({
          [requestColumn]: input.requestId,
          [statusColumn]: statusValue,
          classification_json: classificationPayload,
          is_processed: true,
        });
        payloads.push({
          [requestColumn]: input.requestId,
          [statusColumn]: statusValue,
          is_processed: true,
        });
      }
    }
  }

  const result = await patchEmailWithPayloads({
    emailId: input.emailId,
    field: "request_link",
    payloads,
    successMessage: "Email rattaché à la demande existante et marqué traité.",
  });

  if (result.ok) {
    await createActivityLogEntry({
      action: "email_attached_to_existing_request",
      actorId: authorization.actorId,
      description: `Email ${input.emailId} rattaché à la demande ${input.requestId}.`,
      entityId: input.emailId,
      entityType: "email",
      payload: classificationPayload,
      requestId: input.requestId,
      source: "ui",
      status: "success",
    });
    revalidatePath(`/requests/${input.requestId}`);
    revalidatePath("/demandes");

    return {
      ...result,
      requestId: input.requestId,
    };
  }

  await createActivityLogEntry({
    action: "email_attach_to_request_failed",
    actorId: authorization.actorId,
    description: result.message,
    entityId: input.emailId,
    entityType: "email",
    payload: classificationPayload,
    requestId: input.requestId,
    source: "ui",
    status: "failure",
  });

  return result;
}

async function createActivityLogEntry(input: {
  action: string;
  actorId?: string | null;
  description: string;
  entityId: string | null;
  entityType: string;
  payload: Record<string, unknown>;
  requestId: string | null;
  source?: "assistant" | "system" | "ui";
  status?: "failure" | "success";
}) {
  const payload: Record<string, unknown> = {
    action: input.action,
    action_source: input.source ?? "system",
    action_status: input.status ?? "success",
    action_type: input.action,
    actor_id: input.actorId ?? null,
    actor_type: input.actorId ? "user" : "system",
    created_at: new Date().toISOString(),
    description: input.description,
    entity_id: input.entityId,
    entity_type: input.entityType,
    metadata: input.payload,
    payload: input.payload,
    request_id: input.requestId,
    scope: "emails.link_to_request",
    source: input.source ?? "system",
    status: input.status ?? "success",
  };

  const result = await insertWithMissingColumnFallback("activity_logs", payload, {
    select: "id",
  });

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    console.warn("[emails] activity log insert failed", result.error);
  }
}

async function updateEmailStatus(
  input: UpdateEmailStatusInput,
): Promise<EmailMutationResult> {
  const payloads: Array<Record<string, unknown>> = [];

  for (const value of mapUiEmailStatusToDatabaseValues(input.status)) {
    payloads.push({
      processing_status: value,
      is_processed: input.status === "processed",
    });
    payloads.push({
      status: value,
      is_processed: input.status === "processed",
    });
    payloads.push({
      triage_status: value,
      is_processed: input.status === "processed",
    });
  }

  return patchEmailWithPayloads({
    emailId: input.emailId,
    field: "status",
    payloads,
    successMessage:
      input.status === "processed"
        ? "Email marqué comme traité."
        : input.status === "review"
          ? "Email marqué à revoir."
          : "Email laissé en attente pour plus tard.",
  });
}

async function patchEmailWithPayloads(options: {
  emailId: string;
  field: EmailMutationResult["field"];
  payloads: Array<Record<string, unknown>>;
  successMessage: string;
}): Promise<EmailMutationResult> {
  const authorization = await authorizeServerAction("emails.qualify");

  if (!authorization.ok) {
    return {
      ok: false,
      field: options.field,
      message: authorization.message,
    };
  }

  if (!options.emailId) {
    return {
      ok: false,
      field: options.field,
      message: "Identifiant email manquant.",
    };
  }

  let latestError: string | null = null;

  for (const payload of options.payloads) {
    const result = await patchWithMissingColumnFallback(
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

    latestError = getEmailMutationErrorMessage(
      result.error ?? "Mutation impossible.",
    );

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

async function patchWithMissingColumnFallback(
  resource: string,
  payload: Record<string, unknown>,
  params: Record<string, string>,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      params,
    );

    if (!result.error) {
      return result;
    }

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.rawError);

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }
}

async function insertWithMissingColumnFallback(
  resource: string,
  payload: Record<string, unknown>,
  params?: Record<string, string>,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      params,
    );

    if (!result.error) {
      return result;
    }

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.rawError);

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function extractMissingColumnName(error: SupabaseRestErrorPayload | null) {
  if (!error) {
    return null;
  }

  const haystack = [
    error.message,
    error.details,
    error.error,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ");
  const match = haystack.match(/column ["']?([a-zA-Z0-9_]+)["']?/i);

  return match?.[1] ?? null;
}

function normalizeBucketConfidence(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (value > 1) {
    return Math.max(0, Math.min(value / 100, 1));
  }

  return Math.max(0, Math.min(value, 1));
}

function mergeEmailClassificationPayload(
  email: EmailRecord,
  patch: Record<string, unknown>,
) {
  const currentClassification =
    readObject(email, [
      "ai_classification",
      "classification_json",
      "classification",
      "analysis",
    ]) ??
    parseJsonObject(
      readString(email, [
        "ai_classification",
        "classification_json",
        "classification",
        "analysis",
      ]),
    ) ??
    {};

  const merged = {
    ...currentClassification,
    ...patch,
  };

  if (readNumber(currentClassification, ["confidence", "score"]) !== null) {
    merged.confidence =
      readNumber(currentClassification, ["confidence", "score"]) ??
      merged.confidence;
  }

  return merged;
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
