import type {
  RequestLinkOption,
  RequestPriority,
} from "@/features/requests/types";

export type EmailProcessingStatus = "new" | "review" | "processed";

export interface EmailQualificationFields {
  aiConfidence: number | null;
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
  requestType: string | null;
  requestedAction: string | null;
  summary: string | null;
}

export interface EmailClassificationSummary {
  confidence: number | null;
  raw: Record<string, unknown> | null;
  simplifiedJson: Record<string, unknown> | null;
  suggestedFields: EmailQualificationFields;
}

export interface EmailListItem {
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
  classification: EmailClassificationSummary;
  isUnread: boolean;
}

export interface EmailQualificationOption {
  id: string;
  label: string;
  secondary: string | null;
  clientId?: string | null;
}

export interface EmailQualificationOptions {
  clients: EmailQualificationOption[];
  contacts: EmailQualificationOption[];
  models: EmailQualificationOption[];
  productDepartments: EmailQualificationOption[];
}

export interface EmailsPageData {
  emails: EmailListItem[];
  error: string | null;
  qualificationOptions: EmailQualificationOptions;
  qualificationOptionsError: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError: string | null;
}

export type EmailMutationField =
  | "status"
  | "request_link"
  | "request_creation";

export interface EmailMutationResult {
  ok: boolean;
  field: EmailMutationField;
  message: string;
  requestId?: string | null;
}
