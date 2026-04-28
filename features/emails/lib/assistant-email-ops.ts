import "server-only";

import type {
  AssistantEmailOpsCycleItem,
  AssistantRunEmailOpsCycleResult,
} from "@/features/assistant-actions/types";
import type { AssistantMutationActorContext } from "@/features/assistant-actions/execution-context";
import type { ServerPermissionOverride } from "@/features/auth/server-authorization";
import { writeDailySummaryAction } from "@/features/daily-summaries/actions/write-daily-summary";
import { createRequestFromEmailAction } from "@/features/emails/actions/create-request-from-email";
import { attachEmailToRequestAction } from "@/features/emails/actions/update-email";
import type {
  EmailAssistantReply,
  EmailInboxBucket,
  EmailQualificationDraft,
  GmailSyncMode,
} from "@/features/emails/types";
import { resolveEmailInboxTriage } from "@/features/emails/lib/inbox-triage";
import {
  buildEmailQualificationDraft,
  mergeEmailQualificationDraft,
} from "@/features/emails/lib/qualification";
import { syncLatestGmailMessagesForActor } from "@/features/emails/lib/gmail-sync";
import { logOperationalError } from "@/lib/action-runtime";
import { buildReplyDraft } from "@/features/replies/lib/build-reply-draft";
import type { ReplyDraftContext, ReplyDraftType } from "@/features/replies/types";
import {
  parseJsonObject,
  readBoolean,
  readNumber,
  readObject,
  readString,
  uniqueStrings,
} from "@/lib/record-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractMissingSupabaseColumnName,
  isMissingSupabaseColumnError,
  supabaseRestPatch,
  type SupabaseRestExecutionContext,
} from "@/lib/supabase/rest";
import type { RequestPriority } from "@/features/requests/types";
import { updateRequestPriorityAction } from "@/features/requests/actions/update-request";
import {
  updateTaskDueDateAction,
  updateTaskPriorityAction,
} from "@/features/tasks/actions/update-task";
import type {
  ClientRecord,
  ContactRecord,
  EmailAttachmentRecord,
  EmailRecord,
  ModelRecord,
  ProductDepartmentRecord,
  RequestRecord,
  TaskRecord,
} from "@/types/crm";

const DEFAULT_EMAIL_OPS_LIMIT = 15;
const DEFAULT_SYNC_LIMIT = 50;
const MAX_EMAIL_OPS_LIMIT = 200;
const MAX_SYNC_LIMIT = 1500;

interface EmailOpsReferenceData {
  attachmentCountByEmailId: Map<string, number>;
  clients: ClientRecord[];
  contacts: ContactRecord[];
  models: ModelRecord[];
  productDepartments: ProductDepartmentRecord[];
  requests: RequestRecord[];
  tasks: TaskRecord[];
}

export interface RunAssistantEmailOpsCycleOptions {
  actor?: AssistantMutationActorContext | null;
  authorizationOverride?: ServerPermissionOverride | null;
  createRequests?: boolean | null;
  attachToExistingRequests?: boolean | null;
  limit?: number | null;
  rest?: SupabaseRestExecutionContext | null;
  syncLimit?: number | null;
  syncMode?: GmailSyncMode | null;
  updateRequests?: boolean | null;
  updateTasks?: boolean | null;
  writeSummary?: boolean | null;
}

export async function runAssistantEmailOpsCycle(
  options?: RunAssistantEmailOpsCycleOptions,
): Promise<{
  message: string;
  ok: boolean;
  result: AssistantRunEmailOpsCycleResult;
}> {
  const processLimit = clampInteger(
    options?.limit,
    DEFAULT_EMAIL_OPS_LIMIT,
    1,
    MAX_EMAIL_OPS_LIMIT,
  );
  const syncLimit = clampInteger(
    options?.syncLimit,
    DEFAULT_SYNC_LIMIT,
    1,
    MAX_SYNC_LIMIT,
  );
  const sync = await syncLatestGmailMessagesForActor(syncLimit, {
    actorUserId: options?.actor?.actorUserId ?? null,
    syncMode: options?.syncMode ?? null,
  });
  const candidates = await loadEmailOpsCandidates(processLimit);
  const references = await loadEmailOpsReferenceData(
    candidates.map((candidate) => candidate.id),
  );
  const result: AssistantRunEmailOpsCycleResult = {
    clientClassifiedCount: 0,
    crmEnrichedCount: 0,
    deadlineCreatedCount: 0,
    errorCount: 0,
    importantCount: 0,
    items: [],
    processedCount: 0,
    promotionalCount: 0,
    requestAttachedCount: 0,
    requestCreatedCount: 0,
    requestUpdatedCount: 0,
    skippedCount: 0,
    summaryWrittenCount: 0,
    sync,
    taskCreatedCount: 0,
    taskUpdatedCount: 0,
    toReviewCount: 0,
  };

  // Process sequentially to keep assistant decisions predictable email by email.
  for (const email of candidates) {
    const emailResult = await classifySingleEmail(email, references, {
      actor: options?.actor ?? null,
      authorizationOverride: options?.authorizationOverride ?? null,
      attachToExistingRequests: options?.attachToExistingRequests ?? null,
      createRequests: options?.createRequests ?? null,
      rest: options?.rest ?? null,
      updateRequests: options?.updateRequests ?? null,
      updateTasks: options?.updateTasks ?? null,
    });

    result.items.push(emailResult.item);

    if (emailResult.item.status === "classified") {
      result.processedCount += 1;

      if (emailResult.enrichedCrm) {
        result.crmEnrichedCount += 1;
      }

      if (emailResult.clientClassified) {
        result.clientClassifiedCount += 1;
      }

      if (emailResult.requestCreated) {
        result.requestCreatedCount += 1;
      }

      if (emailResult.requestAttached) {
        result.requestAttachedCount += 1;
      }

      if (emailResult.requestUpdated) {
        result.requestUpdatedCount += 1;
      }

      if (emailResult.taskCreated) {
        result.taskCreatedCount += 1;
      }

      if (emailResult.taskUpdated) {
        result.taskUpdatedCount += 1;
      }

      if (emailResult.deadlineCreated) {
        result.deadlineCreatedCount += 1;
      }

      if (emailResult.item.bucket === "important") {
        result.importantCount += 1;
      }

      if (emailResult.item.bucket === "promotional") {
        result.promotionalCount += 1;
      }

      if (emailResult.item.bucket === "to_review") {
        result.toReviewCount += 1;
      }
    }

    if (emailResult.item.status === "skipped") {
      result.skippedCount += 1;
    }

    if (emailResult.item.status === "error") {
      result.errorCount += 1;
    }
  }

  if (options?.writeSummary) {
    const summaryResult = await writeEmailOpsDailySummary(result, {
      actor: options?.actor ?? null,
      authorizationOverride: options?.authorizationOverride ?? null,
      rest: options?.rest ?? null,
    });

    if (summaryResult.ok) {
      result.summaryWrittenCount += 1;
    } else {
      result.errorCount += 1;
    }
  }

  const ok = result.processedCount > 0 || (sync.ok && result.errorCount === 0);
  const message = buildEmailOpsMessage(result);

  return {
    message,
    ok,
    result,
  };
}

