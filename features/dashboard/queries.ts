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
    ] = await Promise.all([
      getRequestsOverviewPageData(),
      getDeadlinesPageData(),
      getProductionsListSnapshot(),
      getEmailInboxSnapshot(12),
      supabase
        .from("activity_logs")
        .select(
          "id,action,action_type,description,entity_id,entity_type,request_id,status,action_status,created_at,source",
        )
        .eq("source", "assistant")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseRestSelectList<ValidationRecord>("validations", {
        select: "id,status",
      }),
      supabaseRestSelectList<ActivityLogRecord>("activity_logs", {
        action: "in.(request_created_from_email,request_creation_failed_from_email)",
        order: "created_at.desc.nullslast",
        select: "id,action,action_type,created_at",
      }),
      supabase
        .from("v_requests_overview")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDayIso()),
      supabase
        .from("v_tasks_open")
        .select("id", { count: "exact", head: true })
        .lt("due_at", new Date().toISOString()),
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
      .map(mapAssistantLogToItem)
      .slice(0, 6);

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
