"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MobileStatusActionSheet } from "@/components/crm/mobile-status-action-sheet";
import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import { TaskMutationControls } from "@/features/tasks/components/task-mutation-controls";
import type { RequestAssigneeOption } from "@/features/requests/types";
import type { TaskListItem } from "@/features/tasks/types";
import { formatDate, getDeadlineLabel } from "@/lib/utils";

interface MobileTaskCardProps {
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  onOpen: () => void;
  task: TaskListItem;
}

export function MobileTaskCard({
  assignees,
  assigneesError = null,
  onOpen,
  task,
}: Readonly<MobileTaskCardProps>) {
  return (
    <Card className="rounded-[1.35rem]">
      <CardContent className="p-4">
        <div
          role="button"
          tabIndex={0}
          className="grid gap-4 text-left"
          onClick={onOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen();
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 break-words text-[1.02rem] font-semibold tracking-tight text-foreground">
                {task.title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {task.taskTypeLabel} · {task.clientName}
              </p>
            </div>
            <div className="shrink-0">
              <MobileStatusActionSheet
                title="Actions tâche"
                description="Changer le statut, l’assignation ou l’échéance en mobilité."
              >
                <div className="grid gap-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/taches/${task.id}`}>
                      Ouvrir la fiche
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <TaskMutationControls
                    task={task}
                    assignees={assignees}
                    assigneesError={assigneesError}
                  />
                </div>
              </MobileStatusActionSheet>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <RequestPriorityBadge priority={task.priority} className="w-fit" />
            <TaskStatusBadge status={task.status} className="w-fit" />
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Responsable
              </p>
              <p className="mt-2 font-semibold">{task.owner}</p>
              <p className="mt-1 text-muted-foreground">
                {task.requestLabel ?? "Sans dossier"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Échéance
              </p>
              <p className="mt-2 font-semibold">
                {task.dueAt ? getDeadlineLabel(task.dueAt) : "Sans date"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {task.dueAt ? formatDate(task.dueAt) : "À planifier"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