async function classifySingleEmail(
  email: EmailRecord,
  references: EmailOpsReferenceData,
  options: {
    actor: AssistantMutationActorContext | null;
    authorizationOverride: ServerPermissionOverride | null;
    attachToExistingRequests: boolean | null;
    createRequests: boolean | null;
    rest: SupabaseRestExecutionContext | null;
    updateRequests: boolean | null;
    updateTasks: boolean | null;
  },
): Promise<{
  clientClassified: boolean;
  deadlineCreated: boolean;
  enrichedCrm: boolean;
  item: AssistantEmailOpsCycleItem;
  requestAttached: boolean;
  requestCreated: boolean;
  requestUpdated: boolean;
  taskCreated: boolean;
  taskUpdated: boolean;
}> {
  const subject = readString(email, ["subject"]) ?? "Sans objet";
  const fromEmail = readString(email, ["from_email"]) ?? "";
  const fromName = readString(email, ["from_name"]) ?? "";
  const previewText = readString(email, ["preview_text"]) ?? "";
  const bodyText = readString(email, ["body_text"]) ?? null;
  const storedClassification = readStoredClassification(email);

  if (!needsAssistantHandling(email, storedClassification)) {
    return {
      clientClassified: Boolean(
        readString(storedClassification, ["client_id", "client_name"]) ??
          readString(email, ["client_id", "detected_client_name"]),
      ),
      deadlineCreated: false,
      enrichedCrm: false,
      item: {
        bucket:
          normalizeBucket(
            readString(storedClassification, [
              "assistant_bucket",
              "assistantBucket",
              "bucket",
            ]),
          ) ?? null,
        clientName:
          readString(storedClassification, ["client_name", "client"]) ??
          readString(email, ["detected_client_name"]) ??
          null,
        dueAt:
          readString(storedClassification, ["due_at", "deadline"]) ??
          readString(email, ["detected_deadline"]) ??
          null,
        emailId: email.id,
        from: fromName || fromEmail,
        priority: readPriorityFromSources(storedClassification, email),
        reason: "Email déjà qualifié par l’assistant.",
        recommendedAction: "Aucun retraitement nécessaire pour ce mail.",
        requestType:
          readString(storedClassification, ["request_type", "type"]) ??
          readString(email, ["detected_type"]) ??
          null,
        status: "skipped",
        subject,
      },
      requestAttached: false,
      requestCreated: false,
      requestUpdated: false,
      taskCreated: false,
      taskUpdated: false,
    };
  }

  try {
    const baseDraft = buildEmailQualificationDraft({
      bodyText,
      fromName,
      previewText,
      subject,
    });
    const seededDraft = mergeEmailQualificationDraft(baseDraft, {
      aiConfidence:
        readNumber(email, ["ai_confidence"]) ??
        readNumber(storedClassification, ["confidence", "score"]) ??
        baseDraft.aiConfidence,
      clientId:
        readString(storedClassification, ["client_id"]) ??
        readString(email, ["client_id"]) ??
        null,
      clientName:
        readString(storedClassification, ["client_name", "client"]) ??
        readString(email, ["detected_client_name"]) ??
        null,
      contactId:
        readString(storedClassification, ["contact_id"]) ??
        readString(email, ["contact_id"]) ??
        null,
      contactName:
        readString(storedClassification, ["contact_name", "contact"]) ??
        (fromName || null) ??
        null,
      dueAt:
        readString(storedClassification, ["due_at", "deadline"]) ??
        readString(email, ["detected_deadline"]) ??
        baseDraft.dueAt,
      modelId:
        readString(storedClassification, ["model_id"]) ??
        readString(email, ["model_id"]) ??
        null,
      modelName:
        readString(storedClassification, ["model_name"]) ??
        readString(email, ["model_name", "reference"]) ??
        null,
      priority:
        readPriorityFromSources(storedClassification, email) ?? baseDraft.priority,
      productDepartmentId:
        readString(storedClassification, ["product_department_id", "department_id"]) ??
        readString(email, ["product_department_id"]) ??
        null,
      productDepartmentName:
        readString(storedClassification, ["product_department", "department", "department_name"]) ??
        readString(email, ["department_name", "detected_department"]) ??
        null,
      requestType:
        readString(storedClassification, ["request_type", "type"]) ??
        readString(email, ["detected_type"]) ??
        baseDraft.requestType,
      requestedAction:
        readString(storedClassification, ["requested_action", "next_action"]) ??
        readString(email, ["requested_action"]) ??
        baseDraft.requestedAction,
      requiresHumanValidation:
        readBoolean(storedClassification, ["requires_human_validation"]) ??
        readBoolean(email, ["requires_human_validation"]) ??
        baseDraft.requiresHumanValidation,
      summary:
        readString(storedClassification, ["summary", "short_summary"]) ??
        readString(email, ["ai_summary"]) ??
        baseDraft.summary,
      title: readString(storedClassification, ["title"]) ?? baseDraft.title,
    });
    const enrichedDraft = enrichQualificationDraft(seededDraft, email, references);
    const triage = resolveEmailInboxTriage({
      attachmentCount: references.attachmentCountByEmailId.get(email.id) ?? 0,
      classification: storedClassification,
      clientId: enrichedDraft.clientId,
      detectedType: enrichedDraft.requestType,
      emailRecord: email,
      fromEmail,
      fromName,
      linkedRequestId:
        readString(email, ["request_id", "linked_request_id", "crm_request_id"]) ??
        readString(storedClassification, ["linkedRequestId", "linked_request_id", "request_id"]) ??
        null,
      previewText,
      subject,
      suggestedFields: {
        aiConfidence: enrichedDraft.aiConfidence,
        dueAt: enrichedDraft.dueAt,
        priority: enrichedDraft.priority,
        requestType: enrichedDraft.requestType,
      },
    });
    const linkedRequestId =
      readString(email, ["request_id", "linked_request_id", "crm_request_id"]) ??
      readString(storedClassification, [
        "linkedRequestId",
        "linked_request_id",
        "request_id",
      ]) ??
      null;
    const assistantReply = buildAssistantReplySuggestion({
      draft: enrichedDraft,
      email,
      fromEmail,
      fromName,
      linkedRequestId,
      triage,
    });
    const classificationPayload = buildAssistantClassificationPayload(
      email.id,
      enrichedDraft,
      triage,
      assistantReply,
      storedClassification,
    );
    const patchResult = await patchEmailClassification(
      email.id,
      buildEmailPatchPayload(
        enrichedDraft,
        triage,
        classificationPayload,
        assistantReply,
      ),
      options.rest,
    );

    if (!patchResult.ok) {
      return {
        clientClassified: Boolean(enrichedDraft.clientId || enrichedDraft.clientName),
        deadlineCreated: false,
        enrichedCrm: false,
        item: {
          bucket: triage.bucket,
          clientName: enrichedDraft.clientName,
          dueAt: enrichedDraft.dueAt,
          emailId: email.id,
          from: fromName || fromEmail,
          priority: enrichedDraft.priority,
          reason: patchResult.message,
          recommendedAction: "Vérifier l’email manuellement dans le CRM.",
          requestType: enrichedDraft.requestType,
          status: "error",
          subject,
        },
        requestAttached: false,
        requestCreated: false,
        requestUpdated: false,
        taskCreated: false,
        taskUpdated: false,
      };
    }

    const automation = await maybeAutomateQualifiedEmail({
      actor: options.actor,
      authorizationOverride: options.authorizationOverride,
      attachToExistingRequests: options.attachToExistingRequests,
      createRequests: options.createRequests,
      draft: enrichedDraft,
      email,
      references,
      rest: options.rest,
      triage,
      updateRequests: options.updateRequests,
      updateTasks: options.updateTasks,
    });

    return {
      clientClassified: Boolean(enrichedDraft.clientId || enrichedDraft.clientName),
      deadlineCreated: automation.deadlineCreated,
      enrichedCrm: hasCrmEnrichment(enrichedDraft),
      item: {
        bucket: triage.bucket,
        clientName: enrichedDraft.clientName,
        dueAt: enrichedDraft.dueAt,
        emailId: email.id,
        from: fromName || fromEmail,
        priority: enrichedDraft.priority,
        reason: triage.reason,
        recommendedAction:
          automation.recommendedAction ??
          buildRecommendedAction(triage.bucket, enrichedDraft),
        requestType: enrichedDraft.requestType,
        status: "classified",
        subject,
      },
      requestAttached: automation.requestAttached,
      requestCreated: automation.requestCreated,
      requestUpdated: automation.requestUpdated,
      taskCreated: automation.taskCreated,
      taskUpdated: automation.taskUpdated,
    };
  } catch (error) {
    await logOperationalError({
      actorId: options.actor?.actorUserId ?? null,
      entityId: email.id,
      entityType: "email",
      error,
      message: "Qualification assistant de l’email impossible.",
      payload: {
        fromEmail,
        subject,
      },
      requestId: null,
      scope: "emails.assistant_ops",
      source: options.actor?.source ?? "assistant",
    });

    return {
      clientClassified: false,
      deadlineCreated: false,
      enrichedCrm: false,
      item: {
        bucket: null,
        clientName: null,
        dueAt: null,
        emailId: email.id,
        from: fromName || fromEmail,
        priority: null,
        reason: error instanceof Error ? error.message : "Qualification impossible.",
        recommendedAction: "Basculer ce mail dans À vérifier.",
        requestType: null,
        status: "error",
        subject,
      },
      requestAttached: false,
      requestCreated: false,
      requestUpdated: false,
      taskCreated: false,
      taskUpdated: false,
    };
  }
}

