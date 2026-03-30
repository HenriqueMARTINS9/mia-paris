import type { AppPermission } from "@/features/auth/authorization";

export type AutomationLane = "process" | "decide";

export type AutomationPriority = "critical" | "high" | "normal";

export type AutomationRuleKey =
  | "request_stale"
  | "request_unassigned"
  | "task_overdue"
  | "deadline_critical"
  | "production_blocked_too_long"
  | "production_high_risk"
  | "email_unqualified_urgent"
  | "validation_pending_too_long"
  | "request_probable_duplicate"
  | "request_missing_documents";

export interface AutomationRuleDefinition {
  key: AutomationRuleKey;
  label: string;
  description: string;
  lane: AutomationLane;
  priority: AutomationPriority;
  thresholdHours?: number;
  nextAction: string;
}

export interface AutomationAlertDraft {
  clientId?: string | null;
  clientName: string | null;
  entityId: string;
  entityType: string;
  lane: AutomationLane;
  linkHref: string | null;
  metadata?: Record<string, unknown> | null;
  modelId?: string | null;
  nextAction: string;
  priority: AutomationPriority;
  productionId?: string | null;
  reason: string;
  requestId?: string | null;
  ruleKey: AutomationRuleKey;
  subtitle: string | null;
  title: string;
}

export interface AutomationAlertItem extends AutomationAlertDraft {
  detectedAt: string;
  id: string;
  lastSeenAt: string;
  ruleLabel: string;
  source: "live" | "stored";
  status: "open" | "resolved" | "dismissed";
}

export interface AutomationRunItem {
  createdAt: string;
  createdCount: number;
  decideOpen: number;
  errorMessage: string | null;
  id: string;
  message: string | null;
  ok: boolean;
  processOpen: number;
  resolvedCount: number;
  totalOpen: number;
}

export interface AutomationSummary {
  criticalCount: number;
  decideOpen: number;
  highCount: number;
  lastRunAt: string | null;
  processOpen: number;
  totalOpen: number;
}

export interface AutomationOverviewData {
  alerts: AutomationAlertItem[];
  error: string | null;
  latestRun: AutomationRunItem | null;
  runs: AutomationRunItem[];
  rules: AutomationRuleDefinition[];
  summary: AutomationSummary;
  warning: string | null;
}

export interface RunAutomationsResult {
  createdCount: number;
  message: string;
  ok: boolean;
  resolvedCount: number;
  totalOpen: number;
}

export interface AutomationQuickAction {
  label: string;
  permission?: AppPermission;
  type:
    | "assign_to_me"
    | "mark_deadline_done"
    | "mark_email_review"
    | "sync_gmail"
    | "task_in_progress";
}
