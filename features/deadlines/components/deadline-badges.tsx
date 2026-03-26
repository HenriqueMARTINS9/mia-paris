import { Badge } from "@/components/ui/badge";
import { deadlineStatusMeta } from "@/features/deadlines/metadata";
import type { DeadlineStatus } from "@/features/deadlines/types";
import { cn } from "@/lib/utils";

const deadlineStatusTone: Record<DeadlineStatus, string> = {
  open:
    "border-destructive/[0.18] bg-destructive/10 text-destructive",
  in_progress:
    "border-[rgba(202,142,85,0.18)] bg-[rgba(202,142,85,0.12)] text-[var(--accent)]",
  done:
    "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.1)] text-[var(--success)]",
};

interface DeadlineStatusBadgeProps {
  status: DeadlineStatus;
  className?: string;
}

export function DeadlineStatusBadge({
  status,
  className,
}: Readonly<DeadlineStatusBadgeProps>) {
  return (
    <Badge className={cn(deadlineStatusTone[status], className)}>
      {deadlineStatusMeta[status].label}
    </Badge>
  );
}
