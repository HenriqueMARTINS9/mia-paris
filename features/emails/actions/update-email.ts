"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import {
  authorizeServerAction,
  authorizeServerPermissions,
} from "@/features/auth/server-authorization";
import { mapUiEmailStatusToDatabaseValues } from "@/features/emails/metadata";
import type {
  EmailInboxBucket,
  EmailQualificationDraft,
  EmailMutationResult,
  EmailProcessingStatus,
} from "@/features/emails/types";
import {
  isMissingSupabaseColumnError,
  isMissingSupabaseResourceError,
  supabaseRestInsert,
  supabaseRestPatch,
  supabaseRestSelectMaybeSingle,
  type SupabaseRestExecutionContext,
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
  source?: "assistant" | "system" | "ui";
}

interface SetEmailInboxBucketInput {
  bucket: EmailInboxBucket;
  confidence?: number | null;
  emailId: string;
  reason?: string | null;
  source?: "assistant" | "system" | "ui";
}

interface SaveEmailQualificationInput {
  emailId: string;
  qualification: EmailQualificationDraft;
  source?: "assistant" | "system" | "ui";
}

interface AssignClientToEmailInput {
  clientId: string;
  clientName?: string | null;
  emailId: string;
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

export async function saveEmailQualificationAction(
  input: SaveEmailQualificationInput,
  context?: AssistantMutationExecutionContext,
): Promise<EmailMutationResult> {
  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(["emails.qualify"], context.authorizationOverride)
    : await authorizeServerAction("emails.qualify");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "qualification",
      message: authorization.message,
    };
  }

  if (!input.emailId) {
    return {
      ok: false,
      field: "qualification",
      message: "Identifiant email manquant.",
    };
  }

  const emailResult = await supabaseRestSelectMaybeSingle<EmailRecord>(
    "emails",
    {
      id: `eq.${input.emailId}`,
      select: "*",
    },
    context?.rest ?? undefined,
  );

  if (emailResult.error || !emailResult.data) {
    return {
      ok: false,
      field: "qualification",
      message: `Impossible de charger l’email à qualifier: ${emailResult.error ?? "email introuvable."}`,
    };
  }

  const qualificationPayload = buildEmailQualificationPayload(
    emailResult.data,
    input.emailId,
    input.qualification,
    input.source ?? "ui",
  );
  const payloads: Array<Record<string, unknown>> = [
    {
      ai_classification: qualificationPayload,
      ai_summary: input.qualification.summary,
      assigned_user_id: input.qualification.assignedUserId,
      classification_confidence: input.qualification.aiConfidence,
      client_id: input.qualification.clientId,
      contact_id: input.qualification.contactId,
      detected_client_name: input.qualification.clientName,
      model_id: input.qualification.modelId,
      product_department_id: input.qualification.productDepartmentId,
    },
    {
      classification_json: qualificationPayload,
      ai_summary: input.qualification.summary,
      assigned_user_id: input.qualification.assignedUserId,
      classification_confidence: input.qualification.aiConfidence,
      client_id: input.qualification.clientId,
      contact_id: input.qualification.contactId,
      detected_client_name: input.qualification.clientName,
      model_id: input.qualification.modelId,
      product_department_id: input.qualification.productDepartmentId,
    },
    {
      ai_classification: qualificationPayload,
      client_id: input.qualification.clientId,
      detected_client_name: input.qualification.clientName,
    },
    {
      classification_json: qualificationPayload,
      client_id: input.qualification.clientId,
      detected_client_name: input.qualification.clientName,
    },
  ];

  const result = await patchEmailWithPayloads(
    {
      emailId: input.emailId,
      field: "qualification",
      payloads,
      successMessage: input.qualification.clientName
        ? `Qualification enregistrée. Client assigné: ${input.qualification.clientName}.`
        : "Qualification enregistrée sur l’email.",
    },
    context,
  );

  if (result.ok) {
    await createActivityLogEntry({
      action: "email_qualification_saved",
      actorId: authorization.actorId,
      description: `Qualification enregistrée sur l’email ${input.emailId}.`,
      entityId: input.emailId,
      entityType: "email",
      payload: qualificationPayload,
      requestId: null,
      scope: "emails.qualification",
      source: input.source ?? "ui",
      status: "success",
    });

    return result;
  }

  await createActivityLogEntry({
    action: "email_qualification_save_failed",
    actorId: authorization.actorId,
    description: result.message,
    entityId: input.emailId,
    entityType: "email",
    payload: qualificationPayload,
    requestId: null,
    scope: "emails.qualification",
    source: input.source ?? "ui",
    status: "failure",
  });

  return result;
}

