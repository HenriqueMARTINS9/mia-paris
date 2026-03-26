import { Badge } from "@/components/ui/badge";
import {
  productionStageMeta,
  requestPriorityMeta,
  requestStatusMeta,
} from "@/features/requests/metadata";
import type {
  ProductionStage,
  RequestPriority,
  RequestStatus,
} from "@/features/requests/types";
import { cn } from "@/lib/utils";

const statusTone: Record<RequestStatus, string> = {
  new: "border-[rgba(202,142,85,0.18)] bg-[rgba(202,142,85,0.12)] text-[var(--accent)]",
  qualification:
    "border-primary/[0.15] bg-primary/[0.08] text-primary",
  costing:
    "border-[rgba(58,88,122,0.18)] bg-[rgba(58,88,122,0.08)] text-[#42566b]",
  awaiting_validation:
    "border-[rgba(95,78,145,0.15)] bg-[rgba(95,78,145,0.08)] text-[#5f4e91]",
  approved:
    "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.1)] text-[var(--success)]",
  in_production:
    "border-[rgba(18,92,120,0.15)] bg-[rgba(18,92,120,0.08)] text-[#125c78]",
};

const priorityTone: Record<RequestPriority, string> = {
  critical:
    "border-destructive/[0.18] bg-destructive/10 text-destructive",
  high:
    "border-[rgba(202,142,85,0.18)] bg-[rgba(202,142,85,0.12)] text-[var(--accent)]",
  normal: "border-border bg-white/65 text-muted-foreground",
};

const stageTone: Record<ProductionStage, string> = {
  brief: "border-primary/[0.15] bg-primary/[0.08] text-primary",
  sourcing:
    "border-[rgba(58,88,122,0.18)] bg-[rgba(58,88,122,0.08)] text-[#42566b]",
  sampling:
    "border-[rgba(95,78,145,0.15)] bg-[rgba(95,78,145,0.08)] text-[#5f4e91]",
  approved:
    "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.1)] text-[var(--success)]",
  production:
    "border-[rgba(18,92,120,0.15)] bg-[rgba(18,92,120,0.08)] text-[#125c78]",
};

interface RequestStatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

interface RequestPriorityBadgeProps {
  priority: RequestPriority;
  className?: string;
}

interface ProductionStageBadgeProps {
  stage: ProductionStage;
  className?: string;
}

export function RequestStatusBadge({
  status,
  className,
}: Readonly<RequestStatusBadgeProps>) {
  return (
    <Badge className={cn(statusTone[status], className)}>
      {requestStatusMeta[status].label}
    </Badge>
  );
}

export function RequestPriorityBadge({
  priority,
  className,
}: Readonly<RequestPriorityBadgeProps>) {
  return (
    <Badge className={cn(priorityTone[priority], className)}>
      {requestPriorityMeta[priority].label}
    </Badge>
  );
}

export function ProductionStageBadge({
  stage,
  className,
}: Readonly<ProductionStageBadgeProps>) {
  return (
    <Badge className={cn(stageTone[stage], className)}>
      {productionStageMeta[stage].label}
    </Badge>
  );
}
