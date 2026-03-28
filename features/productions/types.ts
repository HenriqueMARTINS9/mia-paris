export type ProductionStatus =
  | "planned"
  | "in_progress"
  | "blocked"
  | "completed";

export type ProductionRisk = "critical" | "high" | "normal" | "low";

export interface ProductionListItem {
  id: string;
  orderId: string | null;
  orderNumber: string;
  clientId: string | null;
  clientName: string;
  modelId: string | null;
  modelName: string;
  requestId: string | null;
  requestTitle: string | null;
  productionMode: string | null;
  productionModeLabel: string;
  status: ProductionStatus;
  rawStatus: string;
  risk: ProductionRisk;
  rawRisk: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  blockingReason: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isBlocked: boolean;
}

export interface ProductionLinkOption {
  id: string;
  label: string;
  secondary: string | null;
  clientId?: string | null;
  modelId?: string | null;
  orderId?: string | null;
  requestId?: string | null;
}

export interface ProductionLinkedRequestItem {
  id: string;
  label: string;
  priority: string | null;
  status: string | null;
}

export interface ProductionLinkedTaskItem {
  id: string;
  title: string;
  dueAt: string | null;
  ownerName: string | null;
  priority: string | null;
  status: string | null;
}

export interface ProductionLinkedDeadlineItem {
  id: string;
  label: string;
  deadlineAt: string | null;
  priority: string | null;
  status: string | null;
}

export interface ProductionLinkedDocumentItem {
  id: string;
  name: string;
  type: string;
  updatedAt: string | null;
  url: string | null;
}

export interface ProductionActivityItem {
  date: string;
  description: string | null;
  id: string;
  title: string;
  type: "production" | "request" | "task" | "deadline" | "document" | "log";
}

export interface ProductionDetailItem extends ProductionListItem {
  linkedDeadlines: ProductionLinkedDeadlineItem[];
  linkedDocuments: ProductionLinkedDocumentItem[];
  linkedRequests: ProductionLinkedRequestItem[];
  linkedTasks: ProductionLinkedTaskItem[];
  history: ProductionActivityItem[];
}

export interface ProductionFormOptions {
  clients: ProductionLinkOption[];
  models: ProductionLinkOption[];
  orders: ProductionLinkOption[];
  requests: ProductionLinkOption[];
}

export interface ProductionsPageData {
  detailsById: Record<string, ProductionDetailItem>;
  formOptions: ProductionFormOptions;
  formOptionsError: string | null;
  productions: ProductionListItem[];
  error: string | null;
}

export type ProductionMutationField =
  | "status"
  | "risk"
  | "schedule"
  | "blocking_reason"
  | "notes"
  | "create";

export interface ProductionMutationResult {
  ok: boolean;
  field: ProductionMutationField;
  message: string;
}
