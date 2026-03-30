import Link from "next/link";
import { ArrowUpRight, ListTodo } from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import type { TaskListItem } from "@/features/tasks/types";
import { formatDateTime } from "@/lib/utils";

export function MobileUrgentTasksCard({
  tasks,
}: Readonly<{ tasks: TaskListItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Tâches urgentes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.slice(0, 3).map((task) => (
          <Link
            key={task.id}
            href="/taches"
            className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 p-3.5"
          >
            <p className="line-clamp-2 font-semibold">{task.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <TaskStatusBadge status={task.status} className="w-fit" />
              <RequestPriorityBadge priority={task.priority} className="w-fit" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {task.owner} · {task.dueAt ? formatDateTime(task.dueAt) : "Sans date"}
            </p>
          </Link>
        ))}

        <Link
          href="/taches"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Voir les tâches
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
