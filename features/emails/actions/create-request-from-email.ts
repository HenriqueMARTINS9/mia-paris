"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import {
  authorizeServerAction,
  authorizeServerPermissions,
} from "@/features/auth/server-authorization";
import {
  buildEmailQualificationDraft,
  buildRawSourceExcerpt,
  computeUrgencyScore,
  mergeEmailQualificationDraft,
} from "@/features/emails/lib/qualification";
import {
  notifyCriticalTask,
  notifyUrgentDeadline,
} from "@/features/notifications/lib/operational-notifications";
import type {
  CreateRequestFromEmailPayload,
  EmailMutationResult,
  EmailQualificationDraft,
  RequestAutoTaskRule,
} from "@/features/emails/types";
import { mapUiPriorityToDatabasePriority } from "@/features/requests/metadata";
import {
  isMissingSupabaseColumnError,
  isMissingSupabaseResourceError,
  supabaseRestInsert,
  supabaseRestPatch,
  supabaseRestSelectMaybeSingle,
  type SupabaseRestExecutionContext,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";
import { parseJsonObject, readObject, readString } from "@/lib/record-helpers";
import type { EmailRecord } from "@/types/crm";

const requestAutoTaskRules: RequestAutoTaskRule[] = [
  {
    requestType: "price_request",
    taskTitle: "Vérifier la demande de prix",
    taskType: "price_check",
  },
  {
    requestType: "deadline_request",
    taskTitle: "Vérifier le délai demandé",
    taskType: "deadline_check",
  },
  {
    requestType: "tds_request",
    taskTitle: "Préparer l’envoi de la fiche technique",
    taskType: "tds_send",
  },
  {
    requestType: "swatch_request",
    taskTitle: "Préparer les swatches demandés",
    taskType: "swatch_prepare",
  },
  {
    requestType: "trim_validation",
    taskTitle: "Suivre la validation trim",
    taskType: "validation_followup",
  },
  {
    requestType: "production_followup",
    taskTitle: "Passer en revue le suivi production",
    taskType: "internal_review",
  },
  {
    requestType: "logistics",
    taskTitle: "Contrôler les éléments logistiques",
    taskType: "logistics_check",
  },
  {
    requestType: "development",
    taskTitle: "Lancer une revue développement produit",
    taskType: "internal_review",
  },
  {
    requestType: "compliance",
    taskTitle: "Contrôler les points conformité",
    taskType: "internal_review",
  },
];

export async function createRequestFromEmailAction(
  input: CreateRequestFromEmailPayload,
  context?: AssistantMutationExecutionContext,
): Promise<EmailMutationResult> {
  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(
        ["emails.qualify", "requests.create"],
        context.authorizationOverride,
      )
    : await authorizeServerAction("emails.qualify");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "request_creation",
      message: authorization.message,
    };
  }

  if (!input.emailId) {
    return {
      ok: false,
      field: "request_creation",
      message: "Identifiant email manquant.",
    };
  }

  const emailResult = await loadEmailForQualification(
    input.emailId,
    context?.rest ?? undefined,
  );

  if (!("email" in emailResult)) {
    return emailResult;
  }

  const existingRequestResult = await findExistingRequestForEmail(
    emailResult.email,
    context?.rest ?? undefined,
  );

  if ("ok" in existingRequestResult && existingRequestResult.ok) {
    return existingRequestResult;
  }

  const qualification = normalizeQualificationDraft(emailResult.email, input.qualification);

  if (!qualification.requestType) {
    return {
      ok: false,
      field: "request_creation",
      message: "Sélectionne un type de demande avant de créer le dossier.",
    };
  }

  const requestResult = await insertRequestFromEmail(
    emailResult.email,
    qualification,
    context?.rest ?? undefined,
  );

  if (!requestResult.ok || !requestResult.requestId) {
    await createActivityLogEntry({
      action: "request_creation_failed_from_email",
      actorId: context?.actor?.actorUserId ?? authorization.actorId,
      actorType: normalizeActivityActorType(
        context?.actor?.actorType ?? authorization.actorType,
      ),
      description: requestResult.message,
      entityId: emailResult.email.id,
      entityType: "email",
      payload: {
        emailId: input.emailId,
        qualification,
      },
      requestId: null,
      source: context?.actor?.source ?? "ui",
      status: "failure",
    }, context?.rest ?? undefined);

    return requestResult;
  }

  const requestId = requestResult.requestId;
  const syncResult = await syncEmailAfterRequestCreation({
    email: emailResult.email,
    qualification,
    requestId,
  }, context?.rest ?? undefined);

  await createActivityLogEntry({
    action: "request_created_from_email",
    actorId: context?.actor?.actorUserId ?? authorization.actorId,
    actorType: normalizeActivityActorType(
      context?.actor?.actorType ?? authorization.actorType,
    ),
    description: `Demande créée depuis l’email ${input.emailId}.`,
    entityId: requestId,
    entityType: "request",
    payload: buildClassificationPayload(input.emailId, qualification, requestId),
    requestId,
    source: context?.actor?.source ?? "ui",
    status: "success",
  }, context?.rest ?? undefined);

  const automationSummary = await runEmailAutomationRules({
    actor: context?.actor ?? null,
    rest: context?.rest ?? null,
    email: emailResult.email,
    qualification,
    requestId,
  });

  revalidatePath("/emails");
  revalidatePath("/demandes");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/taches");
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
  revalidatePath("/aujourdhui");
  revalidatePath("/", "layout");

  const messages = ["Demande créée depuis l’email."];

  if (syncResult.ok) {
    messages.push("Email qualifié et marqué traité.");
  } else {
    messages.push("La synchronisation email reste partielle.");
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
    deadlineCreated: automationSummary.deadlineCreated,
    ok: true,
    field: "request_creation",
    message: messages.join(" "),
    requestCreated: true,
    requestId,
    taskCreated: automationSummary.taskCreated,
  };
}

