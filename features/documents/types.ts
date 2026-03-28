export type DocumentType =
  | "tech_pack"
  | "proto_photo"
  | "price_sheet"
  | "lab_test"
  | "inspection_report"
  | "packing_list"
  | "invoice"
  | "label_artwork"
  | "composition_label"
  | "other";

export interface DocumentRelatedEntityOption {
  id: string;
  label: string;
  secondary: string | null;
  clientId?: string | null;
  modelId?: string | null;
  orderId?: string | null;
  productionId?: string | null;
  requestId?: string | null;
}

export interface DocumentFormOptions {
  models: DocumentRelatedEntityOption[];
  orders: DocumentRelatedEntityOption[];
  productions: DocumentRelatedEntityOption[];
  requests: DocumentRelatedEntityOption[];
}

export interface RelatedEntitySelection {
  modelId: string | null;
  orderId: string | null;
  productionId: string | null;
  requestId: string | null;
}

export interface CreateDocumentFromAttachmentPayload extends RelatedEntitySelection {
  attachmentId: string;
  documentType: DocumentType;
  title: string | null;
}

export interface DocumentActionResult {
  documentId?: string | null;
  message: string;
  ok: boolean;
  productionId?: string | null;
  requestId?: string | null;
}
