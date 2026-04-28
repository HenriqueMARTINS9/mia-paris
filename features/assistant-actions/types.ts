import type { AppPermission } from "@/features/auth/permissions";
import type { DeadlineListItem, DeadlinePriority } from "@/features/deadlines/types";
import type {
  WriteDailySummaryInput,
  WriteDailySummaryResult,
} from "@/features/daily-summaries/types";
import type {
  EmailInboxBucket,
  EmailListItem,
  EmailQualificationOption,
  GmailSyncMode,
  GmailSyncResult,
} from "@/features/emails/types";
import type { ProductionMutationResult } from "@/features/productions/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { ReplyDraft, ReplyDraftContext, ReplyDraftType } from "@/features/replies/types";
import type {
  RequestMutationResult,
  RequestOverviewListItem,
  RequestPriority,
  RequestStatus,
} from "@/features/requests/types";
import type { AssistantTaskType } from "@/features/tasks/task-types";
import type { TaskStatus } from "@/features/tasks/types";

export type AssistantActionKind = "read" | "write";

export type AssistantActionExposure = "safe" | "restricted";

export type AssistantActionSource = "assistant" | "system" | "ui";

export type AssistantActionCode =
  | "error"
  | "forbidden"
  | "not_found"
  | "ok"
  | "validation_error";

export type AssistantActionName =
  | "addNoteToProduction"
  | "addNoteToRequest"
  | "assignClientToEmail"
  | "attachEmailToRequest"
  | "createClient"
  | "createDeadline"
  | "createRequest"
  | "createTask"
  | "getEmailActivity"
  | "getBlockedProductions"
  | "getHighRiskProductions"
  | "getRequestsWithoutAssignee"
  | "getTodayUrgencies"
  | "getUnprocessedEmails"
  | "prepareReplyDraft"
  | "runEmailOpsCycle"
  | "runGmailSync"
  | "setEmailInboxBucket"
  | "searchClientHistory"
  | "searchModelHistory"
  | "updateRequest"
  | "updateTask"
  | "writeDailySummary";

export interface AssistantActionDefinition {
  command: AssistantActionName;
  description: string;
  example: string;
  exposure: AssistantActionExposure;
  key: string;
  kind: AssistantActionKind;
  label: string;
  permission?: AppPermission;
  safeForOpenClaw: boolean;
}

export interface AssistantActionResult<TData> {
  code: AssistantActionCode;
  data: TData | null;
  message: string;
  ok: boolean;
}

export interface AssistantHistorySearchResult {
  links: Array<{
    href: string;
    label: string;
  }>;
  signals: string[];
  summary: string;
}

export interface AssistantEmailActivityInput {
  from: string;
  limit?: number | null;
  to: string;
}

export interface AssistantEmailActivityItem {
  emailId: string;
  fromEmail: string | null;
  fromName: string | null;
  receivedAt: string;
  replyAt: string | null;
  replyDelayMinutes: number | null;
  replyMessageId: string | null;
  replyStatus: "answered" | "not_found";
  subject: string;
  threadId: string | null;
}

export interface AssistantEmailActivityReport {
  generatedAt: string;
  items: AssistantEmailActivityItem[];
  range: {
    from: string;
    to: string;
  };
  totalAnswered: number;
  totalReceived: number;
  totalUnanswered: number;
  truncated: boolean;
}

export interface AssistantCreateTaskInput {
  assignedUserId?: string | null;
  dueAt?: string | null;
  priority: RequestPriority;
  requestId?: string | null;
  source?: AssistantActionSource;
  taskType: AssistantTaskType;
  title: string;
}

export interface AssistantCreateRequestInput {
  assignedUserId?: string | null;
  clientId?: string | null;
  contactId?: string | null;
  dueAt?: string | null;
  emailIds?: string[] | null;
  modelId?: string | null;
  priority: RequestPriority;
  productDepartmentId?: string | null;
  requestType: string;
  requestedAction?: string | null;
  source?: AssistantActionSource;
  status?: RequestStatus;
  summary?: string | null;
  title: string;
}

export interface AssistantCreateDeadlineInput {
  deadlineAt: string;
  label: string;
  priority: DeadlinePriority;
  requestId?: string | null;
  source?: AssistantActionSource;
}

export interface AssistantCreateClientInput {
  code?: string | null;
  name: string;
  source?: AssistantActionSource;
}

export interface AssistantAssignClientToEmailInput {
  clientId: string;
  emailId: string;
  source?: AssistantActionSource;
}

export interface AssistantAttachEmailToRequestInput {
  emailId: string;
  requestId: string;
  source?: AssistantActionSource;
}

