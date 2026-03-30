import Link from "next/link";
import { ListTodo } from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import type { TaskListItem } from "@/features/tasks/types";
import { formatDateTime } from "@/lib/utils";

export function TodayTasksPanel({
  tasks,
}: Readonly<{
  tasks: TaskListItem[];
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Tâches du jour</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <Link
              key={task.id}
              href={task.requestId ? `/requests/${task.requestId}` : "/taches"}
              className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{task.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {task.owner} · {task.taskTypeLabel}
                  </p>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <RequestPriorityBadge priority={task.priority} />
                {task.dueAt ? <span>{formatDateTime(task.dueAt)}</span> : null}
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucune tâche prioritaire aujourd’hui.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
