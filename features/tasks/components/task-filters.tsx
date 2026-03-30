"use client";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPriorityMeta } from "@/features/requests/metadata";
import { taskStatusMeta } from "@/features/tasks/metadata";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedClient: string;
  onClientChange: (value: string) => void;
  selectedStatus: "all" | TaskStatus;
  onStatusChange: (value: "all" | TaskStatus) => void;
  selectedPriority: "all" | TaskPriority;
  onPriorityChange: (value: "all" | TaskPriority) => void;
  clients: string[];
}

const priorityOptions: Array<"all" | TaskPriority> = [
  "all",
  "critical",
  "high",
  "normal",
];

const statusOptions: Array<"all" | TaskStatus> = [
  "all",
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export function TaskFilters({
  search,
  onSearchChange,
  selectedClient,
  onClientChange,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  clients,
}: Readonly<TaskFiltersProps>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Recherche</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Backlog
              </p>
            </div>
            <div className="relative max-w-none xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Rechercher par titre, client, demande liée ou responsable"
                className="h-11 rounded-[1rem] border-black/[0.06] bg-white pl-10 shadow-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Clients</Badge>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Affectation
                </p>
              </div>
              <Badge variant="outline" className="bg-[#fbf8f2]">
                {clients.length} compte{clients.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex w-max gap-2">
                {["all", ...clients].map((client) => (
                  <Button
                    key={client}
                    type="button"
                    size="sm"
                    variant={selectedClient === client ? "default" : "outline"}
                    className="rounded-full border-black/[0.06] bg-white shadow-none"
                    onClick={() => onClientChange(client)}
                  >
                    {client === "all" ? "Tous les clients" : client}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[1.25rem] border border-black/[0.06] bg-[#fbf8f2] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline">Statut</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Exécution
              </p>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex w-max gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatusChange(status)}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                      selectedStatus === status
                        ? "border-primary/[0.14] bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(20,79,74,0.04)]"
                        : "border-black/[0.06] bg-white text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {status === "all" ? "Tous" : taskStatusMeta[status].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-black/[0.06] bg-[#fbf8f2] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline">Priorité</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Charge
              </p>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex w-max gap-2">
                {priorityOptions.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => onPriorityChange(priority)}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                      selectedPriority === priority
                        ? "border-primary/[0.14] bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(20,79,74,0.04)]"
                        : "border-black/[0.06] bg-white text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {priority === "all"
                      ? "Toutes"
                      : requestPriorityMeta[priority].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
