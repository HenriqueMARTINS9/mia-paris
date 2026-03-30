import type { DashboardPageData, GmailSyncSummary } from "@/features/dashboard/types";

export interface MonitoringFailureItem {
  action: string;
  createdAt: string;
  description: string | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  requestId: string | null;
  scope: string | null;
  source: string | null;
}

export interface MonitoringEventItem {
  action: string;
  createdAt: string;
  description: string | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  scope: string | null;
  source: string | null;
  status: "failure" | "success";
}

export interface MonitoringPipelineMetrics {
  emailRequestCreationFailures: number;
  emailRequestsCreated: number;
  emailsNonTraites: number;
  productionsBlocked: number;
  requestsCreatedToday: number;
  tasksOverdue: number;
  validationsPending: number;
}

export interface MonitoringGmailHealth {
  connected: boolean;
  emailAddress: string | null;
  lastSyncedAt: string | null;
  latestFailureMessage: string | null;
  latestRun: GmailSyncSummary | null;
  recentRuns: GmailSyncSummary[];
  syncError: string | null;
}

export interface MonitoringPageData {
  error: string | null;
  failures: {
    items: MonitoringFailureItem[];
    last24h: number;
    last7d: number;
  };
  gmailHealth: MonitoringGmailHealth;
  pipeline: MonitoringPipelineMetrics;
  recentEvents: MonitoringEventItem[];
}

export interface MonitoringRouteData {
  currentRole: string | null;
  data: MonitoringPageData;
}

export interface MonitoringDashboardBridge {
  dashboard: DashboardPageData;
}
