import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { getDeadlinesPageData } from "@/features/deadlines/queries";
import { getEmailsPageData } from "@/features/emails/queries";
import { getGmailSyncSummaries } from "@/features/emails/lib/gmail-sync-history";
import { getProductionsPageData } from "@/features/productions/queries";
import { getRequestsOverviewPageData } from "@/features/requests/queries";
import { getTasksPageData } from "@/features/tasks/queries";
import { getAutomationWorkspaceData } from "@/features/automations/queries";
import type { DashboardPageData } from "@/features/dashboard/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import {
  readString,
} from "@/lib/record-helpers";
import type { ActivityLogRecord, RequestOverview, ValidationRecord } from "@/types/crm";

const getDashboardPageDataInternal = async (): Promise<DashboardPageData> => {
  noStore();

  const emptyData: DashboardPageData = {
    automationOverview: {
      alerts: [],
      error: null,
      latestRun: null,
      runs: [],
      rules: [],
      summary: {
        criticalCount: 0,
        decideOpen: 0,
        highCount: 0,
        lastRunAt: null,
        processOpen: 0,
        totalOpen: 0,
      },
      warning: null,
    },
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
    kpis: {
      emailsToReview: 0,
      openEmails: 0,
      pendingValidations: 0,
      productionsBlocked: 0,
      requestsCreatedToday: 0,
      requestsWithoutOwner: 0,
      tasksOverdue: 0,
      urgencies24h: 0,
    },
    latestEmails: [],
    latestSyncs: [],
    priorityRequests: [],
    productionsAtRisk: [],
    syncError: null,
    tasksUrgent: [],
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
      tasksData,
      deadlinesData,
      productionsData,
      emailsData,
      automationOverview,
      requestRowsResult,
      validationsResult,
      pipelineLogsResult,
    ] = await Promise.all([
      getRequestsOverviewPageData(),
      getTasksPageData(),
      getDeadlinesPageData(),
      getProductionsPageData(),
      getEmailsPageData(),
      getAutomationWorkspaceData(),
      supabase.from("v_requests_overview").select("*"),
      supabaseRestSelectList<ValidationRecord>("validations", {
        select: "*",
      }),
      supabaseRestSelectList<ActivityLogRecord>("activity_logs", {
        action: "in.(request_created_from_email,request_creation_failed_from_email)",
        order: "created_at.desc.nullslast",
        select: "id,action,action_type,created_at",
      }),
    ]);

    const requestRows = (requestRowsResult.data ?? []) as RequestOverview[];
    const requestCreationLogs = getSafeActivityLogs(pipelineLogsResult);
    const emailRequestsCreated = requestCreationLogs.filter((log) =>
      matchesAction(log, "request_created_from_email"),
    ).length;
    const emailRequestCreationFailures = requestCreationLogs.filter((log) =>
      matchesAction(log, "request_creation_failed_from_email"),
    ).length;

    const gmailSyncSummaryResult = await getGmailSyncSummaries({
      inboxId: emailsData.gmailInbox.inboxId,
      limit: 6,
    });

    const now = new Date();
    const next24h = now.getTime() + 24 * 60 * 60 * 1000;
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const tasksUrgent = [...tasksData.tasks]
      .filter((task) => task.isOverdue || isDueWithin(task.dueAt, 48))
      .sort(sortTasksByUrgency)
      .slice(0, 6);

    const priorityRequests = [...requestsData.requests]
      .filter((request) => request.priority !== "normal" || request.urgencyScore >= 70)
      .sort((left, right) => right.urgencyScore - left.urgencyScore)
      .slice(0, 6);

    const productionsAtRisk = [...productionsData.productions]
      .filter((production) => production.isBlocked || production.risk !== "low")
      .sort((left, right) => {
        if (left.isBlocked !== right.isBlocked) {
          return left.isBlocked ? -1 : 1;
        }

        return riskWeight(right.risk) - riskWeight(left.risk);
      })
      .slice(0, 6);

    return {
      automationOverview,
      emailRequestCreationFailures,
      emailRequestsCreated,
      error:
        [
          requestsData.error,
          tasksData.error,
          deadlinesData.error,
          productionsData.error,
          emailsData.error,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      gmailInbox: emailsData.gmailInbox,
      kpis: {
        emailsToReview: emailsData.emails.filter((email) => email.status === "review").length,
        openEmails: emailsData.emails.filter((email) => email.status !== "processed").length,
        pendingValidations: getSafeValidations(validationsResult).filter(isValidationPending).length,
        productionsBlocked: productionsData.productions.filter((production) => production.isBlocked).length,
        requestsCreatedToday: requestRows.filter((request) => {
          const createdAt = new Date(request.created_at).getTime();
          return Number.isFinite(createdAt) && createdAt >= startOfDay.getTime();
        }).length,
        requestsWithoutOwner: requestsData.requests.filter(
          (request) => request.owner === "Non assigné",
        ).length,
        tasksOverdue: tasksData.tasks.filter((task) => task.isOverdue && task.status !== "done").length,
        urgencies24h: deadlinesData.deadlines.filter((deadline) => {
          if (!deadline.deadlineAt || deadline.status === "done") {
            return false;
          }

          const time = new Date(deadline.deadlineAt).getTime();
          return Number.isFinite(time) && time >= now.getTime() && time <= next24h;
        }).length,
      },
      latestEmails: [...emailsData.emails]
        .sort(
          (left, right) =>
            new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
        )
        .slice(0, 6),
      latestSyncs: gmailSyncSummaryResult.runs,
      priorityRequests,
      productionsAtRisk,
      syncError: gmailSyncSummaryResult.error,
      tasksUrgent,
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

function getSafeValidations(result: Awaited<ReturnType<typeof supabaseRestSelectList<ValidationRecord>>>) {
  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as ValidationRecord[];
  }

  return result.data ?? [];
}

function getSafeActivityLogs(
  result: Awaited<ReturnType<typeof supabaseRestSelectList<ActivityLogRecord>>>,
) {
  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as ActivityLogRecord[];
  }

  return result.data ?? [];
}

function isValidationPending(validation: ValidationRecord) {
  const status = readString(validation, ["status"])?.toLowerCase() ?? "pending";
  return !["done", "approved", "validated", "rejected", "closed"].includes(status);
}

function matchesAction(log: ActivityLogRecord, expected: string) {
  const action = readString(log, ["action", "action_type"]);
  return action === expected;
}

function riskWeight(value: string) {
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

function isDueWithin(value: string | null, hours: number) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return false;
  }

  const diff = time - Date.now();
  return diff >= 0 && diff <= hours * 60 * 60 * 1000;
}

function sortTasksByUrgency(
  left: { dueAt: string | null; isOverdue: boolean },
  right: { dueAt: string | null; isOverdue: boolean },
) {
  if (left.isOverdue !== right.isOverdue) {
    return left.isOverdue ? -1 : 1;
  }

  const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;

  return leftTime - rightTime;
}
