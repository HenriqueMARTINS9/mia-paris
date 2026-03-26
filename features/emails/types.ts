import type {
  RequestLinkOption,
  RequestPriority,
} from "@/features/requests/types";

export type EmailProcessingStatus = "new" | "review" | "processed";

export interface EmailQualificationFields {
  actionExpected: string | null;
  clientName: string | null;
  deadline: string | null;
  department: string | null;
  priority: RequestPriority;
  requestType: string | null;
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

export interface EmailsPageData {
  emails: EmailListItem[];
  error: string | null;
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
