import { ProductionDetailsPanel } from "@/features/productions/components/production-details-panel";
import type { ProductionDetailItem, ProductionListItem } from "@/features/productions/types";

interface ProductionDetailPanelProps {
  allProductions?: ProductionListItem[];
  mode?: "desktop" | "sheet";
  production: ProductionDetailItem | null;
}

export function ProductionDetailPanel({
  allProductions = [],
  mode = "desktop",
  production,
}: Readonly<ProductionDetailPanelProps>) {
  return (
    <ProductionDetailsPanel
      allProductions={allProductions}
      mode={mode}
      production={production}
    />
  );
}