export async function createRequestFromGmailEmailAction(
  input: CreateRequestFromEmailPayload,
): Promise<EmailMutationResult> {
  return createRequestFromEmailAction(input);
}

function normalizeQualificationDraft(
  email: EmailRecord,
  draft: EmailQualificationDraft,
) {
  const subject =
    readString(email, ["subject", "thread_subject", "title"]) ?? "Email entrant";
  const previewText =
    readString(email, ["preview_text", "body_preview", "snippet", "summary"]) ??
    readString(email, ["body_text", "text_content", "plain_text"]) ??
    subject;
  const bodyText =
    readString(email, ["body_text", "text_content", "plain_text", "body"]) ?? null;
  const fromName =
    readString(email, ["from_name", "sender_name", "contact_name"]) ??
    readString(email, ["sender", "from"]) ??
    null;
  const defaultDraft = buildEmailQualificationDraft({
    bodyText,
    fromName,
    previewText,
    subject,
  });

  return mergeEmailQualificationDraft(
    defaultDraft,
    {
      ...draft,
      assignedUserId: draft.assignedUserId || null,
      assignedUserName: draft.assignedUserName || null,
      requestedAction: draft.requestedAction?.trim() || defaultDraft.requestedAction,
      summary: draft.summary?.trim() || defaultDraft.summary,
      title: draft.title?.trim() || subject,
    },
  );
}

async function loadEmailForQualification(
  emailId: string,
  restContext?: SupabaseRestExecutionContext | null,
): Promise<
  | {
      ok: true;
      email: EmailRecord;
    }
  | EmailMutationResult
> {
  const result = await supabaseRestSelectMaybeSingle<EmailRecord>("emails", {
    id: `eq.${emailId}`,
    select: "*",
  }, restContext ?? undefined);

  if (result.error) {
    return {
      ok: false,
      field: "request_creation",
      message: `Impossible de charger l’email source: ${result.error}`,
    };
  }

  if (!result.data) {
    return {
      ok: false,
      field: "request_creation",
      message: "Email introuvable pour cette qualification.",
    };
  }

  return {
    ok: true,
    email: result.data,
  };
}

