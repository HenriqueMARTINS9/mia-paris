import type { ProductionFormOptions } from "@/features/productions/types";
import type { RequestAssigneeOption } from "@/features/requests/types";

export interface ValidationFormOptions {
  assignees: RequestAssigneeOption[];
  productionOptions: ProductionFormOptions;
}

export interface ValidationMutationResult {
  message: string;
  ok: boolean;
  validationId?: string | null;
}
