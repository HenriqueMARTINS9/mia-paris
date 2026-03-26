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
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher par titre, client, demande liée ou responsable"
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", ...clients].map((client) => (
              <Button
                key={client}
                type="button"
                size="sm"
                variant={selectedClient === client ? "default" : "outline"}
                onClick={() => onClientChange(client)}
              >
                {client === "all" ? "Tous les clients" : client}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Statut</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Exécution
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(status)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                    selectedStatus === status
                      ? "border-primary/[0.15] bg-primary/10 text-primary"
                      : "border-white/70 bg-white/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {status === "all" ? "Tous" : taskStatusMeta[status].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Priorité</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Charge
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => onPriorityChange(priority)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                    selectedPriority === priority
                      ? "border-primary/[0.15] bg-primary/10 text-primary"
                      : "border-white/70 bg-white/60 text-muted-foreground hover:text-foreground",
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
      </CardContent>
    </Card>
  );
}