async function maybeAutomateQualifiedEmail(input: {
  actor: AssistantMutationActorContext | null;
  authorizationOverride: ServerPermissionOverride | null;
  attachToExistingRequests: boolean | null;
  createRequests: boolean | null;
  draft: EmailQualificationDraft;
  email: EmailRecord;
  references: EmailOpsReferenceData;
  rest: SupabaseRestExecutionContext | null;
  triage: {
    bucket: EmailInboxBucket;
    confidence: number | null;
    reason: string | null;
    source: string;
  };
  updateRequests: boolean | null;
  updateTasks: boolean | null;
}) {
  const linkedRequestId =
    readString(input.email, ["request_id", "linked_request_id", "crm_request_id"]) ??
    readString(readStoredClassification(input.email), [
      "linkedRequestId",
      "linked_request_id",
      "request_id",
    ]) ??
    null;

  if (!input.createRequests) {
    return createEmptyAutomationResult();
  }

  if (input.triage.bucket !== "important") {
    return createEmptyAutomationResult();
  }

  if (linkedRequestId) {
    const updates = await maybeUpdateLinkedCrmFromEmail({
      ...input,
      requestId: linkedRequestId,
    });

    return {
      ...createEmptyAutomationResult(),
      requestUpdated: updates.requestUpdated,
      recommendedAction: "Demande déjà liée. Compléter ou traiter le dossier existant.",
      taskUpdated: updates.taskUpdated,
    };
  }

  if (input.attachToExistingRequests) {
    const match = findMatchingRequestForEmail(input.draft, input.email, input.references);

    if (match) {
      const attachResult = await attachEmailToRequestAction(
        {
          emailId: input.email.id,
          requestId: match.request.id,
          source: "assistant",
        },
        {
          actor: input.actor,
          authorizationOverride: input.authorizationOverride,
          rest: input.rest,
        },
      );

      if (attachResult.ok) {
        const updates = await maybeUpdateLinkedCrmFromEmail({
          ...input,
          requestId: match.request.id,
        });

        return {
          ...createEmptyAutomationResult(),
          recommendedAction:
            updates.taskUpdated || updates.requestUpdated
              ? "Email rattaché à la demande existante, priorité/échéance mises à jour si utile."
              : "Email rattaché à la demande existante.",
          requestAttached: true,
          requestUpdated: updates.requestUpdated,
          taskUpdated: updates.taskUpdated,
        };
      }
    }
  }

  if (
    !input.draft.clientId ||
    !input.draft.requestType ||
    input.draft.title.trim().length < 3 ||
    input.draft.requiresHumanValidation
  ) {
    return createEmptyAutomationResult();
  }

  if (typeof input.draft.aiConfidence === "number" && input.draft.aiConfidence < 0.62) {
    return createEmptyAutomationResult();
  }

  const creationResult = await createRequestFromEmailAction(
    {
      emailId: input.email.id,
      qualification: input.draft,
    },
    {
      actor: input.actor,
      authorizationOverride: input.authorizationOverride,
      rest: input.rest,
    },
  );

  if (!creationResult.ok) {
    return {
      ...createEmptyAutomationResult(),
      recommendedAction: creationResult.message,
    };
  }

  return {
    deadlineCreated: creationResult.deadlineCreated === true,
    recommendedAction: creationResult.taskCreated || creationResult.deadlineCreated
      ? "Demande, tâche et suivi ont été créés automatiquement dans le CRM."
      : "Demande CRM créée automatiquement depuis cet email.",
    requestAttached: false,
    requestCreated: creationResult.requestCreated === true || Boolean(creationResult.requestId),
    requestUpdated: false,
    taskCreated: creationResult.taskCreated === true,
    taskUpdated: false,
  };
}