async function findExistingRequestForEmail(
  email: EmailRecord,
  restContext?: SupabaseRestExecutionContext | null,
): Promise<
  | {
      ok: true;
      field: "request_creation";
      message: string;
      requestId: string | null;
    }
  | {
      ok: false;
    }
> {
  const rawClassification =
    readObject(email, ["ai_classification", "classification_json", "classification"]) ??
    parseJsonObject(
      readString(email, ["ai_classification", "classification_json", "classification"]),
    );
  const requestIdFromEmail =
    readString(email, ["request_id", "linked_request_id", "crm_request_id"]) ??
    readString(rawClassification, ["linkedRequestId", "linked_request_id", "request_id"]) ??
    null;

  if (requestIdFromEmail) {
    return {
      ok: true,
      field: "request_creation",
      message: "Cet email est déjà rattaché à une demande existante.",
      requestId: requestIdFromEmail,
    };
  }

  const existingRequestResult = await supabaseRestSelectMaybeSingle<{ id: string }>(
    "requests",
    {
      source_email_id: `eq.${email.id}`,
      select: "id",
    },
    restContext ?? undefined,
  );

  if (existingRequestResult.error || !existingRequestResult.data?.id) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    field: "request_creation",
    message: "Une demande a déjà été créée depuis cet email.",
    requestId: existingRequestResult.data.id,
  };
}

async function insertRequestFromEmail(
  email: EmailRecord,
  qualification: EmailQualificationDraft,
  restContext?: SupabaseRestExecutionContext,
): Promise<EmailMutationResult> {
  const bodyText =
    readString(email, ["body_text", "text_content", "plain_text", "body"]) ?? null;
  const previewText =
    readString(email, ["preview_text", "body_preview", "snippet", "summary"]) ?? null;
  const payload: Record<string, unknown> = {
    ai_confidence: qualification.aiConfidence,
    assigned_user_id: qualification.assignedUserId,
    client_id: qualification.clientId,
    contact_id: qualification.contactId,
    due_at: toIsoDate(qualification.dueAt),
    model_id: qualification.modelId,
    priority: mapUiPriorityToDatabasePriority(qualification.priority),
    product_department_id: qualification.productDepartmentId,
    raw_source_excerpt: buildRawSourceExcerpt(bodyText, previewText),
    requested_action: qualification.requestedAction,
    request_type: qualification.requestType,
    requires_human_validation: qualification.requiresHumanValidation,
    source_email_id: email.id,
    source_type: "email",
    status: "qualified",
    summary: qualification.summary,
    title: qualification.title.trim(),
    updated_at: new Date().toISOString(),
    urgency_score: computeUrgencyScore(qualification.priority, qualification.dueAt),
  };

  const result = await insertWithMissingColumnFallback(
    "requests",
    payload,
    {
      select: "id,title",
    },
    restContext,
  );

  if (result.error) {
    return {
      ok: false,
      field: "request_creation",
      message: `Création de demande impossible: ${result.error}`,
    };
  }

  if (!result.data || result.data.length === 0) {
    return {
      ok: false,
      field: "request_creation",
      message:
        "Aucune demande n'a été créée. Vérifie les policies RLS et la structure de la table requests.",
    };
  }

  const requestId = result.data[0]?.id;

  return {
    ok: true,
    field: "request_creation",
    message: "Demande créée depuis l’email.",
    requestId: typeof requestId === "string" ? requestId : null,
  };
}

async function syncEmailAfterRequestCreation(input: {
  email: EmailRecord;
  qualification: EmailQualificationDraft;
  requestId: string;
}, restContext?: SupabaseRestExecutionContext) {
  const classificationPayload = buildClassificationPayload(
    input.email.id,
    input.qualification,
    input.requestId,
  );
  const payloads: Array<Record<string, unknown>> = [];

  for (const statusColumn of ["processing_status", "status", "triage_status"]) {
    for (const statusValue of ["classified", "processed", "qualified"]) {
      payloads.push({
        ai_classification: classificationPayload,
        ai_summary: input.qualification.summary,
        is_processed: true,
        [statusColumn]: statusValue,
        request_id: input.requestId,
      });
      payloads.push({
        classification_json: classificationPayload,
        ai_summary: input.qualification.summary,
        is_processed: true,
        [statusColumn]: statusValue,
        request_id: input.requestId,
      });
    }
  }

  for (const payload of payloads) {
    const result = await patchWithMissingColumnFallback(
      "emails",
      {
        ...payload,
        updated_at: new Date().toISOString(),
      },
      {
        id: `eq.${input.email.id}`,
        select: "id,request_id",
      },
      ["linked_request_id", "crm_request_id"],
      restContext,
    );

    if (!result.error) {
      return {
        ok: true,
      };
    }
  }

  return {
    ok: false,
  };
}

