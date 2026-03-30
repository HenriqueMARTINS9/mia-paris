import type { RequestPriority } from "@/features/requests/types";

export type ReplyDraftType =
  | "acknowledgement"
  | "ownership"
  | "missing_items"
  | "deadline_confirmation"
  | "supplier_followup"
  | "validation_feedback"
  | "waiting_validation"
  | "production_update"
  | "logistics_response";

export type ReplyDraftSourceType = "email" | "request";

export interface ReplyDraftContext {
  clientName: string | null;
  dueAt: string | null;
  historicalSignals?: string[];
  linkedRequestTitle?: string | null;
  productionLabel?: string | null;
  productionRisk?: string | null;
  productionStatus?: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  requestPriority: RequestPriority | null;
  requestReference?: string | null;
  requestStatus: string | null;
  requestType: string | null;
  requestedAction: string | null;
  requestId: string | null;
  sourceId: string;
  sourceType: ReplyDraftSourceType;
  subject: string;
  summary: string | null;
}

export interface ReplyDraft {
  body: string;
  disclaimer: string;
  suggestedRecipients: string[];
  subject: string;
  type: ReplyDraftType;
}

export interface SavedReplyDraft {
  body: string;
  replyType: ReplyDraftType;
  subject: string;
  updatedAt: string | null;
}

export interface ReplyDraftHistoryItem {
  action: "generated" | "saved";
  bodyPreview: string | null;
  createdAt: string;
  id: string;
  replyType: ReplyDraftType | null;
  subject: string | null;
}

export interface GenerateReplyDraftInput {
  context: ReplyDraftContext;
  replyType: ReplyDraftType;
}

export interface GenerateReplyDraftResult {
  draft: ReplyDraft | null;
  message: string;
  ok: boolean;
}

export interface SaveReplyDraftInput {
  body: string;
  context: ReplyDraftContext;
  replyType: ReplyDraftType;
  subject: string;
}

export interface SaveReplyDraftResult {
  message: string;
  ok: boolean;
}