async function maybeUpdateLinkedCrmFromEmail(input: {
  actor: AssistantMutationActorContext | null;
  authorizationOverride: ServerPermissionOverride | null;
  draft: EmailQualificationDraft;
  references: EmailOpsReferenceData;
  requestId: string;
  rest: SupabaseRestExecutionContext | null;
  updateRequests: boolean | null;
  updateTasks: boolean | null;
}) {
  let requestUpdated = false;
  let taskUpdated = false;
  const context = {
    actor: input.actor,
    authorizationOverride: input.authorizationOverride,
    rest: input.rest,
  };
  const request =
    input.references.requests.find((item) => item.id === input.requestId) ?? null;

  if (
    input.updateRequests &&
    request &&
    input.draft.priority &&
    priorityRank(input.draft.priority) > priorityRank(readPriorityValue(request.priority))
  ) {
    const result = await updateRequestPriorityAction(
      {
        priority: input.draft.priority,
        requestId: input.requestId,
      },
      context,
    );

    requestUpdated = result.ok;
  }

  if (input.updateTasks) {
    const task = findMostRelevantOpenTask(input.references.tasks, input.requestId);

    if (task) {
      const currentPriority = readPriorityValue(task.priority);

      if (
        input.draft.priority &&
        priorityRank(input.draft.priority) > priorityRank(currentPriority)
      ) {
        const result = await updateTaskPriorityAction(
          {
            priority: input.draft.priority,
            requestId: input.requestId,
            taskId: task.id,
          },
          context,
        );

        taskUpdated = taskUpdated || result.ok;
      }

      if (input.draft.dueAt && shouldPullTaskDueDateForward(task.due_at, input.draft.dueAt)) {
        const result = await updateTaskDueDateAction(
          {
            dueAt: input.draft.dueAt.slice(0, 10),
            requestId: input.requestId,
            taskId: task.id,
          },
          context,
        );

        taskUpdated = taskUpdated || result.ok;
      }
    }
  }

  return {
    requestUpdated,
    taskUpdated,
  };
}

