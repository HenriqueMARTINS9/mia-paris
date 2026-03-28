import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import type { TaskListItem } from "@/features/tasks/types";
import { formatDateTime } from "@/lib/utils";

export function OverdueTasksPanel({
  tasks,
}: Readonly<{ tasks: TaskListItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle>Tâches urgentes</CardTitle>
        </div>
        <CardDescription>
          Retards à résorber ou actions à lancer dans les prochaines heures.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{task.title}</p>
                    <TaskStatusBadge status={task.status} className="normal-case tracking-normal" />
                    <RequestPriorityBadge
                      priority={task.priority}
                      className="normal-case tracking-normal"
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {task.taskTypeLabel} · {task.clientName}
                  </p>
                  <p className="mt-1 text-sm text-foreground/80">{task.owner}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{task.dueAt ? formatDateTime(task.dueAt) : "Sans date"}</p>
                  {task.requestId ? (
                    <Link
                      href={`/requests/${task.requestId}`}
                      className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
                    >
                      Demande
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune tâche urgente ou en retard pour le moment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
