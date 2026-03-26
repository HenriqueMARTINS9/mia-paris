import { Badge } from "@/components/ui/badge";
import { taskStatusMeta } from "@/features/tasks/metadata";
import type { TaskStatus } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

const taskStatusTone: Record<TaskStatus, string> = {
  todo: "border-primary/[0.15] bg-primary/[0.08] text-primary",
  in_progress:
    "border-[rgba(18,92,120,0.15)] bg-[rgba(18,92,120,0.08)] text-[#125c78]",
  blocked:
    "border-destructive/[0.18] bg-destructive/10 text-destructive",
  done:
    "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.1)] text-[var(--success)]",
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({
  status,
  className,
}: Readonly<TaskStatusBadgeProps>) {
  return (
    <Badge className={cn(taskStatusTone[status], className)}>
      {taskStatusMeta[status].label}
    </Badge>
  );
}
