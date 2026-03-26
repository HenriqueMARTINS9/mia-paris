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
  createdAt: string | null;
  updatedAt: string | null;
  isBlocked: boolean;
}

export interface ProductionsPageData {
  productions: ProductionListItem[];
  error: string | null;
}

export type ProductionMutationField =
  | "status"
  | "risk"
  | "schedule"
  | "blocking_reason";

export interface ProductionMutationResult {
  ok: boolean;
  field: ProductionMutationField;
  message: string;
}
