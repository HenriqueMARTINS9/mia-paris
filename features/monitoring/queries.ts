import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getCurrentUserContext } from "@/features/auth/queries";
import { canReadMonitoring, normalizeAppUserRole } from "@/features/auth/permissions";
import { getDashboardPageData } from "@/features/dashboard/queries";
import type {
  MonitoringEventItem,
  MonitoringFailureItem,
  MonitoringPageData,
  MonitoringRouteData,
} from "@/features/monitoring/types";
import { readObject, readString } from "@/lib/record-helpers";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import type { ActivityLogRecord } from "@/types/crm";

const EMPTY_MONITORING_DATA: MonitoringPageData = {
  error: null,
  failures: {
    items: [],
    last24h: 0,
    last7d: 0,
  },
  gmailHealth: {
    connected: false,
    emailAddress: null,
    lastSyncedAt: null,
    latestFailureMessage: null,
    latestRun: null,
    recentRuns: [],
    syncError: null,
  },
  pipeline: {
    emailRequestCreationFailures: 0,
    emailRequestsCreated: 0,
    emailsNonTraites: 0,
    productionsBlocked: 0,
    requestsCreatedToday: 0,
    tasksOverdue: 0,
    validationsPending: 0,
  },
  recentEvents: [],
};

export async function getMonitoringRouteData(): Promise<MonitoringRouteData> {
  noStore();

  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return {
      currentRole: null,
      data: {
        ...EMPTY_MONITORING_DATA,
        error: "Session Supabase introuvable. Reconnecte-toi pour accéder au monitoring.",
      },
    };
  }

  const role = normalizeAppUserRole(currentUser.appUser?.role ?? null);

  if (!canReadMonitoring(role)) {
    return {
      currentRole: role,
      data: {
        ...EMPTY_MONITORING_DATA,
        error: "Ce rôle ne peut pas accéder au monitoring système.",
      },
    };
  }

  const [dashboard, logsResult] = await Promise.all([
    getDashboardPageData(),
    supabaseRestSelectList<ActivityLogRecord>("activity_logs", {
      limit: 80,
      order: "created_at.desc.nullslast",
      select: "*",
    }),
  ]);

  const logs =
    logsResult.error && !isMissingSupabaseResourceError(logsResult.rawError)
      ? []
      : (logsResult.data ?? []);

  const failureItems = logs
    .filter(isFailureLog)
    .map(mapFailureItem);

  const recentEvents = logs.slice(0, 16).map(mapEventItem);
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  return {
    currentRole: role,
    data: {
      error: dashboard.error,
      failures: {
        items: failureItems.slice(0, 8),
        last24h: failureItems.filter((item) => new Date(item.createdAt).getTime() >= oneDayAgo)
          .length,
        last7d: failureItems.filter((item) => new Date(item.createdAt).getTime() >= sevenDaysAgo)
          .length,
      },
      gmailHealth: {
        connected: dashboard.gmailInbox.connected,
        emailAddress: dashboard.gmailInbox.emailAddress,
        lastSyncedAt: dashboard.gmailInbox.lastSyncedAt,
        latestFailureMessage:
          dashboard.latestSyncs.find((run) => !run.ok)?.errorMessage ??
          dashboard.syncError,
        latestRun: dashboard.latestSyncs[0] ?? null,
        recentRuns: dashboard.latestSyncs.slice(0, 6),
        syncError: dashboard.syncError,
      },
      pipeline: {
        emailRequestCreationFailures: dashboard.emailRequestCreationFailures,
        emailRequestsCreated: dashboard.emailRequestsCreated,
        emailsNonTraites: dashboard.kpis.openEmails,
        productionsBlocked: dashboard.kpis.productionsBlocked,
        requestsCreatedToday: dashboard.kpis.requestsCreatedToday,
        tasksOverdue: dashboard.kpis.tasksOverdue,
        validationsPending: dashboard.kpis.pendingValidations,
      },
      recentEvents,
    },
  };
}

function isFailureLog(log: ActivityLogRecord) {
  const explicitStatus = readString(log, ["action_status", "status"])?.toLowerCase();
  const action = readString(log, ["action", "action_type"])?.toLowerCase() ?? "";
  const payload = readObject(log, ["payload", "metadata"]);
  const hasPayloadError = Boolean(
    readString(payload, ["errorMessage", "error_message", "error"]),
  );

  return (
    explicitStatus === "failure" ||
    hasPayloadError ||
    action.endsWith("_error") ||
    action.includes("_failed")
  );
}

function mapFailureItem(log: ActivityLogRecord): MonitoringFailureItem {
  return {
    action: readString(log, ["action", "action_type"]) ?? "unknown_action",
    createdAt: readString(log, ["created_at"]) ?? new Date().toISOString(),
    description: readString(log, ["description"]),
    entityId: readString(log, ["entity_id"]),
    entityType: readString(log, ["entity_type"]),
    id: log.id,
    requestId: readString(log, ["request_id"]),
    scope: readString(log, ["scope"]),
    source: readString(log, ["action_source", "source", "actor_type"]),
  };
}

function mapEventItem(log: ActivityLogRecord): MonitoringEventItem {
  return {
    action: readString(log, ["action", "action_type"]) ?? "unknown_action",
    createdAt: readString(log, ["created_at"]) ?? new Date().toISOString(),
    description: readString(log, ["description"]),
    entityId: readString(log, ["entity_id"]),
    entityType: readString(log, ["entity_type"]),
    id: log.id,
    scope: readString(log, ["scope"]),
    source: readString(log, ["action_source", "source", "actor_type"]),
    status: isFailureLog(log) ? "failure" : "success",
  };
}
