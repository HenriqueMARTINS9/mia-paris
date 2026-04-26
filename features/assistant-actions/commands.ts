import "server-only";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import {
  authorizeServerPermissions,
  type ServerPermissionOverride,
} from "@/features/auth/server-authorization";
import { assistantActionCatalog } from "@/features/assistant-actions/catalog";
import {
  getAssistantServiceDeadlines,
  getAssistantServiceEmails,
  getAssistantServiceProductions,
  getAssistantServiceRequestOverviews,
} from "@/features/assistant-actions/service-queries";
import type {
  AssistantActionResult,
  AssistantAddProductionNoteInput,
  AssistantAddRequestNoteInput,
  AssistantAssignClientToEmailInput,
  AssistantAttachEmailToRequestInput,
  AssistantCreateClientInput,
  AssistantCreateDeadlineInput,
  AssistantCreateRequestInput,
  AssistantCreateTaskInput,
  AssistantHistorySearchResult,
  AssistantPrepareReplyDraftInput,
  AssistantPrepareReplyDraftResult,
  AssistantProductionList,
  AssistantRequestBacklogList,
  AssistantRunEmailOpsCycleInput,
  AssistantRunGmailSyncInput,
  AssistantSetEmailInboxBucketInput,
  AssistantUnprocessedEmailList,
  AssistantUpdateRequestResult,
  AssistantUpdateRequestInput,
  AssistantUpdateTaskResult,
  AssistantUpdateTaskInput,
  AssistantWriteDailySummaryInput,
  AssistantUrgencyList,
  AssistantWorkspaceData,
} from "@/features/assistant-actions/types";
import { createClientAction } from "@/features/clients/actions/create-client";
import { writeDailySummaryAction } from "@/features/daily-summaries/actions/write-daily-summary";
import {
  createAssistantActionFailure,
  createAssistantActionSuccess,
  normalizeAssistantSource,
  validateLookupTerm,
  validateRequiredText,
} from "@/features/assistant-actions/validators";
import { getDeadlinesPageData } from "@/features/deadlines/queries";
import { runAssistantEmailOpsCycle } from "@/features/emails/lib/assistant-email-ops";
import { syncLatestGmailMessagesForActor } from "@/features/emails/lib/gmail-sync";
import {
  assignClientToEmailAction,
  attachEmailToRequestAction,
  setEmailInboxBucketAction,
} from "@/features/emails/actions/update-email";
import { getEmailsPageData } from "@/features/emails/queries";
import { getProductionsPageData } from "@/features/productions/queries";
import { updateProductionNotesAction } from "@/features/productions/actions/update-production";
import { buildReplyDraft } from "@/features/replies/lib/build-reply-draft";
import {
  appendRequestNoteAction,
  assignRequestAction,
  updateRequestPriorityAction,
  updateRequestStatusAction,
} from "@/features/requests/actions/update-request";
import { createRequestAction } from "@/features/requests/actions/create-request";
import { getRequestsOverviewPageData } from "@/features/requests/queries";
import { createTaskAction } from "@/features/tasks/actions/create-request-task";
import {
  assignTaskAction,
  updateTaskDueDateAction,
  updateTaskPriorityAction,
  updateTaskStatusAction,
} from "@/features/tasks/actions/update-task";
import { getTodayOverviewData } from "@/features/today/queries";
import { createDeadlineAction } from "@/features/deadlines/actions/create-deadline";
import { logOperationalError, recordAuditEvent } from "@/lib/action-runtime";
import { supabaseRestSelectMaybeSingle } from "@/lib/supabase/rest";
import type { ClientRecord } from "@/types/crm";

interface AssistantCommandExecutionOptions {
  authorizationOverride?: ServerPermissionOverride | null;
  mutationContext?: AssistantMutationExecutionContext | null;
}

export async function getTodayUrgencies(
  options?: AssistantCommandExecutionOptions,
): Promise<
  AssistantActionResult<AssistantUrgencyList>