export async function assignClientToEmailAction(
  input: AssignClientToEmailInput,
  context?: AssistantMutationExecutionContext,
): Promise<EmailMutationResult> {
  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(["emails.qualify"], context.authorizationOverride)
    : await authorizeServerAction("emails.qualify");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "qualification",
      message: authorization.message,
    };
  }

  if (!input.emailId || !input.clientId) {
    return {
      ok: false,
      field: "qualification",
      message: "Les champs emailId et clientId sont requis.",
    };
  }

  const emailResult = await supabaseRestSelectMaybeSingle<EmailRecord>(
    "emails",
    {
      id: `eq.${input.emailId}`,
      select: "*",
    },
    context?.rest ?? undefined,
  );

  if (emailResult.error || !emailResult.data) {
    return {
      ok: false,
      field: "qualification",
      message: `Impossible de charger l’email: ${emailResult.error ?? "email introuvable."}`,
    };
  }

  const classificationPatch = {
    client_id: input.clientId,
    client_name: input.clientName ?? null,
    qualification_source: input.source ?? "assistant",
    qualifiedAt: new Date().toISOString(),
    source: input.source ?? "assistant",
  };
  const mergedClassification = mergeEmailClassificationPayload(
    emailResult.data,
    classificationPatch,
  );
  const payloads: Array<Record<string, unknown>> = [
    {
      ai_classification: mergedClassification,
      client_id: input.clientId,
      detected_client_name: input.clientName ?? null,
    },
    {
      classification_json: mergedClassification,
      client_id: input.clientId,
      detected_client_name: input.clientName ?? null,
    },
    {
      client_id: input.clientId,
      detected_client_name: input.clientName ?? null,
    },
  ];

  const result = await patchEmailWithPayloads(
    {
      emailId: input.emailId,
      field: "qualification",
      payloads,
      successMessage: input.clientName
        ? `Client assigné à l’email: ${input.clientName}.`
        : "Client assigné à l’email.",
    },
    context,
  );

  if (result.ok) {
    await createActivityLogEntry({
      action: "email_client_assigned",
      actorId: authorization.actorId,
      description: `Client assigné à l’email ${input.emailId}.`,
      entityId: input.emailId,
      entityType: "email",
      payload: classificationPatch,
      requestId: null,
      scope: "emails.client_assignment",
      source: input.source ?? "assistant",
      status: "success",
    });

    return result;
  }

  await createActivityLogEntry({
    action: "email_client_assignment_failed",
    actorId: authorization.actorId,
    description: result.message,
    entityId: input.emailId,
    entityType: "email",
    payload: classificationPatch,
    requestId: null,
    scope: "emails.client_assignment",
    source: input.source ?? "assistant",
    status: "failure",
  });

  return result;
}

export async function setEmailInboxBucketAction(
  input: SetEmailInboxBucketInput,
  context?: AssistantMutationExecutionContext,
): Promise<EmailMutationResult> {
  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(["emails.qualify"], context.authorizationOverride)
    : await authorizeServerAction("emails.qualify");

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
  }, context?.rest ?? undefined);

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
  }, context);

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
  context?: AssistantMutationExecutionContext,
): Promise<EmailMutationResult> {
  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(["emails.qualify"], context.authorizationOverride)
    : await authorizeServerAction("emails.qualify");

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
  }, context);

  if (result.ok) {
    await createActivityLogEntry({
      action: "email_attached_to_existing_request",
      actorId: context?.actor?.actorUserId ?? authorization.actorId,
      description: `Email ${input.emailId} rattaché à la demande ${input.requestId}.`,
      entityId: input.emailId,
      entityType: "email",
      payload: classificationPayload,
      requestId: input.requestId,
      source: input.source ?? context?.actor?.source ?? "ui",
      status: "success",
    }, context);
    revalidatePath(`/requests/${input.requestId}`);
    revalidatePath("/demandes");

    return {
      ...result,
      requestId: input.requestId,
    };
  }

  await createActivityLogEntry({
    action: "email_attach_to_request_failed",
    actorId: context?.actor?.actorUserId ?? authorization.actorId,
    description: result.message,
    entityId: input.emailId,
    entityType: "email",
    payload: classificationPayload,
    requestId: input.requestId,
    source: input.source ?? context?.actor?.source ?? "ui",
    status: "failure",
  }, context);

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
  scope?: string;
  source?: "assistant" | "system" | "ui";
  status?: "failure" | "success";
}, context?: AssistantMutationExecutionContext) {
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
    scope: input.scope ?? "emails.link_to_request",
    source: input.source ?? "system",
    status: input.status ?? "success",
  };

  const result = await insertWithMissingColumnFallback(
    "activity_logs",
    payload,
    {
      select: "id",
    },
    context?.rest ?? undefined,
  );

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
}, context?: AssistantMutationExecutionContext): Promise<EmailMutationResult> {
  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(["emails.qualify"], context.authorizationOverride)
    : await authorizeServerAction("emails.qualify");

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
      context?.rest ?? undefined,
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
  restContext?: SupabaseRestExecutionContext | null,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      params,
      restContext ?? undefined,
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
  restContext?: SupabaseRestExecutionContext,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      params,
      restContext,
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

function buildEmailQualificationPayload(
  email: EmailRecord,
  emailId: string,
  qualification: EmailQualificationDraft,
  source: "assistant" | "system" | "ui",
) {
  return mergeEmailClassificationPayload(email, {
    assigned_user_id: qualification.assignedUserId,
    assigned_user_name: qualification.assignedUserName,
    classificationEngine: "qualification_panel_v1",
    client_id: qualification.clientId,
    client_name: qualification.clientName,
    confidence: qualification.aiConfidence,
    contact_id: qualification.contactId,
    contact_name: qualification.contactName,
    due_at: qualification.dueAt,
    emailId,
    model_id: qualification.modelId,
    model_name: qualification.modelName,
    priority: qualification.priority,
    product_department: qualification.productDepartmentName,
    product_department_id: qualification.productDepartmentId,
    qualification,
    qualifiedAt: new Date().toISOString(),
    request_type: qualification.requestType,
    requested_action: qualification.requestedAction,
    requires_human_validation: qualification.requiresHumanValidation,
    source,
    summary: qualification.summary,
    title: qualification.title,
  });
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
