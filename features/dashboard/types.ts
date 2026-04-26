import type {
  EmailListItem,
  GmailInboxStatus,
  GmailSyncMode,
} from "@/features/emails/types";
import type { DeadlineListItem } from "@/features/deadlines/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { RequestOverviewListItem } from "@/features/requests/types";

export interface DashboardDailySummaryPreview {
  clientSummaries: Array<{
    clientName: string;
    summary: string;
  }>;
  highlights: string[];
  id: string;
  nextActions: string[];
  overview: string;
  risks: string[];
  summaryDate: string;
  summaryTime: string;
  title: string;
}

export interface DashboardTodayEmailItem {
  bucket: "important" | "promotional" | "to_review" | null;
  clientName: string | null;
  from: string;
  id: string;
  previewText: string;
  receivedAt: string;
  subject: string;
}

export interface DashboardTodayRequestItem {
  changeType: "created" | "updated";
  clientName: string;
  createdAt: string;
  id: string;
  priority: RequestOverviewListItem["priority"];
  status: RequestOverviewListItem["status"];
  title: string;
  type: string;
  updatedAt: string;
}

export interface DashboardTodayTaskItem {
  changeType: "created" | "updated";
  createdAt: string | null;
  dueAt: string | null;
  id: string;
  priority: string | null;
  requestId: string | null;
  requestTitle: string | null;
  status: string | null;
  title: string;
  updatedAt: string | null;
}

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
  todayEmails: DashboardTodayEmailItem[];
  todayRequests: DashboardTodayRequestItem[];
  todaySummary: DashboardDailySummaryPreview | null;
  todayTasks: DashboardTodayTaskItem[];
  unassignedRequests: RequestOverviewListItem[];
  urgentDeadlines: DeadlineListItem[];
}
