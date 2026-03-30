export interface AnalyticsKpiItem {
  hint: string;
  id: string;
  label: string;
  secondary: string;
  tone?: "critical" | "default" | "warning";
  value: string;
}

export interface AnalyticsDistributionItem {
  count: number;
  id: string;
  label: string;
  secondary: string | null;
  share: number;
}

export interface AnalyticsTimingSummary {
  avgEmailToRequestHours: number | null;
  avgRequestToFirstTaskHours: number | null;
  medianEmailToRequestHours: number | null;
  requestToFirstTaskSampleSize: number;
  sampleSize: number;
}

export interface AnalyticsOverdueTaskItem {
  clientName: string;
  dueAt: string | null;
  id: string;
  priority: string;
  title: string;
}

export interface AnalyticsProductionIncidentItem {
  blockingReason: string | null;
  clientName: string;
  id: string;
  label: string;
  risk: string;
  status: string;
}

export interface AnalyticsValidationItem {
  id: string;
  label: string;
  status: string;
  turnaroundHours: number;
  updatedAt: string | null;
}

export interface AnalyticsFlowPoint {
  emails: number;
  label: string;
  requests: number;
}

export interface AnalyticsPageData {
  error: string | null;
  flowByDay: AnalyticsFlowPoint[];
  kpis: AnalyticsKpiItem[];
  overdue: {
    items: AnalyticsOverdueTaskItem[];
    missedDeadlinesCount: number;
    overdueTasksCount: number;
  };
  productionRisk: {
    blockedCount: number;
    highRiskCount: number;
    incidents: AnalyticsProductionIncidentItem[];
  };
  requestsByClient: AnalyticsDistributionItem[];
  requestsByType: AnalyticsDistributionItem[];
  timing: AnalyticsTimingSummary;
  validation: {
    averageHours: number | null;
    pendingCount: number;
    sampleSize: number;
    slowest: AnalyticsValidationItem[];
  };
}