async function runEmailAutomationRules(input: {
  actor: AssistantMutationExecutionContext["actor"] | null;
  rest: SupabaseRestExecutionContext | null;
  email: EmailRecord;
  qualification: EmailQualificationDraft;
  requestId: string;
}) {
  const warnings: string[] = [];
  let taskCreated = false;
  let deadlineCreated = false;
  const automationRule = requestAutoTaskRules.find(
    (rule) => rule.requestType === input.qualification.requestType,
  );

  if (automationRule) {
    const taskResult = await createAutoTask({
      actor: input.actor,
      rest: input.rest,
      clientId: input.qualification.clientId,
      dueAt: input.qualification.dueAt,
      modelId: input.qualification.modelId,
      priority: input.qualification.priority,
      requestId: input.requestId,
      taskTitle: automationRule.taskTitle,
      taskType: automationRule.taskType,
      assignedUserId: input.qualification.assignedUserId,
    });

    taskCreated = taskResult.ok;

    if (!taskResult.ok) {
      warnings.push(taskResult.message);
    }
  }

  if (input.qualification.dueAt) {
    const deadlineResult = await createAutoDeadline({
      actor: input.actor,
      rest: input.rest,
      deadlineAt: input.qualification.dueAt,
      label: buildDeadlineLabel(
        input.qualification.requestedAction,
        input.qualification.title,
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

async function createAutoTask(input: {
  actor: AssistantMutationExecutionContext["actor"] | null;
  assignedUserId: string | null;
  clientId: string | null;
  dueAt: string | null;
  modelId: string | null;
  priority: EmailQualificationDraft["priority"];
  requestId: string;
  rest: SupabaseRestExecutionContext | null;
  taskTitle: string;
  taskType: string;
}) {
  const payload: Record<string, unknown> = {
    assigned_user_id: input.assignedUserId,
    client_id: input.clientId,
    created_by_type: "system",
    due_at: toIsoDate(input.dueAt),
    model_id: input.modelId,
    priority: mapUiPriorityToDatabasePriority(input.priority),
    request_id: input.requestId,
    status: "todo",
    task_type: input.taskType,
    title: input.taskTitle,
  };

  const result = await insertWithMissingColumnFallback(
    "tasks",
    payload,
    {
      select: "id,title",
    },
    input.rest ?? undefined,
  );

  if (result.error || !result.data || result.data.length === 0) {
    return {
      ok: false,
      message:
        result.error ??
        "Création de tâche automatique impossible sur la table tasks.",
    };
  }

  const taskId = result.data[0]?.id;

  await createActivityLogEntry({
    action: "auto_task_created",
    actorId: input.actor?.actorUserId ?? null,
    actorType: input.actor?.actorType ?? "system",
    description: `Tâche automatique créée (${input.taskType}).`,
    entityId: typeof taskId === "string" ? taskId : null,
    entityType: "task",
    payload: {
      taskType: input.taskType,
      title: input.taskTitle,
    },
    requestId: input.requestId,
    source: input.actor?.source ?? "system",
    status: "success",
  }, input.rest ?? undefined);

  if (input.priority === "critical") {
    await notifyCriticalTask({
      dueAt: toIsoDate(input.dueAt),
      requestId: input.requestId,
      title: input.taskTitle,
    });
  }

  return {
    ok: true,
    message: "Tâche automatique créée.",
  };
}

async function createAutoDeadline(input: {
  actor: AssistantMutationExecutionContext["actor"] | null;
  deadlineAt: string;
  label: string;
  priority: EmailQualificationDraft["priority"];
  requestId: string;
  rest: SupabaseRestExecutionContext | null;
}) {
  const payload: Record<string, unknown> = {
    deadline_at: toIsoDate(input.deadlineAt),
    label: input.label,
    priority: mapUiPriorityToDatabasePriority(input.priority),
    request_id: input.requestId,
    status: "open",
  };

  const result = await insertWithMissingColumnFallback(
    "deadlines",
    payload,
    {
      select: "id,label",
    },
    input.rest ?? undefined,
  );

  if (result.error || !result.data || result.data.length === 0) {
    return {
      ok: false,
      message:
        result.error ??
        "Création de deadline automatique impossible sur la table deadlines.",
    };
  }

  const deadlineId = result.data[0]?.id;

  await createActivityLogEntry({
    action: "auto_deadline_created",
    actorId: input.actor?.actorUserId ?? null,
    actorType: input.actor?.actorType ?? "system",
    description: "Deadline automatique créée depuis la qualification email.",
    entityId: typeof deadlineId === "string" ? deadlineId : null,
    entityType: "deadline",
    payload: {
      deadlineAt: input.deadlineAt,
      label: input.label,
    },
    requestId: input.requestId,
    source: input.actor?.source ?? "system",
    status: "success",
  }, input.rest ?? undefined);

  await notifyUrgentDeadline({
    deadlineAt: toIsoDate(input.deadlineAt),
    label: input.label,
    requestId: input.requestId,
  });

  return {
    ok: true,
    message: "Deadline automatique créée.",
  };
}

async function createActivityLogEntry(input: {
  action: string;
  actorId?: string | null;
  actorType?: "assistant" | "system" | "user";
  description: string;
  entityId: string | null;
  entityType: string;
  payload: Record<string, unknown>;
  requestId: string | null;
  source?: "assistant" | "system" | "ui";
  status?: "failure" | "success";
}, restContext?: SupabaseRestExecutionContext) {
  const payload: Record<string, unknown> = {
    action: input.action,
    action_source: input.source ?? "system",
    action_status: input.status ?? "success",
    action_type: input.action,
    actor_id: input.actorId ?? null,
    actor_type: input.actorType ?? (input.actorId ? "user" : "system"),
    created_at: new Date().toISOString(),
    description: input.description,
    entity_id: input.entityId,
    entity_type: input.entityType,
    metadata: input.payload,
    payload: input.payload,
    request_id: input.requestId,
    scope: "emails.create_request_from_email",
    source: input.source ?? "system",
    status: input.status ?? "success",
  };

  const result = await insertWithMissingColumnFallback(
    "activity_logs",
    payload,
    {
      select: "id",
    },
    restContext,
  );

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return {
      ok: false,
      message: result.error,
    };
  }

  return {
    ok: true,
    message: null,
  };
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

async function patchWithMissingColumnFallback(
  resource: string,
  payload: Record<string, unknown>,
  params: Record<string, string>,
  extraRequestColumns: string[] = [],
  restContext?: SupabaseRestExecutionContext,
) {
  const currentPayload = { ...payload };

  for (const column of extraRequestColumns) {
    currentPayload[column] = payload.request_id;
  }

  while (true) {
    const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
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

function buildClassificationPayload(
  emailId: string,
  qualification: EmailQualificationDraft,
  requestId: string,
) {
  return {
    emailId,
    linkedRequestId: requestId,
    source: "rules_v1",
    validatedAt: new Date().toISOString(),
    qualification,
  };
}

function buildDeadlineLabel(requestedAction: string | null, title: string) {
  if (requestedAction && requestedAction.trim().length > 0) {
    return requestedAction.trim().slice(0, 140);
  }

  return `Suivi demande: ${title.trim().slice(0, 120)}`;
}

function toIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T09:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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

function normalizeActivityActorType(value: string | null | undefined) {
  if (value === "assistant" || value === "system" || value === "user") {
    return value;
  }

  return "system" as const;
}
