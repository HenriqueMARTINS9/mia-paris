import type { EmailListItem, GmailInboxStatus } from "@/features/emails/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { RequestOverviewListItem } from "@/features/requests/types";
import type { TaskListItem } from "@/features/tasks/types";

export interface DashboardKpis {
  emailsToReview: number;
  openEmails: number;
  pendingValidations: number;
  productionsBlocked: number;
  requestsCreatedToday: number;
  requestsWithoutOwner: number;
  tasksOverdue: number;
  urgencies24h: number;
}

export interface GmailSyncSummary {
  connectedInboxEmail: string | null;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  ignoredMessages: number;
  importedMessages: number;
  importedThreads: number;
  ok: boolean;
}

export interface DashboardPageData {
  emailRequestCreationFailures: number;
  emailRequestsCreated: number;
  error: string | null;
  gmailInbox: GmailInboxStatus;
  kpis: DashboardKpis;
  latestEmails: EmailListItem[];
  latestSyncs: GmailSyncSummary[];
  priorityRequests: RequestOverviewListItem[];
  productionsAtRisk: ProductionListItem[];
  syncError: string | null;
  tasksUrgent: TaskListItem[];
}
