import { Badge } from "@/components/ui/badge";
import {
  productionRiskMeta,
  productionStatusMeta,
} from "@/features/productions/metadata";
import type {
  ProductionRisk,
  ProductionStatus,
} from "@/features/productions/types";
import { cn } from "@/lib/utils";

const productionStatusTone: Record<ProductionStatus, string> = {
  planned: "border-primary/[0.15] bg-primary/[0.08] text-primary",
  in_progress:
    "border-[rgba(18,92,120,0.15)] bg-[rgba(18,92,120,0.08)] text-[#125c78]",
  blocked: "border-destructive/[0.18] bg-destructive/10 text-destructive",
  completed:
    "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.1)] text-[var(--success)]",
};

const productionRiskTone: Record<ProductionRisk, string> = {
  critical:
    "border-destructive/[0.18] bg-destructive/10 text-destructive",
  high:
    "border-[rgba(202,142,85,0.18)] bg-[rgba(202,142,85,0.12)] text-[var(--accent)]",
  normal: "border-border bg-white/65 text-muted-foreground",
  low: "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.08)] text-[var(--success)]",
};

export function ProductionStatusBadge({
  className,
  status,
}: Readonly<{ className?: string; status: ProductionStatus }>) {
  return (
    <Badge className={cn(productionStatusTone[status], className)}>
      {productionStatusMeta[status].label}
    </Badge>
  );
}

export function RiskBadge({
  className,
  risk,
}: Readonly<{ className?: string; risk: ProductionRisk }>) {
  return (
    <Badge className={cn(productionRiskTone[risk], className)}>
      {productionRiskMeta[risk].label}
    </Badge>
  );
}