function findMatchingRequestForEmail(
  draft: EmailQualificationDraft,
  email: EmailRecord,
  references: EmailOpsReferenceData,
) {
  if (!draft.clientId) {
    return null;
  }

  const sourceText = normalizeSearchText(
    [
      draft.title,
      draft.summary,
      draft.requestedAction,
      readString(email, ["subject"]),
      readString(email, ["preview_text"]),
      readString(email, ["body_text"]),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const sourceTokens = toMatchTokens(sourceText);

  if (sourceTokens.length === 0) {
    return null;
  }

  const candidates = references.requests
    .filter((request) => request.client_id === draft.clientId)
    .filter((request) => !isClosedRequestStatus(request.status))
    .map((request) => {
      const requestText = normalizeSearchText(
        [
          request.title,
          request.summary,
          request.requested_action,
          request.raw_source_excerpt,
          request.request_type,
        ]
          .filter(Boolean)
          .join(" "),
      );
      const requestTokens = toMatchTokens(requestText);
      const overlap = sourceTokens.filter((token) => requestTokens.includes(token));
      let score =
        sourceTokens.length > 0 ? overlap.length / Math.max(sourceTokens.length, 1) : 0;

      if (draft.requestType && request.request_type === draft.requestType) {
        score += 0.18;
      }

      if (draft.modelId && request.model_id === draft.modelId) {
        score += 0.2;
      }

      if (
        draft.productDepartmentId &&
        request.product_department_id === draft.productDepartmentId
      ) {
        score += 0.12;
      }

      return {
        request,
        score,
      };
    })
    .sort((left, right) => right.score - left.score);

  const best = candidates[0] ?? null;

  return best && best.score >= 0.42 ? best : null;
}

function findMostRelevantOpenTask(tasks: TaskRecord[], requestId: string) {
  return [...tasks]
    .filter((task) => task.request_id === requestId)
    .filter((task) => !isClosedTaskStatus(task.status))
    .sort((left, right) => {
      const leftDueAt = left.due_at ? new Date(left.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDueAt = right.due_at ? new Date(right.due_at).getTime() : Number.MAX_SAFE_INTEGER;

      return leftDueAt - rightDueAt;
    })[0] ?? null;
}

async function writeEmailOpsDailySummary(
  result: AssistantRunEmailOpsCycleResult,
  context: {
    actor: AssistantMutationActorContext | null;
    authorizationOverride: ServerPermissionOverride | null;
    rest: SupabaseRestExecutionContext | null;
  },
) {
  const now = new Date();
  const grouped = new Map<string, AssistantEmailOpsCycleItem[]>();
  const summaryItems = result.items.filter(
    (entry) => entry.status === "classified" && entry.bucket !== "promotional",
  );

  for (const item of summaryItems) {
    const clientName = item.clientName?.trim() || "Inbox sans client";
    grouped.set(clientName, [...(grouped.get(clientName) ?? []), item]);
  }

  if (grouped.size === 0) {
    grouped.set("Inbox", []);
  }

  const clientSummaries = Array.from(grouped.entries()).map(([clientName, items]) => ({
    clientName,
    decisions: items
      .filter((item) => item.bucket === "to_review")
      .slice(0, 4)
      .map((item) => `À vérifier: ${item.subject}`),
    emailIds: items.map((item) => item.emailId),
    highlights:
      items.length > 0
        ? items.slice(0, 5).map((item) => `${item.subject} (${item.bucket ?? "non classé"})`)
        : ["Aucun nouvel email qualifié pendant ce cycle."],
    nextActions: uniqueStrings(
      items
        .map((item) => item.recommendedAction)
        .filter((value): value is string => Boolean(value))
        .slice(0, 6),
    ),
    requestIds: [],
    risks: items
      .filter((item) => item.priority === "critical" || item.priority === "high")
      .slice(0, 5)
      .map((item) => `${item.priority}: ${item.subject}`),
    summary:
      items.length > 0
        ? `${items.length} email(s) traités: ${items.filter((item) => item.bucket === "important").length} important(s), ${items.filter((item) => item.bucket === "to_review").length} à vérifier, ${items.filter((item) => item.bucket === "promotional").length} pub.`
        : "Aucun nouvel email qualifié pendant ce cycle.",
    taskIds: [],
  }));

  return writeDailySummaryAction(
    {
      clientSummaries,
      generatedAt: now.toISOString(),
      highlights: [
        `${result.processedCount} email(s) qualifié(s)`,
        `${result.requestCreatedCount} demande(s) créée(s)`,
        `${result.requestAttachedCount} email(s) rattaché(s)`,
        `${result.taskCreatedCount + result.taskUpdatedCount} tâche(s) créée(s) ou mise(s) à jour`,
      ],
      nextActions:
        result.toReviewCount > 0
          ? ["Contrôler les emails dans À vérifier."]
          : ["Surveiller les emails importants et demandes créées par Claw."],
      overview: `Cycle Claw: ${result.processedCount} email(s) classé(s), ${result.importantCount} important(s), ${result.toReviewCount} à vérifier, ${result.requestCreatedCount} demande(s) créée(s).`,
      risks:
        result.errorCount > 0
          ? [`${result.errorCount} erreur(s) pendant le cycle.`]
          : [],
      source: "assistant",
      summaryDate: now.toISOString().slice(0, 10),
      summaryTime: new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      }).format(now),
      title: `Synthèse Claw inbox ${now.toISOString().slice(0, 10)}`,
    },
    context,
  );
}

async function loadEmailOpsCandidates(limit: number) {
  const admin = createSupabaseAdminClient();
  const scanLimit = Math.min(Math.max(limit * 4, 40), MAX_EMAIL_OPS_LIMIT * 4);
  const { data, error } = await admin
    .from("emails")
    .select("*")
    .or("is_processed.is.null,is_processed.eq.false")
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(scanLimit);

  if (error) {
    throw new Error(`Impossible de charger les emails assistant: ${error.message}`);
  }

  return ((data ?? []) as EmailRecord[])
    .filter((email) => needsAssistantHandling(email, readStoredClassification(email)))
    .slice(0, limit);
}

async function loadEmailOpsReferenceData(emailIds: string[]): Promise<EmailOpsReferenceData> {
  const admin = createSupabaseAdminClient();
  const [
    clientsResult,
    contactsResult,
    modelsResult,
    productDepartmentsResult,
    requestsResult,
    tasksResult,
    attachments,
  ] = await Promise.all([
      admin.from("clients").select("*"),
      admin.from("contacts").select("*"),
      admin.from("models").select("*"),
      admin.from("product_departments").select("*"),
      admin
        .from("requests")
        .select("*")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(250),
      admin
        .from("tasks")
        .select("*")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(500),
      emailIds.length > 0
        ? admin.from("email_attachments").select("email_id").in("email_id", emailIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (clientsResult.error) {
    throw new Error(`Impossible de charger les clients CRM: ${clientsResult.error.message}`);
  }

  if (contactsResult.error) {
    throw new Error(`Impossible de charger les contacts CRM: ${contactsResult.error.message}`);
  }

  if (modelsResult.error) {
    throw new Error(`Impossible de charger les modèles CRM: ${modelsResult.error.message}`);
  }

  if (productDepartmentsResult.error) {
    throw new Error(
      `Impossible de charger les départements produit CRM: ${productDepartmentsResult.error.message}`,
    );
  }

  if (requestsResult.error) {
    throw new Error(
      `Impossible de charger les demandes CRM: ${requestsResult.error.message}`,
    );
  }

  if (tasksResult.error) {
    throw new Error(`Impossible de charger les tâches CRM: ${tasksResult.error.message}`);
  }

  if (attachments.error) {
    throw new Error(
      `Impossible de charger les pièces jointes email: ${attachments.error.message}`,
    );
  }

  const attachmentCountByEmailId = new Map<string, number>();

  for (const row of (attachments.data ?? []) as EmailAttachmentRecord[]) {
    const emailId = readString(row, ["email_id", "emailId"]);

    if (!emailId) {
      continue;
    }

    attachmentCountByEmailId.set(
      emailId,
      (attachmentCountByEmailId.get(emailId) ?? 0) + 1,
    );
  }

  return {
    attachmentCountByEmailId,
    clients: (clientsResult.data ?? []) as ClientRecord[],
    contacts: (contactsResult.data ?? []) as ContactRecord[],
    models: (modelsResult.data ?? []) as ModelRecord[],
    productDepartments: (productDepartmentsResult.data ?? []) as ProductDepartmentRecord[],
    requests: (requestsResult.data ?? []) as RequestRecord[],
    tasks: (tasksResult.data ?? []) as TaskRecord[],
  };
}

function enrichQualificationDraft(
  draft: EmailQualificationDraft,
  email: EmailRecord,
  references: EmailOpsReferenceData,
) {
  const subject = readString(email, ["subject"]) ?? "";
  const previewText = readString(email, ["preview_text"]) ?? "";
  const bodyText = readString(email, ["body_text"]) ?? "";
  const fromEmail = readString(email, ["from_email"]) ?? "";
  const fromName = readString(email, ["from_name"]) ?? "";
  const fullText = normalizeSearchText(
    [subject, previewText, bodyText, fromName, fromEmail].filter(Boolean).join(" "),
  );
  const contactMatch =
    findContactMatch(references.contacts, {
      clientId: draft.clientId,
      contactName: draft.contactName ?? fromName,
      fromEmail,
    }) ?? null;
  const clientMatch =
    (contactMatch?.client_id
      ? references.clients.find((client) => client.id === contactMatch.client_id) ?? null
      : null) ??
    findClientMatch(references.clients, fullText);
  const departmentMatch = findDepartmentMatch(references.productDepartments, fullText);
  const modelMatch = findModelMatch(references.models, fullText, clientMatch?.id ?? null);
  const derivedClient =
    clientMatch ??
    (modelMatch?.client_id
      ? references.clients.find((client) => client.id === modelMatch.client_id) ?? null
      : null);

  return mergeEmailQualificationDraft(draft, {
    clientId: draft.clientId ?? derivedClient?.id ?? null,
    clientName:
      draft.clientName ??
      readString(derivedClient, ["name", "client_name", "account_name"]) ??
      null,
    contactId: draft.contactId ?? contactMatch?.id ?? null,
    contactName:
      draft.contactName ??
      readString(contactMatch, ["full_name", "name", "contact_name"]) ??
      (fromName || null),
    modelId: draft.modelId ?? modelMatch?.id ?? null,
    modelName:
      draft.modelName ??
      readString(modelMatch, ["name", "label", "reference", "style_name"]) ??
      null,
    productDepartmentId: draft.productDepartmentId ?? departmentMatch?.id ?? null,
    productDepartmentName:
      draft.productDepartmentName ??
      readString(departmentMatch, ["name", "label", "department_name"]) ??
      null,
  });
}

async function patchEmailClassification(
  emailId: string,
  payload: Record<string, unknown>,
  rest: SupabaseRestExecutionContext | null,
) {
  const currentPayload: Record<string, unknown> = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  while (true) {
    const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
      "emails",
      cleanPayload(currentPayload),
      {
        id: `eq.${emailId}`,
        select: "id",
      },
      rest ?? { authMode: "service_role" },
    );

    if (!result.error) {
      return {
        ok: Boolean(result.data && result.data.length > 0),
        message:
          result.data && result.data.length > 0
            ? null
            : "Aucun email mis à jour pendant la qualification assistant.",
      };
    }

    if (isEmailStatusEnumError(result.rawError)) {
      const nextPayload = stripEmailStatusPatchFields(currentPayload);

      if (Object.keys(nextPayload).length < Object.keys(currentPayload).length) {
        Object.assign(currentPayload, nextPayload);

        for (const column of ["processing_status", "status", "triage_status"]) {
          delete currentPayload[column];
        }

        continue;
      }
    }

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return {
        ok: false,
        message: result.error ?? "Mise à jour assistant impossible sur emails.",
      };
    }

    const missingColumn = extractMissingSupabaseColumnName(result.rawError);

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return {
        ok: false,
        message: result.error ?? "Mise à jour assistant impossible sur emails.",
      };
    }

    delete currentPayload[missingColumn];
  }
}

function stripEmailStatusPatchFields(payload: Record<string, unknown>) {
  const nextPayload = { ...payload };

  delete nextPayload.processing_status;
  delete nextPayload.status;
  delete nextPayload.triage_status;

  return nextPayload;
}

function isEmailStatusEnumError(error: {
  code?: string;
  details?: string;
  error?: string;
  hint?: string;
  message?: string;
} | null) {
  if (!error) {
    return false;
  }

  const message = [
    error.message,
    error.details,
    error.error,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "22P02" ||
    message.includes("invalid input value for enum") ||
    message.includes("email_processing_status")
  );
}

function buildEmailPatchPayload(
  draft: EmailQualificationDraft,
  triage: {
    bucket: EmailInboxBucket;
    confidence: number | null;
    reason: string | null;
    source: string;
  },
  classificationPayload: Record<string, unknown>,
  assistantReply: EmailAssistantReply | null,
) {
  const reviewPayload =
    triage.bucket === "to_review"
      ? {
          is_processed: false,
          processing_status: "review",
          status: "review",
          triage_status: "review",
        }
      : {};

  return {
    ai_classification: classificationPayload,
    ai_confidence: draft.aiConfidence,
    ai_summary: draft.summary,
    assistant_bucket: triage.bucket,
    assistant_bucket_confidence: triage.confidence,
    assistant_bucket_reason: triage.reason,
    assistant_reply_body: assistantReply?.body ?? null,
    assistant_reply_disclaimer: assistantReply?.disclaimer ?? null,
    assistant_reply_generated_at: assistantReply?.generatedAt ?? null,
    assistant_reply_recipients: assistantReply?.suggestedRecipients ?? null,
    assistant_reply_subject: assistantReply?.subject ?? null,
    assistant_reply_type: assistantReply?.type ?? null,
    classification_json: classificationPayload,
    client_id: draft.clientId,
    contact_id: draft.contactId,
    detected_client_name: draft.clientName,
    detected_deadline: draft.dueAt,
    detected_department: draft.productDepartmentName,
    detected_priority: draft.priority,
    detected_type: draft.requestType,
    model_id: draft.modelId,
    model_name: draft.modelName,
    product_department_id: draft.productDepartmentId,
    requested_action: draft.requestedAction,
    requires_human_validation: draft.requiresHumanValidation,
    triage_source: triage.source,
    triaged_at: new Date().toISOString(),
    ...reviewPayload,
  };
}

function buildAssistantClassificationPayload(
  emailId: string,
  draft: EmailQualificationDraft,
  triage: {
    bucket: EmailInboxBucket;
    confidence: number | null;
    reason: string | null;
    source: string;
  },
  assistantReply: EmailAssistantReply | null,
  currentClassification: Record<string, unknown> | null,
) {
  return {
    ...(currentClassification ?? {}),
    assistant_reply: assistantReply,
    assistantBucket: triage.bucket,
    assistantBucketConfidence: triage.confidence,
    assistantBucketReason: triage.reason,
    bucket: triage.bucket,
    classifiedAt: new Date().toISOString(),
    classificationEngine: "assistant_email_ops_v1",
    client_id: draft.clientId,
    client_name: draft.clientName,
    confidence: draft.aiConfidence,
    contact_id: draft.contactId,
    contact_name: draft.contactName,
    due_at: draft.dueAt,
    emailId,
    model_id: draft.modelId,
    model_name: draft.modelName,
    priority: draft.priority,
    product_department: draft.productDepartmentName,
    product_department_id: draft.productDepartmentId,
    qualification: draft,
    request_type: draft.requestType,
    requested_action: draft.requestedAction,
    requires_human_validation: draft.requiresHumanValidation,
    source: "assistant",
    summary: draft.summary,
    title: draft.title,
    triage_source: triage.source,
  };
}

function hasCrmEnrichment(draft: EmailQualificationDraft) {
  return Boolean(
    draft.clientId ||
      draft.contactId ||
      draft.productDepartmentId ||
      draft.modelId ||
      draft.requestType ||
      draft.dueAt,
  );
}

function buildRecommendedAction(
  bucket: EmailInboxBucket,
  draft: EmailQualificationDraft,
) {
  if (bucket === "promotional") {
    return "Laisser ce mail dans l’onglet Pub.";
  }

  if (bucket === "to_review") {
    return "Vérifier ce mail humainement avant de créer une demande.";
  }

  return (
    draft.requestedAction ??
    "Qualifier puis créer ou rattacher une demande dans le CRM."
  );
}

function buildAssistantReplySuggestion(input: {
  draft: EmailQualificationDraft;
  email: EmailRecord;
  fromEmail: string;
  fromName: string;
  linkedRequestId: string | null;
  triage: {
    bucket: EmailInboxBucket;
    confidence: number | null;
    reason: string | null;
    source: string;
  };
}): EmailAssistantReply | null {
  if (input.triage.bucket !== "important") {
    return null;
  }

  if (input.draft.requiresHumanValidation) {
    return null;
  }

  if (
    typeof input.draft.aiConfidence === "number" &&
    input.draft.aiConfidence < 0.58
  ) {
    return null;
  }

  const replyType = resolveAssistantReplyType(
    input.draft.requestType,
    input.linkedRequestId,
  );
  const context: ReplyDraftContext = {
    clientName: input.draft.clientName,
    dueAt: input.draft.dueAt,
    historicalSignals: [
      input.linkedRequestId ? "Une demande liée existe déjà dans le CRM." : null,
      input.draft.productDepartmentName
        ? `Département détecté: ${input.draft.productDepartmentName}.`
        : null,
      input.draft.modelName ? `Modèle détecté: ${input.draft.modelName}.` : null,
    ].filter((value): value is string => Boolean(value)),
    linkedRequestTitle: null,
    recipientEmail: input.fromEmail || null,
    recipientName: input.fromName || null,
    requestPriority: input.draft.priority,
    requestReference: input.linkedRequestId,
    requestStatus: readString(input.email, ["processing_status", "status", "triage_status"]),
    requestType: input.draft.requestType,
    requestedAction: input.draft.requestedAction,
    requestId: input.linkedRequestId,
    sourceId: input.email.id,
    sourceType: "email",
    subject: readString(input.email, ["subject"]) ?? "Sans objet",
    summary:
      input.draft.summary ??
      readString(input.email, ["ai_summary", "preview_text", "body_text"]),
  };
  const draft = buildReplyDraft({
    ...context,
    replyType,
  });

  return {
    body: draft.body,
    disclaimer: draft.disclaimer,
    generatedAt: new Date().toISOString(),
    subject: draft.subject,
    suggestedRecipients: draft.suggestedRecipients,
    type: draft.type,
  };
}

function resolveAssistantReplyType(
  requestType: string | null,
  linkedRequestId: string | null,
): ReplyDraftType {
  switch (requestType) {
    case "deadline_request":
      return "deadline_confirmation";
    case "production_followup":
      return "production_update";
    case "logistics":
      return "logistics_response";
    case "trim_validation":
      return "validation_feedback";
    case "compliance":
      return "waiting_validation";
    default:
      return linkedRequestId ? "ownership" : "acknowledgement";
  }
}

function readPriorityFromSources(
  classification: Record<string, unknown> | null,
  email: EmailRecord,
): RequestPriority | null {
  const value =
    readString(classification, ["priority"]) ??
    readString(email, ["detected_priority", "priority"]);

  if (value === "critical" || value === "high" || value === "normal") {
    return value;
  }

  return null;
}

function buildEmailOpsMessage(result: AssistantRunEmailOpsCycleResult) {
  const segments = [
    `Cycle email assistant terminé: ${result.processedCount} email(s) classé(s)`,
    `${result.importantCount} important(s)`,
    `${result.promotionalCount} pub`,
    `${result.toReviewCount} à vérifier.`,
  ];

  if (result.clientClassifiedCount > 0) {
    segments.push(`${result.clientClassifiedCount} client(s) classifié(s).`);
  }

  if (result.requestCreatedCount > 0) {
    segments.push(`${result.requestCreatedCount} demande(s) créée(s).`);
  }

  if (result.requestAttachedCount > 0) {
    segments.push(`${result.requestAttachedCount} email(s) rattaché(s).`);
  }

  if (result.requestUpdatedCount > 0) {
    segments.push(`${result.requestUpdatedCount} demande(s) mise(s) à jour.`);
  }

  if (result.taskCreatedCount > 0) {
    segments.push(`${result.taskCreatedCount} tâche(s) automatique(s) créée(s).`);
  }

  if (result.taskUpdatedCount > 0) {
    segments.push(`${result.taskUpdatedCount} tâche(s) mise(s) à jour.`);
  }

  if (result.deadlineCreatedCount > 0) {
    segments.push(`${result.deadlineCreatedCount} deadline(s) créée(s).`);
  }

  if (result.summaryWrittenCount > 0) {
    segments.push("Synthèse CRM écrite.");
  }

  if (!result.sync.ok) {
    segments.push("La sync Gmail a échoué, mais le backlog local a quand même été traité.");
  } else {
    segments.push(`${result.sync.importedMessages} nouveau(x) mail(s) importé(s).`);
  }

  if (result.errorCount > 0) {
    segments.push(`${result.errorCount} erreur(s) restent à vérifier.`);
  }

  return segments.join(" ");
}

function readStoredClassification(record: EmailRecord) {
  return (
    readObject(record, [
      "ai_classification",
      "classification_json",
      "classification",
      "analysis",
    ]) ??
    parseJsonObject(
      readString(record, [
        "ai_classification",
        "classification_json",
        "classification",
        "analysis",
      ]),
    ) ??
    null
  );
}

function needsAssistantHandling(
  email: EmailRecord,
  classification: Record<string, unknown> | null,
) {
  if (email.is_processed === true) {
    return false;
  }

  const currentBucket =
    normalizeBucket(
      readString(classification, [
        "assistant_bucket",
        "assistantBucket",
        "bucket",
      ]) ??
        readString(email, [
          "assistant_bucket",
          "assistantBucket",
          "bucket",
        ]),
    ) ?? null;
  const hasSummary = Boolean(
    readString(email, ["ai_summary"]) ??
      readString(classification, ["summary", "short_summary"]),
  );
  const hasRequestType = Boolean(
    readString(classification, ["request_type", "type"]) ??
      readString(email, ["detected_type"]),
  );
  const hasClientSignal = Boolean(
    readString(classification, ["client_id", "client_name"]) ??
      readString(email, ["client_id", "detected_client_name"]),
  );
  const hasAssistantReply = Boolean(
    readString(email, ["assistant_reply_body", "assistant_reply_subject"]) ??
      readString(
        readObject(classification, ["assistant_reply", "assistantReply"]),
        ["body", "subject"],
      ),
  );

  if (!currentBucket) {
    return true;
  }

  if (!hasSummary) {
    return true;
  }

  if (currentBucket === "important" && !hasRequestType && !hasClientSignal) {
    return true;
  }

  if (currentBucket === "important" && !hasAssistantReply) {
    return true;
  }

  return false;
}

function findClientMatch(clients: ClientRecord[], haystack: string) {
  return [...clients]
    .sort((left, right) => getSearchWeight(right) - getSearchWeight(left))
    .find((client) =>
      getSearchTokens(client).some((token) => token.length > 2 && haystack.includes(token)),
    ) ?? null;
}

function findContactMatch(
  contacts: ContactRecord[],
  input: {
    clientId: string | null;
    contactName: string | null;
    fromEmail: string;
  },
) {
  const scopedContacts = input.clientId
    ? contacts.filter((contact) => readString(contact, ["client_id"]) === input.clientId)
    : contacts;
  const normalizedEmail = normalizeSearchText(input.fromEmail);
  const exactEmailMatch =
    scopedContacts.find(
      (contact) =>
        normalizeSearchText(readString(contact, ["email"]) ?? "") === normalizedEmail,
    ) ?? null;

  if (exactEmailMatch) {
    return exactEmailMatch;
  }

  if (!input.contactName) {
    return null;
  }

  const normalizedName = normalizeSearchText(input.contactName);
  return (
    scopedContacts.find(
      (contact) =>
        normalizeSearchText(
          readString(contact, ["full_name", "name", "contact_name"]) ?? "",
        ) === normalizedName,
    ) ?? null
  );
}

function findDepartmentMatch(
  departments: ProductDepartmentRecord[],
  haystack: string,
) {
  return [...departments]
    .sort((left, right) => getSearchWeight(right) - getSearchWeight(left))
    .find((department) =>
      getSearchTokens(department).some((token) => token.length > 2 && haystack.includes(token)),
    ) ?? null;
}

function findModelMatch(
  models: ModelRecord[],
  haystack: string,
  clientId: string | null,
) {
  const scopedModels = clientId
    ? models.filter((model) => readString(model, ["client_id"]) === clientId)
    : models;

  return [...scopedModels]
    .sort((left, right) => getSearchWeight(right) - getSearchWeight(left))
    .find((model) =>
      getSearchTokens(model).some((token) => token.length > 2 && haystack.includes(token)),
    ) ?? null;
}

function getSearchTokens(record: Record<string, unknown>) {
  return uniqueStrings(
    [
      readString(record, ["name", "full_name", "client_name", "account_name", "label"]),
      readString(record, ["reference", "code", "department_name"]),
    ]
      .filter(Boolean)
      .flatMap((value) =>
        normalizeSearchText(value as string)
          .split(" ")
          .filter((token) => token.length > 2),
      ),
  );
}

function getSearchWeight(record: Record<string, unknown>) {
  return getSearchTokens(record).reduce((total, token) => total + token.length, 0);
}

function toMatchTokens(value: string) {
  return uniqueStrings(
    value
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 3)
      .filter(
        (token) =>
          ![
            "avec",
            "dans",
            "pour",
            "mail",
            "email",
            "merci",
            "bonjour",
            "hello",
            "cordialement",
          ].includes(token),
      ),
  ).slice(0, 24);
}

