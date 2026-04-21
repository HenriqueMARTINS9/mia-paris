import type {
  EmailListItem,
  GmailInboxStatus,
  GmailSyncMode,
} from "@/features/emails/types";
import type { DeadlineListItem } from "@/features/deadlines/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { RequestOverviewListItem } from "@/features/requests/types";

export interface DashboardKpis {
  emailsToReview: number;
  importantEmails: number;
  openEmails: number;
  pendingValidations: number;
  productionsBlocked: number;
  productionsHighRisk: number;
  requestsCreatedToday: number;
  requestsWithoutOwner: number;
  tasksOverdue: number;
  urgenciesToday: number;
  urgencies24h: number;
}

export interface DashboardAssistantActionItem {
  createdAt: string;
  description: string;
  href: string | null;
  id: string;
  status: "failure" | "info" | "success";
  title: string;
}

export interface GmailSyncSummary {
  connectedInboxEmail: string | null;
  createdAt: string;
  errorCount?: number;
  errorMessage: string | null;
  id: string;
  ignoredMessages: number;
  importedMessages: number;
  importedThreads: number;
  message?: string | null;
  ok: boolean;
  queryUsed: string | null;
  syncMode: GmailSyncMode | null;
}

export interface DashboardPageData {
  blockedProductions: ProductionListItem[];
  emailRequestCreationFailures: number;
  emailRequestsCreated: number;
  error: string | null;
  gmailInbox: GmailInboxStatus;
  highRiskProductions: ProductionListItem[];
  importantEmails: EmailListItem[];
  kpis: DashboardKpis;
  latestSyncs: GmailSyncSummary[];
  recentAssistantActions: DashboardAssistantActionItem[];
  syncError: string | null;
  unassignedRequests: RequestOverviewListItem[];
  urgentDeadlines: DeadlineListItem[];
}
