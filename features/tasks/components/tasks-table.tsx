"use client";

import { ArrowUpRight, CalendarClock, Package2 } from "lucide-react";
import Link from "next/link";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import type { TaskListItem } from "@/features/tasks/types";
import { cn, formatDate, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface TasksTableProps {
  tasks: TaskListItem[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function TasksTable({
  tasks,
  selectedTaskId,
  onSelectTask,
}: Readonly<TasksTableProps>) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/40 px-6 py-12 text-center">
        <p className="text-base font-semibold">Aucune tâche trouvée</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste les filtres ou crée une tâche manuelle pour alimenter le suivi.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-black/[0.06] md:hidden">
        {tasks.map((task) => {
          const isSelected = task.id === selectedTaskId;

          return (
            <button
              key={task.id}
              type="button"
              className={cn(
                "block w-full px-4 py-4 text-left transition hover:bg-[#faf7f1]",
                isSelected && "bg-primary/[0.06]",
              )}
              onClick={() => onSelectTask(task.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold tracking-tight">{task.title}</p>
                    {task.isOverdue ? <Badge variant="destructive">Retard</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{task.taskTypeLabel}</p>
                </div>
                <Badge variant="outline" className="normal-case tracking-normal">
                  {task.taskTypeLabel}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <RequestPriorityBadge priority={task.priority} className="w-fit" />
                <TaskStatusBadge status={task.status} className="w-fit" />
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Client
                  </p>
                  <p className="mt-1 font-semibold">{task.clientName}</p>
                  <p className="mt-1 text-muted-foreground">
                    {task.productionStatus ?? "Sans production"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Demande liée
                  </p>
                  <p className="mt-1 font-semibold">{task.requestTitle}</p>
                  <p className="mt-1 text-muted-foreground">
                    {task.requestLabel ?? "Aucune demande liée"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Responsable
                  </p>
                  <p className="mt-1 font-semibold">{task.owner}</p>
                  <p className="mt-1 text-muted-foreground">
                    {task.orderNumber ?? "Sans ordre de prod"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Échéance
                  </p>
                  <p className="mt-1 font-semibold">
                    {task.dueAt ? getDeadlineLabel(task.dueAt) : "Sans date"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {task.dueAt ? formatDate(task.dueAt) : "À planifier"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {formatDateTime(
                    task.updatedAt ?? task.createdAt ?? new Date().toISOString(),
                  )}
                </span>
                <Link
                  href={`/taches/${task.id}`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                >
                  Ouvrir
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[250px]">Titre</TableHead>
              <TableHead className="min-w-[125px]">Type</TableHead>
              <TableHead className="min-w-[155px]">Client</TableHead>
              <TableHead className="min-w-[190px]">Demande liée</TableHead>
              <TableHead className="min-w-[135px]">Priorité</TableHead>
              <TableHead className="min-w-[135px]">Statut</TableHead>
              <TableHead className="min-w-[150px]">Responsable</TableHead>
              <TableHead className="min-w-[155px] text-right">Échéance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const isSelected = task.id === selectedTaskId;

              return (
                <TableRow
                  key={task.id}
                  className={cn("cursor-pointer", isSelected && "bg-primary/[0.06]")}
                  onClick={() => onSelectTask(task.id)}
                >
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                        <Package2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="line-clamp-2 break-words font-semibold tracking-tight">
                            {task.title}
                          </p>
                          {task.isOverdue ? (
                            <Badge variant="destructive">Retard</Badge>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDateTime(task.updatedAt ?? task.createdAt ?? new Date().toISOString())}</span>
                          <Link
                            href={`/taches/${task.id}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Ouvrir
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {task.taskTypeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{task.clientName}</p>
                    <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {task.productionStatus ?? "Sans production"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2 break-words font-semibold">{task.requestTitle}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {task.requestLabel ?? "Aucune demande liée"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <RequestPriorityBadge priority={task.priority} className="w-fit" />
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} className="w-fit" />
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{task.owner}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {task.orderNumber ?? "Sans ordre de prod"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-col items-end gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        {task.dueAt ? getDeadlineLabel(task.dueAt) : "Sans date"}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.dueAt ? formatDate(task.dueAt) : "À planifier"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