function readPriorityValue(value: string | null | undefined): RequestPriority {
  const normalized = (value ?? "").toLowerCase();

  if (normalized.includes("crit")) {
    return "critical";
  }

  if (normalized.includes("high") || normalized.includes("haute")) {
    return "high";
  }

  return "normal";
}

function priorityRank(priority: RequestPriority) {
  if (priority === "critical") {
    return 3;
  }

  if (priority === "high") {
    return 2;
  }

  return 1;
}

function isClosedRequestStatus(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase();

  return ["done", "closed", "cancelled", "canceled", "approved"].includes(normalized);
}

function isClosedTaskStatus(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase();

  return ["done", "closed", "cancelled", "canceled"].includes(normalized);
}

function shouldPullTaskDueDateForward(currentDueAt: string | null, nextDueAt: string) {
  const nextTime = new Date(nextDueAt).getTime();

  if (!Number.isFinite(nextTime)) {
    return false;
  }

  if (!currentDueAt) {
    return true;
  }

  const currentTime = new Date(currentDueAt).getTime();

  return !Number.isFinite(currentTime) || nextTime < currentTime;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function clampInteger(
  value: number | null | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function normalizeBucket(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "important") {
    return "important" as const;
  }

  if (normalized === "promotional" || normalized === "promotion" || normalized === "promo") {
    return "promotional" as const;
  }

  if (normalized === "to_review" || normalized === "review" || normalized === "a_verifier") {
    return "to_review" as const;
  }

  return null;
}

function createEmptyAutomationResult() {
  return {
    deadlineCreated: false,
    recommendedAction: null as string | null,
    requestAttached: false,
    requestCreated: false,
    requestUpdated: false,
    taskCreated: false,
    taskUpdated: false,
  };
}
