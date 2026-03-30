import type { GmailSyncSummary } from "@/features/dashboard/types";
import type { DeadlineListItem } from "@/features/deadlines/types";
import type { EmailListItem, GmailInboxStatus } from "@/features/emails/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { RequestOverviewListItem } from "@/features/requests/types";
import type { TaskListItem } from "@/features/tasks/types";
import type { AutomationOverviewData } from "@/features/automations/types";

export interface TodayOverviewKpis {
  blockedProductions: number;
  emailsToTriage: number;
  pendingValidations: number;
  tasksToday: number;
  unassignedRequests: number;
  urgencies24h: number;
}

export interface TodayOverviewData {
  automationOverview: AutomationOverviewData;
  blockedProductions: ProductionListItem[];
  emailsToTriage: EmailListItem[];
  error: string | null;
  gmailInbox: GmailInboxStatus;
  kpis: TodayOverviewKpis;
  latestSyncs: GmailSyncSummary[];
  pendingValidations: number;
  tasksToday: TaskListItem[];
  unassignedRequests: RequestOverviewListItem[];
  urgencies24h: DeadlineListItem[];
}
