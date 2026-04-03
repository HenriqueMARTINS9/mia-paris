"use client";

import { CalendarClock, PackageSearch } from "lucide-react";

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
import { DeadlineStatusBadge } from "@/features/deadlines/components/deadline-badges";
import type { DeadlineListItem } from "@/features/deadlines/types";
import { cn, formatDate, getDeadlineLabel } from "@/lib/utils";

interface DeadlinesTableProps {
  deadlines: DeadlineListItem[];
  selectedDeadlineId: string | null;
  onSelectDeadline: (deadlineId: string) => void;
}

export function DeadlinesTable({
  deadlines,
  selectedDeadlineId,
  onSelectDeadline,
}: Readonly<DeadlinesTableProps>) {
  if (deadlines.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/40 px-6 py-12 text-center">
        <p className="text-base font-semibold">Aucune deadline trouvée</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste les filtres ou crée une deadline manuelle pour démarrer le suivi.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-black/[0.06] md:hidden">
        {deadlines.map((deadline) => {
          const isSelected = deadline.id === selectedDeadlineId;

          return (
            <button
              key={deadline.id}
              type="button"
              className={cn(
                "block w-full px-4 py-4 text-left transition hover:bg-[#faf7f1]",
                isSelected && "bg-primary/[0.06]",
              )}
              onClick={() => onSelectDeadline(deadline.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold tracking-tight">{deadline.label}</p>
                    {deadline.isOverdue ? <Badge variant="destructive">Retard</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {deadline.requestTitle}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-1.5 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {deadline.deadlineAt ? getDeadlineLabel(deadline.deadlineAt) : "Sans date"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <RequestPriorityBadge priority={deadline.priority} className="w-fit" />
                <DeadlineStatusBadge status={deadline.status} className="w-fit" />
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Client
                  </p>
                  <p className="mt-1 font-semibold">{deadline.clientName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Objet lié
                  </p>
                  <p className="mt-1 font-semibold">{deadline.linkedObjectLabel}</p>
                  <p className="mt-1 text-muted-foreground">
                    {deadline.orderNumber ?? deadline.productionStatus ?? "Objet métier"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-1 font-semibold">
                    {deadline.deadlineAt ? formatDate(deadline.deadlineAt) : "À planifier"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[235px]">Label</TableHead>
              <TableHead className="min-w-[155px]">Client</TableHead>
              <TableHead className="min-w-[190px]">Objet lié</TableHead>
              <TableHead className="min-w-[135px]">Priorité</TableHead>
              <TableHead className="min-w-[135px]">Statut</TableHead>
              <TableHead className="min-w-[155px] text-right">Deadline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deadlines.map((deadline) => {
              const isSelected = deadline.id === selectedDeadlineId;

              return (
                <TableRow
                  key={deadline.id}
                  className={cn("cursor-pointer", isSelected && "bg-primary/[0.06]")}
                  onClick={() => onSelectDeadline(deadline.id)}
                >
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                        <PackageSearch className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="line-clamp-2 break-words font-semibold tracking-tight">
                            {deadline.label}
                          </p>
                          {deadline.isOverdue ? (
                            <Badge variant="destructive">Retard</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground">
                          {deadline.requestTitle}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate font-semibold">{deadline.clientName}</p>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2 break-words font-semibold">{deadline.linkedObjectLabel}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {deadline.orderNumber ?? deadline.productionStatus ?? "Objet métier"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <RequestPriorityBadge priority={deadline.priority} className="w-fit" />
                  </TableCell>
                  <TableCell>
                    <DeadlineStatusBadge status={deadline.status} className="w-fit" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-col items-end gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        {deadline.deadlineAt ? getDeadlineLabel(deadline.deadlineAt) : "Sans date"}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {deadline.deadlineAt ? formatDate(deadline.deadlineAt) : "À planifier"}
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