export interface AssistantUpdateTaskInput {
  assignedUserId?: string | null;
  dueAt?: string | null;
  priority?: RequestPriority | null;
  requestId?: string | null;
  source?: AssistantActionSource;
  status?: TaskStatus | null;
  taskId: string;
}

export interface AssistantUpdateRequestInput {
  assignedUserId?: string | null;
  priority?: RequestPriority | null;
  requestId: string;
  requestType?: string | null;
  source?: AssistantActionSource;
  status?: RequestStatus | null;
}

export interface AssistantAddRequestNoteInput {
  note: string;
  requestId: string;
  source?: AssistantActionSource;
}

export interface AssistantAddProductionNoteInput {
  notes: string | null;
  productionId: string;
  source?: AssistantActionSource;
}

export interface AssistantPrepareReplyDraftInput {
  context: ReplyDraftContext;
  replyType: ReplyDraftType;
  source?: AssistantActionSource;
}

export interface AssistantRunGmailSyncInput {
  limit?: number | null;
  source?: AssistantActionSource;
  syncMode?: GmailSyncMode | null;
}

export interface AssistantRunEmailOpsCycleInput {
  attachToExistingRequests?: boolean | null;
  createRequests?: boolean | null;
  limit?: number | null;
  skipSync?: boolean | null;
  source?: AssistantActionSource;
  syncLimit?: number | null;
  syncMode?: GmailSyncMode | null;
  updateRequests?: boolean | null;
  updateTasks?: boolean | null;
  writeSummary?: boolean | null;
}

export interface AssistantSetEmailInboxBucketInput {
  bucket: EmailInboxBucket;
  confidence?: number | null;
  emailId: string;
  reason?: string | null;
  source?: AssistantActionSource;
}

export type AssistantWriteDailySummaryInput = WriteDailySummaryInput;

export interface AssistantPrepareReplyDraftResult {
  draft: ReplyDraft | null;
  message: string;
  ok: boolean;
}

export interface AssistantEmailOpsCycleItem {
  bucket: EmailInboxBucket | null;
  clientName: string | null;
  dueAt: string | null;
  emailId: string;
  from: string;
  priority: RequestPriority | null;
  reason: string | null;
  recommendedAction: string | null;
  requestType: string | null;
  status: "classified" | "error" | "skipped";
  subject: string;
}

export interface AssistantRunEmailOpsCycleResult {
  clientClassifiedCount: number;
  crmEnrichedCount: number;
  deadlineCreatedCount: number;
  errorCount: number;
  importantCount: number;
  items: AssistantEmailOpsCycleItem[];
  processedCount: number;
  promotionalCount: number;
  requestAttachedCount: number;
  requestCreatedCount: number;
  requestUpdatedCount: number;
  skippedCount: number;
  summaryWrittenCount: number;
  sync: GmailSyncResult;
  taskCreatedCount: number;
  taskUpdatedCount: number;
  toReviewCount: number;
}

export interface AssistantWorkspacePreviewCard {
  count: number;
  description: string;
  href: string;
  id: string;
  label: string;
}

export interface AssistantWorkspaceData {
  actions: AssistantActionDefinition[];
  error: string | null;
  previews: AssistantWorkspacePreviewCard[];
}

export type AssistantUrgencyList = DeadlineListItem[];
export type AssistantUnprocessedEmailList = EmailListItem[];
export type AssistantEmailActivityData = AssistantEmailActivityReport;
export type AssistantRequestBacklogList = RequestOverviewListItem[];
export type AssistantProductionList = ProductionListItem[];

export type AssistantCreateTaskResult = RequestMutationResult;
export type AssistantCreateRequestResult = RequestMutationResult & {
  attachedEmailCount?: number;
  failedEmailAttachCount?: number;
  requestId?: string | null;
};
export type AssistantCreateDeadlineResult = RequestMutationResult;
export type AssistantUpdateTaskResult = RequestMutationResult & {
  updatedFields?: string[];
};
export type AssistantUpdateRequestResult = RequestMutationResult & {
  updatedFields?: string[];
};
export type AssistantCreateClientResult = {
  client: EmailQualificationOption | null;
  clientId: string | null;
  message: string;
  ok: boolean;
};
export type AssistantAddNoteToRequestResult = RequestMutationResult;
export type AssistantAddNoteToProductionResult = ProductionMutationResult;
export type AssistantRunGmailSyncResult = GmailSyncResult;
export type AssistantRunEmailOpsCycleData = AssistantRunEmailOpsCycleResult;
export type AssistantWriteDailySummaryResult = WriteDailySummaryResult;
