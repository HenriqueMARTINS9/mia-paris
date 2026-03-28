import { ProductionDetailsPanel } from "@/features/productions/components/production-details-panel";
import type { ProductionDetailItem } from "@/features/productions/types";

interface ProductionDetailPanelProps {
  mode?: "desktop" | "sheet";
  production: ProductionDetailItem | null;
}

export function ProductionDetailPanel({
  mode = "desktop",
  production,
}: Readonly<ProductionDetailPanelProps>) {
  return <ProductionDetailsPanel mode={mode} production={production} />;
}
