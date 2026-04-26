import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { getDeadlinesPageData } from "@/features/deadlines/queries";
import { getEmailInboxSnapshot } from "@/features/emails/queries";
import { getGmailSyncSummaries } from "@/features/emails/lib/gmail-sync-history";
import { getProductionsListSnapshot } from "@/features/productions/queries";
import { getRequestsOverviewPageData } from "@/features/requests/queries";
import type {
  DashboardAssistantActionItem,
  DashboardPageData,
  DashboardTodayEmailItem,
  DashboardTodayRequestItem,
  DashboardTodayTaskItem,
} from "@/features/dashboard/types";
import { supabaseRestSelectList } from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { readString, titleCaseFromSnake } from "@/lib/record-helpers";
import type { ActivityLogRecord, ValidationRecord } from "@/types/crm";

const getDashboardPageDataInternal = async (): Promise<DashboardPageData> => {
  noStore();

  const emptyData: DashboardPageData = {
    blockedProductions: [],
    emailRequestCreationFailures: 0,
    emailRequestsCreated: 0,
    error: null,
    gmailInbox: {
      connected: false,
      emailAddress: null,
      error: null,
      inboxId: null,
      lastSyncedAt: null,
    },
    highRiskProductions: [],
    importantEmails: [],
    kpis: {
      emailsToReview: 0,
      importantEmails: 0,
      openEmails: 0,
      pendingValidations: 0,
      productionsBlocked: 0,
      productionsHighRisk: 0,
      requestsCreatedToday: 0,
      requestsWithoutOwner: 0,
      tasksOverdue: 0,
      urgenciesToday: 0,
      urgencies24h: 0,
    },
    latestSyncs: [],
    recentAssistantActions: [],
    syncError: null,
    todayEmails: [],
    todayRequests: [],
    todaySummary: null,
    todayTasks: [],
    unassignedRequests: [],
    urgentDeadlines: [],
  };

  if (!hasSupabaseEnv) {
    return {
      ...emptyData,
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ...emptyData,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder au dashboard.",
      };
    }

    const startOfToday = startOfDayIso();
    const todaySummaryDate = startOfToday.slice(0, 10);
    const [
      requestsData,
      deadlinesData,
      productionsSnapshot,
      emailSnapshot,
      assistantLogsResult,
      pendingValidationsResult,
      pipelineLogsResult,
      requestsCreatedTodayResult,
      overdueTasksResult,
      todayEmailsResult,
      todaySummaryResult,
      todayTasksResult,
    ] = await Promise.all([
      getRequestsOverviewPageData(),
      getDeadlinesPageData(),
      getProductionsListSnapshot(),
      getEmailInboxSnapshot(12),
      supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(16),
      supabaseRestSelectList<ValidationRecord>("validations", {
        select: "id,status",
      }),
      supabaseRestSelectList<ActivityLogRecord>("activity_logs", {
        action_type: "in.(request_created_from_email,request_creation_failed_from_email)",
        order: "created_at.desc.nullslast",
        select: "id,action_type,created_at",
      }),
      supabase
        .from("v_requests_overview")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfToday),
      supabase
        .from("v_tasks_open")
        .select("id", { count: "exact", head: true })
        .lt("due_at", new Date().toISOString()),
      supabase
        .from("emails")
        .select(
          "id,from_name,from_email,subject,preview_text,assistant_bucket,detected_client_name,received_at,created_at",
        )
        .gte("received_at", startOfToday)
        .order("received_at", { ascending: false, nullsFirst: false })
        .limit(8),
      supabase
        .from("daily_summaries")
        .select(
          "id,summary_date,summary_time,title,overview,highlights,risks,next_actions,client_summaries,generated_at,created_at",
        )
        .eq("summary_date", todaySummaryDate)
        .order("generated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select(
          "id,title,task_type,status,priority,request_id,assigned_user_id,due_at,created_at,updated_at",
        )
        .or(`created_at.gte.${startOfToday},updated_at.gte.${startOfToday}`)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(8),
    ]);

    const pipelineLogs = (pipelineLogsResult.data ?? []) as ActivityLogRecord[];
    const emailRequestsCreated = pipelineLogs.filter((log) =>
      matchesAction(log, "request_created_from_email"),
    ).length;
    const emailRequestCreationFailures = pipelineLogs.filter((log) =>
      matchesAction(log, "request_creation_failed_from_email"),
    ).length;
    const gmailSyncSummaryResult = await getGmailSyncSummaries({
      inboxId: emailSnapshot.gmailInbox.inboxId,
      limit: 6,
    });

    const unassignedRequests = [...requestsData.requests]
      .filter((request) => request.owner === "Non assigné")
      .sort((left, right) => right.urgencyScore - left.urgencyScore)
      .slice(0, 6);

    const urgentDeadlines = [...deadlinesData.deadlines]
      .filter((deadline) => deadline.status !== "done" && (deadline.isOverdue || isDueWithin24h(deadline.deadlineAt)))
      .sort(sortDeadlinesByUrgency)
      .slice(0, 6);

    const blockedProductions = [...productionsSnapshot.productions]
      .filter((production) => production.isBlocked)
      .sort(sortProductionsByRisk)
      .slice(0, 6);

    const highRiskProductions = [...productionsSnapshot.productions]
      .filter(
        (production) =>
          !production.isBlocked &&
          (production.risk === "critical" || production.risk === "high"),
      )
      .sort(sortProductionsByRisk)
      .slice(0, 6);

    const importantEmails = [...emailSnapshot.latestEmails]
      .filter((email) => email.triage.bucket === "important")
      .sort(
        (left, right) =>
          new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
      )
      .slice(0, 6);

    const recentAssistantActions = ((assistantLogsResult.data ?? []) as ActivityLogRecord[])
      .filter((log) => (readString(log, ["action_source", "source"]) ?? "").toLowerCase() === "assistant")
      .map(mapAssistantLogToItem)
      .slice(0, 6);
    const todayRequests = requestsData.requests
      .filter(
        (request) =>
          isDateOnOrAfter(request.createdAt, startOfToday) ||
          isDateOnOrAfter(request.updatedAt, startOfToday),
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
      .slice(0, 8)
      .map((request): DashboardTodayRequestItem => ({
        changeType: isDateOnOrAfter(request.createdAt, startOfToday)
          ? "created"
          : "updated",
        clientName: request.clientName,
        createdAt: request.createdAt,
        id: request.id,
        priority: request.priority,
        status: request.status,
        title: request.title,
        type: request.requestTypeLabel,
        updatedAt: request.updatedAt,
      }));
    const requestTitleById = new Map(
      requestsData.requests.map((request) => [request.id, request.title] as const),
    );
    const todayTasks = ((todayTasksResult.data ?? []) as Array<Record<string, unknown>>)
      .map((task) => mapTodayTask(task, requestTitleById, startOfToday));

    return {
      blockedProductions,
      emailRequestCreationFailures,
      emailRequestsCreated,
      error:
        [
          requestsData.error,
          deadlinesData.error,
          productionsSnapshot.error,
          emailSnapshot.error,
          assistantLogsResult.error?.message ?? null,
          gmailSyncSummaryResult.error,
          todayEmailsResult.error?.message
            ? `Emails du jour: ${todayEmailsResult.error.message}`
            : null,
          todaySummaryResult.error?.message
            ? `Synthèse du jour: ${todaySummaryResult.error.message}`
            : null,
          todayTasksResult.error?.message
            ? `Tâches du jour: ${todayTasksResult.error.message}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      gmailInbox: emailSnapshot.gmailInbox,
      highRiskProductions,
      importantEmails,
      kpis: {
        emailsToReview: emailSnapshot.counts.review,
        importantEmails: emailSnapshot.bucketCounts.important,
        openEmails: emailSnapshot.counts.open,
        pendingValidations: (pendingValidationsResult.data ?? []).filter(isValidationPending).length,
        productionsBlocked: blockedProductions.length,
        productionsHighRisk: highRiskProductions.length,
        requestsCreatedToday: requestsCreatedTodayResult.count ?? 0,
        requestsWithoutOwner: unassignedRequests.length,
        tasksOverdue: overdueTasksResult.count ?? 0,
        urgenciesToday: urgentDeadlines.length,
        urgencies24h: urgentDeadlines.length,
      },
      latestSyncs: gmailSyncSummaryResult.runs,
      recentAssistantActions,
      syncError: gmailSyncSummaryResult.error,
      todayEmails: ((todayEmailsResult.data ?? []) as Array<Record<string, unknown>>).map(
        mapTodayEmail,
      ),
      todayRequests,
      todaySummary: todaySummaryResult.data
        ? mapTodaySummary(todaySummaryResult.data as Record<string, unknown>)
        : null,
      todayTasks,
      unassignedRequests,
      urgentDeadlines,
    };
  } catch (error) {
    return {
      ...emptyData,
      error:
        error instanceof Error
          ? `Impossible de charger le dashboard: ${error.message}`
          : "Impossible de charger le dashboard.",
    };
  }
};

export const getDashboardPageData = cache(getDashboardPageDataInternal);

function mapTodayEmail(record: Record<string, unknown>): DashboardTodayEmailItem {
  const fromName = readString(record, ["from_name", "fromName"]);
  const fromEmail = readString(record, ["from_email", "fromEmail"]);

  return {
    bucket: normalizeEmailBucket(
      readString(record, ["assistant_bucket", "assistantBucket"]),
    ),
    clientName: readString(record, ["detected_client_name", "client_name", "clientName"]),
    from: fromName || fromEmail || "Expéditeur inconnu",
    id: readString(record, ["id"]) ?? crypto.randomUUID(),
    previewText: readString(record, ["preview_text", "previewText"]) ?? "",
    receivedAt:
      readString(record, ["received_at", "receivedAt", "created_at", "createdAt"]) ??
      new Date().toISOString(),
    subject: readString(record, ["subject"]) ?? "Sans objet",
  };
}

function mapTodaySummary(record: Record<string, unknown>) {
  return {
    clientSummaries: normalizeClientSummaries(record.client_summaries),
    highlights: normalizeStringArray(record.highlights),
    id: readString(record, ["id"]) ?? "today-summary",
    nextActions: normalizeStringArray(record.next_actions),
    overview: readString(record, ["overview"]) ?? "Synthèse du jour non renseignée.",
    risks: normalizeStringArray(record.risks),
    summaryDate:
      readString(record, ["summary_date", "summaryDate"]) ??
      new Date().toISOString().slice(0, 10),
    summaryTime:
      readString(record, ["summary_time", "summaryTime"]) ??
      normalizeSummaryTime(readString(record, ["generated_at", "created_at"])),
    title: readString(record, ["title"]) ?? "Synthèse du jour",
  };
}

function mapTodayTask(
  record: Record<string, unknown>,
  requestTitleById: Map<string, string>,
  startOfToday: string,
): DashboardTodayTaskItem {
  const requestId = readString(record, ["request_id", "requestId"]);
  const createdAt = readString(record, ["created_at", "createdAt"]);
  const updatedAt = readString(record, ["updated_at", "updatedAt"]);

  return {
    changeType: isDateOnOrAfter(createdAt, startOfToday) ? "created" : "updated",
    createdAt,
    dueAt: readString(record, ["due_at", "dueAt"]),
    id: readString(record, ["id"]) ?? crypto.randomUUID(),
    priority: readString(record, ["priority"]),
    requestId,
    requestTitle: requestId ? requestTitleById.get(requestId) ?? null : null,
    status: readString(record, ["status"]),
    title: readString(record, ["title"]) ?? "Tâche sans titre",
    updatedAt,
  };
}

function normalizeEmailBucket(value: string | null): DashboardTodayEmailItem["bucket"] {
  if (value === "important" || value === "promotional" || value === "to_review") {
    return value;
  }

  return null;
}

function normalizeClientSummaries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      clientName:
        readString(item, ["clientName", "client_name"]) ?? "Client non identifié",
      summary: readString(item, ["summary"]) ?? "Résumé client non renseigné.",
    }))
    .slice(0, 4);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeSummaryTime(value: string | null) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(value ? new Date(value) : new Date());
}

function isDateOnOrAfter(value: string | null, lowerBoundIso: string) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  const lowerBoundTime = new Date(lowerBoundIso).getTime();

  return Number.isFinite(time) && Number.isFinite(lowerBoundTime) && time >= lowerBoundTime;
}

function startOfDayIso() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.toISOString();
}

function isDueWithin24h(value: string | null) {
  if (!value) {
    return false;
  }

  const now = Date.now();
  const deadlineTime = new Date(value).getTime();

  return Number.isFinite(deadlineTime) && deadlineTime >= now && deadlineTime <= now + 24 * 60 * 60 * 1000;
}

function sortDeadlinesByUrgency(
  left: DashboardPageData["urgentDeadlines"][number],
  right: DashboardPageData["urgentDeadlines"][number],
) {
  if (left.isOverdue !== right.isOverdue) {
    return left.isOverdue ? -1 : 1;
  }

  const leftTime = left.deadlineAt ? new Date(left.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
  const rightTime = right.deadlineAt ? new Date(right.deadlineAt).getTime() : Number.POSITIVE_INFINITY;

  return leftTime - rightTime;
}

function sortProductionsByRisk(
  left: DashboardPageData["blockedProductions"][number],
  right: DashboardPageData["blockedProductions"][number],
) {
  if (left.isBlocked !== right.isBlocked) {
    return left.isBlocked ? -1 : 1;
  }

  return getRiskWeight(right.risk) - getRiskWeight(left.risk);
}

function getRiskWeight(value: string) {
  if (value === "critical") {
    return 4;
  }

  if (value === "high") {
    return 3;
  }

  if (value === "normal") {
    return 2;
  }

  return 1;
}

function isValidationPending(validation: ValidationRecord) {
  const status = readString(validation, ["status"])?.toLowerCase() ?? "pending";
  return !["done", "approved", "validated", "rejected", "closed"].includes(status);
}

function mapAssistantLogToItem(log: ActivityLogRecord): DashboardAssistantActionItem {
  const action =
    readString(log, ["action", "action_type"]) ??
    "assistant_action";
  const description =
    readString(log, ["description"]) ??
    "Action assistant enregistrée dans le CRM.";
  const statusValue = (readString(log, ["status", "action_status"]) ?? "success").toLowerCase();

  return {
    createdAt: readString(log, ["created_at"]) ?? new Date().toISOString(),
    description,
    href: resolveAssistantLogHref(log),
    id: log.id,
    status:
      statusValue === "failure" || statusValue === "error"
        ? "failure"
        : statusValue === "success" || statusValue === "ok"
          ? "success"
          : "info",
    title: formatAssistantActionTitle(action),
  };
}

function matchesAction(log: ActivityLogRecord, expected: string) {
  const action = readString(log, ["action", "action_type"]);
  return action === expected;
}

function resolveAssistantLogHref(log: ActivityLogRecord) {
  const requestId = readString(log, ["request_id"]);
  if (requestId) {
    return `/requests/${requestId}`;
  }

  const entityType = readString(log, ["entity_type"]);
  const entityId = readString(log, ["entity_id"]);

  if (entityType === "request" && entityId) {
    return `/requests/${entityId}`;
  }

  if (entityType === "email") {
    return "/emails";
  }

  if (entityType === "production") {
    return "/productions";
  }

  if (entityType === "deadline") {
    return "/deadlines";
  }

  if (entityType === "task") {
    return "/taches";
  }

  return null;
}

function formatAssistantActionTitle(action: string) {
  return (
    titleCaseFromSnake(
      action
        .replace(/^assistant_/, "")
        .replace(/^openclaw_/, "")
        .replace(/_invoked$/, ""),
    ) ?? "Action Claw"
  );
}
