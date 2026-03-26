"use server";

import { revalidatePath } from "next/cache";

import { createDeadlineAction } from "@/features/deadlines/actions/create-deadline";
import { mapUiEmailStatusToDatabaseValues } from "@/features/emails/metadata";
import type {
  EmailMutationResult,
  EmailProcessingStatus,
  EmailQualificationFields,
} from "@/features/emails/types";
import { mapUiPriorityToDatabasePriority } from "@/features/requests/metadata";
import { createRequestTaskAction } from "@/features/tasks/actions/create-request-task";
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
  emailId: string;
  previewText: string;
  qualification: EmailQualificationFields;
  subject: string;
}

interface AutoTaskRule {
  taskTitle: string;
  taskType: string;
}

const requestAutomationRules: Partial<Record<string, AutoTaskRule>> = {
  price_request: {
    taskTitle: "Vérifier la demande de prix",
    taskType: "price_check",
  },
  deadline_request: {
    taskTitle: "Vérifier le délai demandé",
    taskType: "deadline_check",
  },
  tds_request: {
    taskTitle: "Préparer l’envoi de la fiche technique",
    taskType: "tds_send",
  },
  swatch_request: {
    taskTitle: "Préparer les swatches demandés",
    taskType: "swatch_prepare",
  },
  trim_validation: {
    taskTitle: "Suivre la validation trim",
    taskType: "validation_followup",
  },
  production_followup: {
    taskTitle: "Passer en revue le suivi production",
    taskType: "internal_review",
  },
};

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

  const result = await patchEmailWithPayloads({
    emailId: input.emailId,
    field: "request_link",
    payloads,
    successMessage: "Email rattaché à la demande existante.",
  });

  if (result.ok) {
    revalidatePath(`/requests/${input.requestId}`);
    revalidatePath("/demandes");
  }

  return result;
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

  if (!input.qualification.requestType) {
    return {
      ok: false,
      field: "request_creation",
      message: "Sélectionne un type de demande avant de créer le dossier.",
    };
  }

  const requestInsertResult = await insertRequestFromEmail(input);

  if (!requestInsertResult.ok || !requestInsertResult.requestId) {
    return requestInsertResult;
  }

  const requestId = requestInsertResult.requestId;
  const syncEmailResult = await syncEmailAfterRequestCreation({
    emailId: input.emailId,
    qualification: input.qualification,
    requestId,
  });
  const automationSummary = await runEmailAutomationRules({
    requestId,
    subject: input.subject,
    qualification: input.qualification,
  });

  revalidatePath("/emails");
  revalidatePath("/demandes");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/taches");
  revalidatePath("/deadlines");
  revalidatePath("/", "layout");

  const messages = ["Demande créée depuis l’email."];

  if (syncEmailResult.ok) {
    messages.push("Email source synchronisé.");
  } else {
    messages.push("Le lien email <-> demande reste partiel.");
  }

  if (automationSummary.taskCreated) {
    messages.push("Tâche automatique créée.");
  }

  if (automationSummary.deadlineCreated) {
    messages.push("Deadline automatique créée.");
  }

  if (automationSummary.warnings.length > 0) {
    messages.push(automationSummary.warnings.join(" "));
  }

  return {
    ok: true,
    field: "request_creation",
    message: messages.join(" "),
    requestId,
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

async function syncEmailAfterRequestCreation(input: {
  emailId: string;
  qualification: EmailQualificationFields;
  requestId: string;
}) {
  const classificationPayload = {
    requestId: input.requestId,
    validatedAt: new Date().toISOString(),
    qualification: input.qualification,
  };

  const payloads: Array<Record<string, unknown>> = [];

  for (const statusColumn of ["processing_status", "status", "triage_status"]) {
    for (const processedValue of mapUiEmailStatusToDatabaseValues("processed")) {
      for (const requestColumn of [
        "request_id",
        "linked_request_id",
        "crm_request_id",
      ]) {
        for (const classificationColumn of [
          "ai_classification",
          "classification_json",
        ]) {
          payloads.push({
            [statusColumn]: processedValue,
            [requestColumn]: input.requestId,
            [classificationColumn]: classificationPayload,
          });
        }

        payloads.push({
          [statusColumn]: processedValue,
          [requestColumn]: input.requestId,
        });
      }
    }
  }

  return patchEmailWithPayloads({
    emailId: input.emailId,
    field: "request_link",
    payloads,
    successMessage: "Email source synchronisé avec la demande créée.",
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

async function insertRequestFromEmail(
  input: CreateRequestFromEmailInput,
): Promise<EmailMutationResult> {
  const qualification = input.qualification;
  const payloadCandidates: Array<Record<string, unknown>> = [
    {
      title: input.subject.trim(),
      client_id: qualification.clientId,
      contact_id: qualification.contactId,
      product_department_id: qualification.productDepartmentId,
      model_id: qualification.modelId,
      request_type: qualification.requestType,
      priority: mapUiPriorityToDatabasePriority(qualification.priority),
      status: "new",
      due_at: toIsoDate(qualification.dueAt),
      summary: qualification.summary ?? input.previewText,
      requested_action: qualification.requestedAction,
      ai_confidence: qualification.aiConfidence,
      source_email_id: input.emailId,
      updated_at: new Date().toISOString(),
    },
    {
      title: input.subject.trim(),
      request_type: qualification.requestType,
      priority: mapUiPriorityToDatabasePriority(qualification.priority),
      status: "new",
      due_at: toIsoDate(qualification.dueAt),
      summary: qualification.summary ?? input.previewText,
      source_email_id: input.emailId,
      updated_at: new Date().toISOString(),
    },
    {
      title: input.subject.trim(),
      request_type: qualification.requestType,
      priority: mapUiPriorityToDatabasePriority(qualification.priority),
      status: "new",
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

async function runEmailAutomationRules(input: {
  qualification: EmailQualificationFields;
  requestId: string;
  subject: string;
}) {
  const warnings: string[] = [];
  let taskCreated = false;
  let deadlineCreated = false;
  const requestType = input.qualification.requestType ?? "";
  const automationRule = requestAutomationRules[requestType];

  if (automationRule) {
    const taskResult = await createRequestTaskAction({
      assignedUserId: null,
      dueAt: input.qualification.dueAt,
      priority: input.qualification.priority,
      requestId: input.requestId,
      taskType: automationRule.taskType,
      title: automationRule.taskTitle,
    });

    taskCreated = taskResult.ok;

    if (!taskResult.ok) {
      warnings.push(taskResult.message);
    }
  }

  if (input.qualification.dueAt) {
    const deadlineResult = await createDeadlineAction({
      deadlineAt: input.qualification.dueAt,
      label: buildDeadlineLabel(
        input.qualification.requestedAction,
        input.subject,
      ),
      priority: input.qualification.priority,
      requestId: input.requestId,
    });

    deadlineCreated = deadlineResult.ok;

    if (!deadlineResult.ok) {
      warnings.push(deadlineResult.message);
    }
  }

  return {
    deadlineCreated,
    taskCreated,
    warnings,
  };
}

function buildDeadlineLabel(requestedAction: string | null, subject: string) {
  if (requestedAction && requestedAction.trim().length > 0) {
    return requestedAction.trim();
  }

  return `Suivi email: ${subject.trim().slice(0, 72)}`;
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

function toIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T09:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