> {
  const authorization = await authorizeServerPermissions(
    ["assistant.read"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const deadlines = options?.authorizationOverride
    ? await getAssistantServiceDeadlines()
    : (await getDeadlinesPageData()).deadlines;
  const now = Date.now();
  const next24Hours = now + 24 * 60 * 60 * 1000;
  const urgencies24h = deadlines
    .filter((deadline) => {
      if (!deadline.deadlineAt || deadline.status === "done") {
        return false;
      }

      const time = new Date(deadline.deadlineAt).getTime();

      return Number.isFinite(time) && (time <= next24Hours || deadline.isOverdue);
    })
    .sort((left, right) => {
      const leftTime = left.deadlineAt
        ? new Date(left.deadlineAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.deadlineAt
        ? new Date(right.deadlineAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      return leftTime - rightTime;
    });

  return createAssistantActionSuccess(
    urgencies24h,
    `${urgencies24h.length} urgence(s) remontée(s) pour aujourd’hui.`,
  );
}

export async function getUnprocessedEmails(
  options?: AssistantCommandExecutionOptions,
): Promise<
  AssistantActionResult<AssistantUnprocessedEmailList>
> {
  const authorization = await authorizeServerPermissions(
    ["assistant.read"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const emails = (
    options?.authorizationOverride
      ? await getAssistantServiceEmails()
      : (await getEmailsPageData()).emails
  ).filter(
    (email) =>
      email.status !== "processed" && email.triage.bucket !== "promotional",
  );

  return createAssistantActionSuccess(
    emails,
    `${emails.length} email(s) non traité(s) ou à revoir.`,
  );
}

export async function setEmailInboxBucket(
  input: AssistantSetEmailInboxBucketInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof setEmailInboxBucketAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "emails.qualify"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const result = await setEmailInboxBucketAction({
    bucket: input.bucket,
    confidence: input.confidence ?? null,
    emailId: input.emailId,
    reason: input.reason ?? null,
    source: input.source ?? "assistant",
  }, {
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    rest: options?.mutationContext?.rest ?? null,
  });

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_set_email_inbox_bucket",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: input.emailId,
    entityType: "email",
    payload: {
      bucket: input.bucket,
      confidence: input.confidence ?? null,
      emailId: input.emailId,
      reasonPreview: input.reason?.slice(0, 220) ?? null,
      source: normalizeAssistantSource(input.source),
    },
    requestId: null,
    scope: "assistant_actions.set_email_inbox_bucket",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function writeDailySummary(
  input: AssistantWriteDailySummaryInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof writeDailySummaryAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const result = await writeDailySummaryAction(
    {
      ...input,
      source: input.source ?? "assistant",
    },
    {
      actor: options?.mutationContext?.actor ?? null,
      authorizationOverride:
        options?.mutationContext?.authorizationOverride ??
        options?.authorizationOverride ??
        null,
      rest: options?.mutationContext?.rest ?? null,
    },
  );

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_write_daily_summary",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: result.summaryId ?? result.summaryDate,
    entityType: "daily_summary",
    payload: {
      clientCount: result.clientCount,
      generatedAt: result.generatedAt,
      source: normalizeAssistantSource(input.source),
      summaryDate: result.summaryDate,
      summaryTime: result.summaryTime,
      title: input.title ?? null,
    },
    requestId: null,
    scope: "assistant_actions.write_daily_summary",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function createClient(
  input: AssistantCreateClientInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof createClientAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "clients.create"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const nameValidation = validateRequiredText(input.name, "Le nom de client", 2);

  if (!nameValidation.ok) {
    return createAssistantActionFailure("validation_error", nameValidation.message);
  }

  const result = await createClientAction(
    {
      code: input.code ?? null,
      name: nameValidation.value,
    },
    {
      actor: options?.mutationContext?.actor ?? null,
      authorizationOverride:
        options?.mutationContext?.authorizationOverride ??
        options?.authorizationOverride ??
        null,
      rest: options?.mutationContext?.rest ?? null,
    },
  );

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_create_client",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: result.clientId,
    entityType: "client",
    payload: {
      code: input.code ?? null,
      name: nameValidation.value,
      source: normalizeAssistantSource(input.source),
    },
    requestId: null,
    scope: "assistant_actions.create_client",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function assignClientToEmail(
  input: AssistantAssignClientToEmailInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof assignClientToEmailAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "emails.qualify"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const clientResult = await supabaseRestSelectMaybeSingle<ClientRecord>(
    "clients",
    {
      id: `eq.${input.clientId}`,
      select: "id,name,code",
    },
    options?.mutationContext?.rest ?? undefined,
  );

  if (clientResult.error || !clientResult.data?.id) {
    return createAssistantActionFailure(
      "not_found",
      `Client introuvable pour assignation: ${clientResult.error ?? "client absent."}`,
    );
  }

  const clientName =
    typeof clientResult.data.name === "string" && clientResult.data.name.trim().length > 0
      ? clientResult.data.name.trim()
      : null;

  const result = await assignClientToEmailAction(
    {
      clientId: input.clientId,
      clientName,
      emailId: input.emailId,
      source: input.source ?? "assistant",
    },
    {
      actor: options?.mutationContext?.actor ?? null,
      authorizationOverride:
        options?.mutationContext?.authorizationOverride ??
        options?.authorizationOverride ??
        null,
      rest: options?.mutationContext?.rest ?? null,
    },
  );

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_assign_client_to_email",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: input.emailId,
    entityType: "email",
    payload: {
      clientId: input.clientId,
      clientName,
      emailId: input.emailId,
      source: normalizeAssistantSource(input.source),
    },
    requestId: null,
    scope: "assistant_actions.assign_client_to_email",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function attachEmailToRequest(
  input: AssistantAttachEmailToRequestInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof attachEmailToRequestAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "emails.qualify"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const result = await attachEmailToRequestAction(
    {
      emailId: input.emailId,
      requestId: input.requestId,
      source: input.source ?? "assistant",
    },
    {
      actor: options?.mutationContext?.actor ?? null,
      authorizationOverride:
        options?.mutationContext?.authorizationOverride ??
        options?.authorizationOverride ??
        null,
      rest: options?.mutationContext?.rest ?? null,
    },
  );

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_attach_email_to_request",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: input.emailId,
    entityType: "email",
    payload: {
      emailId: input.emailId,
      requestId: input.requestId,
      source: normalizeAssistantSource(input.source),
    },
    requestId: input.requestId,
    scope: "assistant_actions.attach_email_to_request",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function runGmailSync(
  input: AssistantRunGmailSyncInput,
  options?: AssistantCommandExecutionOptions,
) {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "emails.sync"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const requestedLimit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(100, Math.floor(input.limit)))
      : 50;
  const result = await syncLatestGmailMessagesForActor(requestedLimit, {
    actorUserId:
      options?.mutationContext?.actor?.actorUserId ??
      authorization.actorId ??
      null,
  });

  await recordAuditEvent({
    action: "assistant_run_gmail_sync",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: result.connectedInboxEmail,
    entityType: "gmail_sync",
    payload: {
      connectedInboxEmail: result.connectedInboxEmail,
      errorCount: result.errorCount ?? 0,
      ignoredMessages: result.ignoredMessages,
      importedMessages: result.importedMessages,
      importedThreads: result.importedThreads,
      limit: requestedLimit,
      queryUsed: result.queryUsed ?? null,
      source: normalizeAssistantSource(input.source),
      syncMode: result.syncMode ?? null,
      syncedAt: result.syncedAt ?? null,
    },
    requestId: null,
    scope: "assistant_actions.run_gmail_sync",
    source: normalizeAssistantSource(input.source),
    status: result.ok ? "success" : "failure",
  });

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  return createAssistantActionSuccess(result, result.message);
}

export async function runEmailOpsCycle(
  input: AssistantRunEmailOpsCycleInput,
  options?: AssistantCommandExecutionOptions,
) {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "emails.sync", "emails.qualify"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const cycle = await runAssistantEmailOpsCycle({
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    attachToExistingRequests: input.attachToExistingRequests ?? null,
    createRequests: input.createRequests ?? null,
    limit: input.limit ?? null,
    rest: options?.mutationContext?.rest ?? null,
    syncLimit: input.syncLimit ?? null,
    updateRequests: input.updateRequests ?? null,
    updateTasks: input.updateTasks ?? null,
    writeSummary: input.writeSummary ?? null,
  });

  await recordAuditEvent({
    action: "assistant_run_email_ops_cycle",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: cycle.message,
    entityId: cycle.result.sync.connectedInboxEmail,
    entityType: "email_ops",
    payload: {
      clientClassifiedCount: cycle.result.clientClassifiedCount,
      attachToExistingRequests: input.attachToExistingRequests ?? null,
      crmEnrichedCount: cycle.result.crmEnrichedCount,
      createRequests: input.createRequests ?? null,
      deadlineCreatedCount: cycle.result.deadlineCreatedCount,
      errorCount: cycle.result.errorCount,
      importantCount: cycle.result.importantCount,
      limit: input.limit ?? null,
      preview: cycle.result.items.slice(0, 5),
      processedCount: cycle.result.processedCount,
      promotionalCount: cycle.result.promotionalCount,
      requestAttachedCount: cycle.result.requestAttachedCount,
      requestCreatedCount: cycle.result.requestCreatedCount,
      requestUpdatedCount: cycle.result.requestUpdatedCount,
      skippedCount: cycle.result.skippedCount,
      source: normalizeAssistantSource(input.source),
      summaryWrittenCount: cycle.result.summaryWrittenCount,
      syncLimit: input.syncLimit ?? null,
      syncMessage: cycle.result.sync.message,
      taskCreatedCount: cycle.result.taskCreatedCount,
      taskUpdatedCount: cycle.result.taskUpdatedCount,
      toReviewCount: cycle.result.toReviewCount,
      updateRequests: input.updateRequests ?? null,
      updateTasks: input.updateTasks ?? null,
      writeSummary: input.writeSummary ?? null,
    },
    requestId: null,
    scope: "assistant_actions.run_email_ops_cycle",
    source: normalizeAssistantSource(input.source),
    status: cycle.ok ? "success" : "failure",
  });

  if (!cycle.ok) {
    return createAssistantActionFailure("error", cycle.message);
  }

  revalidatePath("/emails");
  revalidatePath("/dashboard");
  revalidatePath("/aujourdhui");
  revalidatePath("/", "layout");

  return createAssistantActionSuccess(cycle.result, cycle.message);
}

export async function getRequestsWithoutAssignee(
  options?: AssistantCommandExecutionOptions,
): Promise<
  AssistantActionResult<AssistantRequestBacklogList>
> {
  const authorization = await authorizeServerPermissions(
    ["assistant.read"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const requests = (
    options?.authorizationOverride
      ? await getAssistantServiceRequestOverviews()
      : (await getRequestsOverviewPageData()).requests
  ).filter(
    (request) => request.assignedUserId === null || request.owner === "Non assigné",
  );

  return createAssistantActionSuccess(
    requests,
    `${requests.length} demande(s) sans pilote assigné.`,
  );
}

export async function getBlockedProductions(
  options?: AssistantCommandExecutionOptions,
): Promise<
  AssistantActionResult<AssistantProductionList>
> {
  const authorization = await authorizeServerPermissions(
    ["assistant.read"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const productions = (
    options?.authorizationOverride
      ? await getAssistantServiceProductions()
      : (await getProductionsPageData()).productions
  ).filter((production) => production.isBlocked);

  return createAssistantActionSuccess(
    productions,
    `${productions.length} production(s) bloquée(s).`,
  );
}

export async function getHighRiskProductions(
  options?: AssistantCommandExecutionOptions,
): Promise<
  AssistantActionResult<AssistantProductionList>
> {
  const authorization = await authorizeServerPermissions(
    ["assistant.read"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const productions = (
    options?.authorizationOverride
      ? await getAssistantServiceProductions()
      : (await getProductionsPageData()).productions
  ).filter(
    (production) => production.risk === "critical" || production.risk === "high",
  );

  return createAssistantActionSuccess(
    productions,
    `${productions.length} production(s) à risque élevé.`,
  );
}

export async function createTask(
  input: AssistantCreateTaskInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof createTaskAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "tasks.create"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const titleValidation = validateRequiredText(input.title, "Le titre de tâche", 3);

  if (!titleValidation.ok) {
    return createAssistantActionFailure("validation_error", titleValidation.message);
  }

  const taskTypeValidation = validateRequiredText(input.taskType, "Le type de tâche", 2);

  if (!taskTypeValidation.ok) {
    return createAssistantActionFailure("validation_error", taskTypeValidation.message);
  }

  const result = await createTaskAction({
    assignedUserId: input.assignedUserId ?? null,
    dueAt: input.dueAt ?? null,
    priority: input.priority,
    requestId: input.requestId ?? null,
    taskType: taskTypeValidation.value,
    title: titleValidation.value,
  }, {
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    rest: options?.mutationContext?.rest ?? null,
  });

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_create_task",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: input.requestId ?? null,
    entityType: "task",
    payload: {
      assignedUserId: input.assignedUserId ?? null,
      dueAt: input.dueAt ?? null,
      priority: input.priority,
      requestId: input.requestId ?? null,
      source: normalizeAssistantSource(input.source),
      taskType: taskTypeValidation.value,
      title: titleValidation.value,
    },
    requestId: input.requestId ?? null,
    scope: "assistant_actions.create_task",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function updateTask(
  input: AssistantUpdateTaskInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<AssistantUpdateTaskResult>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "tasks.update"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const updatedFields: string[] = [];
  const mutationContext = {
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    rest: options?.mutationContext?.rest ?? null,
  };

  if (!input.taskId) {
    return createAssistantActionFailure(
      "validation_error",
      "Le champ taskId est requis pour updateTask.",
    );
  }

  if (input.status) {
    const result = await updateTaskStatusAction(
      {
        requestId: input.requestId ?? null,
        status: input.status,
        taskId: input.taskId,
      },
      mutationContext,
    );

    if (!result.ok) {
      return createAssistantActionFailure("error", result.message);
    }

    updatedFields.push("status");
  }

  if (input.priority) {
    const result = await updateTaskPriorityAction(
      {
        priority: input.priority,
        requestId: input.requestId ?? null,
        taskId: input.taskId,
      },
      mutationContext,
    );

    if (!result.ok) {
      return createAssistantActionFailure("error", result.message);
    }

    updatedFields.push("priority");
  }

  if (input.assignedUserId) {
    const result = await assignTaskAction(
      {
        assignedUserId: input.assignedUserId,
        requestId: input.requestId ?? null,
        taskId: input.taskId,
      },
      mutationContext,
    );

    if (!result.ok) {
      return createAssistantActionFailure("error", result.message);
    }

    updatedFields.push("assignedUserId");
  }

  const hasDueAt = Object.prototype.hasOwnProperty.call(input, "dueAt");

  if (hasDueAt) {
    const result = await updateTaskDueDateAction(
      {
        dueAt: input.dueAt ?? null,
        requestId: input.requestId ?? null,
        taskId: input.taskId,
      },
      mutationContext,
    );

    if (!result.ok) {
      return createAssistantActionFailure("error", result.message);
    }

    updatedFields.push("dueAt");
  }

  if (updatedFields.length === 0) {
    return createAssistantActionFailure(
      "validation_error",
      "Aucun champ modifiable fourni pour updateTask.",
    );
  }

  const message = `Tâche mise à jour: ${updatedFields.join(", ")}.`;

  await recordAuditEvent({
    action: "assistant_update_task",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: message,
    entityId: input.taskId,
    entityType: "task",
    payload: {
      assignedUserId: input.assignedUserId ?? null,
      dueAt: hasDueAt ? input.dueAt ?? null : undefined,
      priority: input.priority ?? null,
      requestId: input.requestId ?? null,
      source: normalizeAssistantSource(input.source),
      status: input.status ?? null,
      taskId: input.taskId,
      updatedFields,
    },
    requestId: input.requestId ?? null,
    scope: "assistant_actions.update_task",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(
    {
      field: "task",
      message,
      ok: true,
      updatedFields,
    },
    message,
  );
}

export async function updateRequest(
  input: AssistantUpdateRequestInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<AssistantUpdateRequestResult>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "requests.update"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  if (!input.requestId) {
    return createAssistantActionFailure(
      "validation_error",
      "Le champ requestId est requis pour updateRequest.",
    );
  }

  if (input.status && !input.requestType) {
    return createAssistantActionFailure(
      "validation_error",
      "Le champ requestType est requis quand updateRequest modifie le statut.",
    );
  }

  const updatedFields: string[] = [];
  const mutationContext = {
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    rest: options?.mutationContext?.rest ?? null,
  };

  if (input.status) {
    const result = await updateRequestStatusAction(
      {
        requestId: input.requestId,
        requestType: input.requestType ?? "",
        status: input.status,
      },
      mutationContext,
    );

    if (!result.ok) {
      return createAssistantActionFailure("error", result.message);
    }

    updatedFields.push("status");
  }

  if (input.priority) {
    const result = await updateRequestPriorityAction(
      {
        priority: input.priority,
        requestId: input.requestId,
      },
      mutationContext,
    );

    if (!result.ok) {
      return createAssistantActionFailure("error", result.message);
    }

    updatedFields.push("priority");
  }

  if (input.assignedUserId) {
    const result = await assignRequestAction(
      {
        assignedUserId: input.assignedUserId,
        requestId: input.requestId,
      },
      mutationContext,
    );

    if (!result.ok) {
      return createAssistantActionFailure("error", result.message);
    }

    updatedFields.push("assignedUserId");
  }

  if (updatedFields.length === 0) {
    return createAssistantActionFailure(
      "validation_error",
      "Aucun champ modifiable fourni pour updateRequest.",
    );
  }

  const message = `Demande mise à jour: ${updatedFields.join(", ")}.`;

  await recordAuditEvent({
    action: "assistant_update_request",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: message,
    entityId: input.requestId,
    entityType: "request",
    payload: {
      assignedUserId: input.assignedUserId ?? null,
      priority: input.priority ?? null,
      requestId: input.requestId,
      requestType: input.requestType ?? null,
      source: normalizeAssistantSource(input.source),
      status: input.status ?? null,
      updatedFields,
    },
    requestId: input.requestId,
    scope: "assistant_actions.update_request",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(
    {
      field: "status",
      message,
      ok: true,
      updatedFields,
    },
    message,
  );
}

export async function createRequest(
  input: AssistantCreateRequestInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof createRequestAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "requests.create"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const titleValidation = validateRequiredText(input.title, "Le titre de demande", 3);

  if (!titleValidation.ok) {
    return createAssistantActionFailure("validation_error", titleValidation.message);
  }

  const requestTypeValidation = validateRequiredText(
    input.requestType,
    "Le type de demande",
    2,
  );

  if (!requestTypeValidation.ok) {
    return createAssistantActionFailure("validation_error", requestTypeValidation.message);
  }

  const result = await createRequestAction(
    {
      assignedUserId: input.assignedUserId ?? null,
      clientId: input.clientId ?? null,
      contactId: input.contactId ?? null,
      dueAt: input.dueAt ?? null,
      modelId: input.modelId ?? null,
      priority: input.priority,
      productDepartmentId: input.productDepartmentId ?? null,
      requestType: requestTypeValidation.value,
      requestedAction: input.requestedAction ?? null,
      status: input.status ?? "qualification",
      summary: input.summary ?? null,
      title: titleValidation.value,
    },
    {
      actor: options?.mutationContext?.actor ?? null,
      authorizationOverride:
        options?.mutationContext?.authorizationOverride ??
        options?.authorizationOverride ??
        null,
      rest: options?.mutationContext?.rest ?? null,
    },
  );

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  let attachedEmailCount = 0;
  let failedEmailAttachCount = 0;

  if (result.requestId && Array.isArray(input.emailIds)) {
    const uniqueEmailIds = [...new Set(input.emailIds.filter(Boolean))].slice(0, 20);

    for (const emailId of uniqueEmailIds) {
      const attachResult = await attachEmailToRequestAction(
        {
          emailId,
          requestId: result.requestId,
          source: input.source ?? "assistant",
        },
        {
          actor: options?.mutationContext?.actor ?? null,
          authorizationOverride:
            options?.mutationContext?.authorizationOverride ??
            options?.authorizationOverride ??
            null,
          rest: options?.mutationContext?.rest ?? null,
        },
      );

      if (attachResult.ok) {
        attachedEmailCount += 1;
      } else {
        failedEmailAttachCount += 1;
      }
    }
  }

  await recordAuditEvent({
    action: "assistant_create_request",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: result.requestId ?? null,
    entityType: "request",
    payload: {
      assignedUserId: input.assignedUserId ?? null,
      clientId: input.clientId ?? null,
      contactId: input.contactId ?? null,
      dueAt: input.dueAt ?? null,
      emailIds: input.emailIds ?? null,
      failedEmailAttachCount,
      modelId: input.modelId ?? null,
      priority: input.priority,
      productDepartmentId: input.productDepartmentId ?? null,
      requestType: requestTypeValidation.value,
      requestedAction: input.requestedAction ?? null,
      source: normalizeAssistantSource(input.source),
      status: input.status ?? "qualification",
      summaryPreview: input.summary?.slice(0, 220) ?? null,
      title: titleValidation.value,
      attachedEmailCount,
    },
    requestId: result.requestId ?? null,
    scope: "assistant_actions.create_request",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(
    {
      ...result,
      attachedEmailCount,
      failedEmailAttachCount,
    },
    result.message,
  );
}

export async function createDeadline(
  input: AssistantCreateDeadlineInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof createDeadlineAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.manage", "deadlines.create"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const labelValidation = validateRequiredText(input.label, "Le libellé de deadline", 3);

  if (!labelValidation.ok) {
    return createAssistantActionFailure("validation_error", labelValidation.message);
  }

  const dateValidation = validateRequiredText(input.deadlineAt, "La date de deadline");

  if (!dateValidation.ok) {
    return createAssistantActionFailure("validation_error", dateValidation.message);
  }

  const result = await createDeadlineAction({
    deadlineAt: dateValidation.value,
    label: labelValidation.value,
    priority: input.priority,
    requestId: input.requestId ?? null,
  }, {
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    rest: options?.mutationContext?.rest ?? null,
  });

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_create_deadline",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: input.requestId ?? null,
    entityType: "deadline",
    payload: {
      deadlineAt: dateValidation.value,
      label: labelValidation.value,
      priority: input.priority,
      requestId: input.requestId ?? null,
      source: normalizeAssistantSource(input.source),
    },
    requestId: input.requestId ?? null,
    scope: "assistant_actions.create_deadline",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function addNoteToRequest(
  input: AssistantAddRequestNoteInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof appendRequestNoteAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "requests.update"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const noteValidation = validateRequiredText(input.note, "La note métier", 2);

  if (!noteValidation.ok) {
    return createAssistantActionFailure("validation_error", noteValidation.message);
  }

  const noteField = await detectRequestNoteField(
    input.requestId,
    options?.mutationContext?.rest ?? null,
  );

  if (!noteField) {
    return createAssistantActionFailure(
      "not_found",
      "Aucun champ de note compatible n’a été détecté sur la table requests.",
    );
  }

  const result = await appendRequestNoteAction({
    note: noteValidation.value,
    noteField,
    requestId: input.requestId,
  }, {
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    rest: options?.mutationContext?.rest ?? null,
  });

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_add_note_to_request",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: input.requestId,
    entityType: "request",
    payload: {
      notePreview: noteValidation.value.slice(0, 220),
      source: normalizeAssistantSource(input.source),
    },
    requestId: input.requestId,
    scope: "assistant_actions.add_note_to_request",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function addNoteToProduction(
  input: AssistantAddProductionNoteInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<Awaited<ReturnType<typeof updateProductionNotesAction>>>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "productions.update"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const notes = input.notes?.trim() ?? null;

  if (!notes) {
    return createAssistantActionFailure(
      "validation_error",
      "Ajoute une note opérationnelle avant de lancer l’action.",
    );
  }

  const result = await updateProductionNotesAction({
    notes,
    productionId: input.productionId,
  }, {
    actor: options?.mutationContext?.actor ?? null,
    authorizationOverride:
      options?.mutationContext?.authorizationOverride ??
      options?.authorizationOverride ??
      null,
    rest: options?.mutationContext?.rest ?? null,
  });

  if (!result.ok) {
    return createAssistantActionFailure("error", result.message);
  }

  await recordAuditEvent({
    action: "assistant_add_note_to_production",
    actorId: authorization.actorId,
    actorType: authorization.actorType,
    description: result.message,
    entityId: input.productionId,
    entityType: "production",
    payload: {
      notePreview: notes.slice(0, 220),
      source: normalizeAssistantSource(input.source),
    },
    requestId: null,
    scope: "assistant_actions.add_note_to_production",
    source: normalizeAssistantSource(input.source),
    status: "success",
  });

  return createAssistantActionSuccess(result, result.message);
}

export async function prepareReplyDraft(
  input: AssistantPrepareReplyDraftInput,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<AssistantPrepareReplyDraftResult>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe", "reply.generate"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const subjectValidation = validateRequiredText(
    input.context.subject,
    "Le sujet de contexte",
    2,
  );

  if (!subjectValidation.ok) {
    return createAssistantActionFailure("validation_error", subjectValidation.message);
  }

  try {
    const draft = buildReplyDraft({
      ...input.context,
      replyType: input.replyType,
    });

    await recordAuditEvent({
      action: "assistant_prepare_reply_draft",
      actorId: authorization.actorId,
      actorType: authorization.actorType,
      description: "Brouillon assistant préparé.",
      entityId: `${input.context.sourceType}:${input.context.sourceId}`,
      entityType: "reply_draft",
      payload: {
        replyType: input.replyType,
        source: normalizeAssistantSource(input.source),
        sourceId: input.context.sourceId,
        sourceType: input.context.sourceType,
        subject: draft.subject,
      },
      requestId: input.context.requestId,
      scope: "assistant_actions.prepare_reply",
      source: normalizeAssistantSource(input.source),
      status: "success",
    });

    return createAssistantActionSuccess(
      {
        draft,
        message: "Brouillon préparé.",
        ok: true,
      },
      "Brouillon assistant préparé.",
    );
  } catch (error) {
    await logOperationalError({
      actorId: authorization.actorId,
      entityId: `${input.context.sourceType}:${input.context.sourceId}`,
      entityType: "reply_draft",
      error,
      message: "Préparation du brouillon assistant impossible.",
      payload: {
        replyType: input.replyType,
      },
      requestId: input.context.requestId,
      scope: "assistant_actions.prepare_reply",
      source: normalizeAssistantSource(input.source),
    });

    return createAssistantActionFailure(
      "error",
      error instanceof Error ? error.message : "Préparation impossible.",
    );
  }
}

export async function searchClientHistory(
  clientName: string,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<AssistantHistorySearchResult>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.read"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const term = validateLookupTerm(clientName, "Le nom client");

  if (!term.ok) {
    return createAssistantActionFailure("validation_error", term.message);
  }

  const [requestRows, emailRows, productionRows] = await Promise.all([
    options?.authorizationOverride
      ? getAssistantServiceRequestOverviews()
      : getRequestsOverviewPageData().then((result) => result.requests),
    options?.authorizationOverride
      ? getAssistantServiceEmails()
      : getEmailsPageData().then((result) => result.emails),
    options?.authorizationOverride
      ? getAssistantServiceProductions()
      : getProductionsPageData().then((result) => result.productions),
  ]);

  const requests = requestRows.filter(
    (request) => request.clientName.toLowerCase() === term.value,
  );
  const emails = emailRows.filter(
    (email) => email.clientName.toLowerCase() === term.value,
  );
  const productions = productionRows.filter(
    (production) => production.clientName.toLowerCase() === term.value,
  );

  return createAssistantActionSuccess(
    {
      links: [
        ...requests.slice(0, 3).map((request) => ({
          href: `/requests/${request.id}`,
          label: request.title,
        })),
        ...productions.slice(0, 2).map((production) => ({
          href: "/productions",
          label: production.orderNumber,
        })),
      ],
      signals: [
        requests.filter(
          (request) => request.priority === "critical" || request.priority === "high",
        ).length > 0
          ? "Le client a récemment plusieurs demandes urgentes."
          : null,
        productions.filter((production) => production.isBlocked).length > 0
          ? "Des productions liées à ce client ont déjà été bloquées."
          : null,
        emails.filter((email) => email.status === "review").length > 0
          ? "Des emails du client sont encore à revoir."
          : null,
      ].filter((value): value is string => Boolean(value)),
      summary: `${requests.length} demande(s), ${emails.length} email(s) et ${productions.length} production(s) trouvés pour ${clientName}.`,
    },
    `Historique consolidé pour ${clientName}.`,
  );
}

export async function searchModelHistory(
  modelName: string,
  options?: AssistantCommandExecutionOptions,
): Promise<AssistantActionResult<AssistantHistorySearchResult>> {
  const authorization = await authorizeServerPermissions(
    ["assistant.read"],
    options?.authorizationOverride,
  );

  if (!authorization.ok) {
    return createAssistantActionFailure("forbidden", authorization.message);
  }

  const term = validateLookupTerm(modelName, "Le nom modèle");

  if (!term.ok) {
    return createAssistantActionFailure("validation_error", term.message);
  }

  const [requestRows, productionRows] = await Promise.all([
    options?.authorizationOverride
      ? getAssistantServiceRequestOverviews()
      : getRequestsOverviewPageData().then((result) => result.requests),
    options?.authorizationOverride
      ? getAssistantServiceProductions()
      : getProductionsPageData().then((result) => result.productions),
  ]);

  const requests = requestRows.filter((request) =>
    request.title.toLowerCase().includes(term.value),
  );
  const productions = productionRows.filter((production) =>
    production.modelName.toLowerCase().includes(term.value),
  );

  return createAssistantActionSuccess(
    {
      links: [
        ...requests.slice(0, 3).map((request) => ({
          href: `/requests/${request.id}`,
          label: request.title,
        })),
        ...productions.slice(0, 3).map((production) => ({
          href: "/productions",
          label: production.orderNumber,
        })),
      ],
      signals: [
        productions.filter((production) => production.isBlocked).length > 0
          ? "Ce modèle a déjà connu des blocages en production."
          : null,
        productions.filter(
          (production) => production.risk === "critical" || production.risk === "high",
        ).length > 0
          ? "Ce modèle remonte plusieurs signaux de risque élevés."
          : null,
        requests.length >= 3 ? "Le modèle revient souvent dans les demandes récentes." : null,
      ].filter((value): value is string => Boolean(value)),
      summary: `${requests.length} demande(s) et ${productions.length} production(s) trouvées autour du modèle ${modelName}.`,
    },
    `Historique consolidé pour ${modelName}.`,
  );
}

export async function getAssistantWorkspaceData(): Promise<AssistantWorkspaceData> {
  const authorization = await authorizeServerPermissions(["assistant.read"]);

  if (!authorization.ok) {
    return {
      actions: assistantActionCatalog,
      error: authorization.message,
      previews: [],
    };
  }

  const [today, emailsResult, requestsResult, blockedResult, highRiskResult] =
    await Promise.all([
      getTodayOverviewData(),
      getUnprocessedEmails(),
      getRequestsWithoutAssignee(),
      getBlockedProductions(),
      getHighRiskProductions(),
    ]);

  return {
    actions: assistantActionCatalog,
    error: today.error,
    previews: [
      {
        count: today.urgencies24h.length,
        description: "Deadlines et retards immédiatement actionnables aujourd’hui.",
        href: "/aujourdhui",
        id: "today-urgencies",
        label: "Urgences du jour",
      },
      {
        count: emailsResult.data?.length ?? 0,
        description: "Emails encore non traités ou toujours à revoir.",
        href: "/emails",
        id: "emails-unprocessed",
        label: "Emails non traités",
      },
      {
        count: requestsResult.data?.length ?? 0,
        description: "Demandes sans owner clair à arbitrer rapidement.",
        href: "/a-traiter",
        id: "requests-unassigned",
        label: "Demandes sans assignation",
      },
      {
        count: blockedResult.data?.length ?? 0,
        description: "Productions déjà bloquées côté opération.",
        href: "/productions",
        id: "productions-blocked",
        label: "Productions bloquées",
      },
      {
        count: highRiskResult.data?.length ?? 0,
        description: "Productions high risk / critical à surveiller de près.",
        href: "/productions",
        id: "productions-high-risk",
        label: "Productions à risque",
      },
    ],
  };
}

async function detectRequestNoteField(
  requestId: string,
  restContext?: AssistantMutationExecutionContext["rest"] | null,
) {
  const result = await supabaseRestSelectMaybeSingle<Record<string, unknown>>("requests", {
    id: `eq.${requestId}`,
    select: "id,notes,internal_notes,note",
  }, restContext ?? undefined);

  if (result.error || !result.data) {
    return null;
  }

  if ("notes" in result.data) {
    return "notes" as const;
  }

  if ("internal_notes" in result.data) {
    return "internal_notes" as const;
  }

  if ("note" in result.data) {
    return "note" as const;
  }

  return null;
}
