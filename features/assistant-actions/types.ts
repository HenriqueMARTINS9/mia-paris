import type { AppPermission } from "@/features/auth/permissions";
import type { DeadlineListItem, DeadlinePriority } from "@/features/deadlines/types";
import type { EmailListItem } from "@/features/emails/types";
import type { ProductionMutationResult } from "@/features/productions/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { ReplyDraft, ReplyDraftContext, ReplyDraftType } from "@/features/replies/types";
import type {
  RequestMutationResult,
  RequestOverviewListItem,
  RequestPriority,
} from "@/features/requests/types";
import type { AssistantTaskType } from "@/features/tasks/task-types";

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
  | "createDeadline"
  | "createTask"
  | "getBlockedProductions"
  | "getHighRiskProductions"
  | "getRequestsWithoutAssignee"
  | "getTodayUrgencies"
  | "getUnprocessedEmails"
  | "prepareReplyDraft"
  | "searchClientHistory"
  | "searchModelHistory";

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

export interface AssistantCreateTaskInput {
  assignedUserId?: string | null;
  dueAt?: string | null;
  priority: RequestPriority;
  requestId?: string | null;
  source?: AssistantActionSource;
  taskType: AssistantTaskType;
  title: string;
}

export interface AssistantCreateDeadlineInput {
  deadlineAt: string;
  label: string;
  priority: DeadlinePriority;
  requestId?: string | null;
  source?: AssistantActionSource;
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

export interface AssistantPrepareReplyDraftResult {
  draft: ReplyDraft | null;
  message: string;
  ok: boolean;
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
export type AssistantRequestBacklogList = RequestOverviewListItem[];
export type AssistantProductionList = ProductionListItem[];

export type AssistantCreateTaskResult = RequestMutationResult;
export type AssistantCreateDeadlineResult = RequestMutationResult;
export type AssistantAddNoteToRequestResult = RequestMutationResult;
export type AssistantAddNoteToProductionResult = ProductionMutationResult;
