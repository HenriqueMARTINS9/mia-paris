import type { DocumentFormOptions } from "@/features/documents/types";
import type {
  RequestLinkOption,
  RequestPriority,
} from "@/features/requests/types";
import type { RequestAssigneeOption } from "@/features/requests/types";

export type EmailProcessingStatus = "new" | "review" | "processed";

export type EmailPageSize = 10 | 15;

export type EmailQualificationRequestType =
  | "price_request"
  | "deadline_request"
  | "tds_request"
  | "swatch_request"
  | "trim_validation"
  | "production_followup"
  | "logistics"
  | "development"
  | "compliance";

export interface EmailQualificationDraft {
  aiConfidence: number | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  clientId: string | null;
  clientName: string | null;
  contactId: string | null;
  contactName: string | null;
  dueAt: string | null;
  modelId: string | null;
  modelName: string | null;
  priority: RequestPriority;
  productDepartmentId: string | null;
  productDepartmentName: string | null;
  requestType: EmailQualificationRequestType | string | null;
  requestedAction: string | null;
  requiresHumanValidation: boolean;
  summary: string | null;
  title: string;
}

export type EmailQualificationFields = EmailQualificationDraft;

export interface EmailClassificationResult {
  confidence: number | null;
  raw: Record<string, unknown> | null;
  source: "stored" | "rules_v1";
  simplifiedJson: Record<string, unknown> | null;
  suggestedFields: EmailQualificationDraft;
}

export interface EmailAttachmentListItem {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string | null;
}

export interface EmailListItem {
  attachments: EmailAttachmentListItem[];
  bodyHtml: string | null;
  id: string;
  threadId: string | null;
  threadLabel: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  receivedAt: string;
  previewText: string;
  bodyText: string | null;
  status: EmailProcessingStatus;
  rawStatus: string;
  clientId: string | null;
  clientName: string;
  detectedType: string | null;
  linkedRequestId: string | null;
  linkedRequestLabel: string | null;
  summary: string | null;
  confidence: number | null;
  classification: EmailClassificationResult;
  isUnread: boolean;
}

export interface EmailQualificationOption {
  id: string;
  label: string;
  secondary: string | null;
  clientId?: string | null;
}

export interface EmailQualificationOptions {
  assignees: RequestAssigneeOption[];
  clients: EmailQualificationOption[];
  contacts: EmailQualificationOption[];
  models: EmailQualificationOption[];
  productDepartments: EmailQualificationOption[];
}

export interface ExistingRequestMatch extends RequestLinkOption {
  requestType?: string | null;
  updatedAt?: string | null;
}

export interface GmailInboxStatus {
  connected: boolean;
  emailAddress: string | null;
  error: string | null;
  inboxId: string | null;
  lastSyncedAt: string | null;
}

export type GmailSyncMode = "initial" | "incremental";

export interface EmailStatusCounts {
  new: number;
  open: number;
  processed: number;
  qualified: number;
  review: number;
  total: number;
}

export interface EmailsPageFilters {
  search: string;
  selectedStatus: "all" | EmailProcessingStatus;
}

export interface EmailsPagination {
  page: number;
  perPage: EmailPageSize;
  totalItems: number;
  totalPages: number;
}

export interface EmailsPageData {
  counts: EmailStatusCounts;
  documentOptions: DocumentFormOptions;
  documentOptionsError: string | null;
  emails: EmailListItem[];
  error: string | null;
  filters: EmailsPageFilters;
  gmailInbox: GmailInboxStatus;
  pagination: EmailsPagination;
  qualificationOptions: EmailQualificationOptions;
  qualificationOptionsError: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError: string | null;
  selectedEmailId: string | null;
}

export interface EmailInboxSnapshot {
  counts: Pick<EmailStatusCounts, "open" | "review" | "total">;
  error: string | null;
  gmailInbox: GmailInboxStatus;
  latestEmails: EmailListItem[];
}

export type EmailMutationField =
  | "status"
  | "request_link"
  | "request_creation";

export interface CreateRequestFromEmailPayload {
  emailId: string;
  qualification: EmailQualificationDraft;
}

export interface RequestAutoTaskRule {
  requestType: EmailQualificationRequestType | string;
  taskTitle: string;
  taskType: string;
}

export interface GmailSyncResult {
  connectedInboxEmail: string | null;
  errorCount?: number;
  ignoredMessages: number;
  importedMessages: number;
  importedThreads: number;
  message: string;
  ok: boolean;
  queryUsed?: string | null;
  runId?: string | null;
  syncMode?: GmailSyncMode;
  syncedAt?: string | null;
}

export interface EmailMutationResult {
  ok: boolean;
  field: EmailMutationField;
  message: string;
  requestId?: string | null;
}
