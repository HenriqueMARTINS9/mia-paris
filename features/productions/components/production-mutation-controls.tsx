"use client";

import { ProductionEditForm } from "@/features/productions/components/production-edit-form";
import type { ProductionDetailItem } from "@/features/productions/types";

export function ProductionMutationControls({
  production,
}: Readonly<{ production: ProductionDetailItem }>) {
  return <ProductionEditForm production={production} />;
}
