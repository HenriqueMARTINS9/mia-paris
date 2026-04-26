"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, CalendarClock, FolderKanban, PlusSquare } from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { MobileFilterSheet } from "@/components/crm/mobile-filter-sheet";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { CreateRequestTaskForm } from "@/features/tasks/components/create-request-task-form";
import { TaskDetailPanel } from "@/features/tasks/components/task-detail-panel";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { MobileTaskCard } from "@/features/tasks/components/mobile-task-card";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import { TasksTable } from "@/features/tasks/components/tasks-table";
import type { TasksPageData } from "@/features/tasks/types";
import { getDaysUntil } from "@/lib/utils";

interface TasksPageProps extends TasksPageData {
  preselectedRequestId?: string | null;
}

export function TasksPage({
  tasks,
  assignees,
  assigneesError = null,
  requestOptions,
  requestOptionsError = null,
  error = null,
  preselectedRequestId = null,
}: Readonly<TasksPageProps>) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | (typeof tasks)[number]["status"]>("all");
  const [selectedPriority, setSelectedPriority] = useState<"all" | (typeof tasks)[number]["priority"]>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id ?? null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const clients = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.clientName))).sort(),
    [tasks],
  );

  const filteredTasks = tasks.filter((task) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [
        task.title,
        task.taskTypeLabel,
        task.clientName,
        task.requestTitle,
        task.owner,
        task.productionStatus ?? "",
        task.orderNumber ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesClient = selectedClient === "all" || task.clientName === selectedClient;
    const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
    const matchesPriority =
      selectedPriority === "all" || task.priority === selectedPriority;

    return matchesSearch && matchesClient && matchesStatus && matchesPriority;
  });

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ??
    filteredTasks[0] ??
    null;

  const dueSoonCount = filteredTasks.filter((task) => {
    if (!task.dueAt) {
      return false;
    }

    const days = getDaysUntil(task.dueAt);
    return days >= 0 && days <= 1;
  }).length;
  const overdueCount = filteredTasks.filter((task) => task.isOverdue).length;
  const unassignedCount = filteredTasks.filter(
    (task) => !task.assignedUserId,
  ).length;

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    setMobileDetailsOpen(true);
  }

  const header = (
    <PageHeader
      eyebrow="Étape 3 · Tâches"
      title="Tâches"
      badge={`${filteredTasks.length} ouverte${filteredTasks.length > 1 ? "s" : ""}`}
      description="Owners, échéances, demande liée et arbitrages du jour."
      actions={
        <>
          <Button variant="outline">
            <ArrowDownToLine className="h-4 w-4" />
            Exporter
          </Button>
          <Button asChild>
            <a href="#create-task-form">
              <PlusSquare className="h-4 w-4" />
              Nouvelle tâche
            </a>
          </Button>
        </>
      }
    />
  );

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Connexion Supabase impossible pour Tâches"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ouvertes"
          value={String(filteredTasks.length)}
          hint="Backlog ouvert issu de v_tasks_open."
          icon={FolderKanban}
        />
        <MetricCard
          label="Sous 24h"
          value={String(dueSoonCount)}
          hint="Tâches à rendre aujourd'hui ou demain."
          icon={CalendarClock}
          accent="accent"
        />
        <MetricCard
          label="En retard"
          value={String(overdueCount)}
          hint="Actions dont l'échéance est déjà dépassée."
          icon={AlertTriangle}
          accent="danger"
        />
        <MetricCard
          label="Sans owner"
          value={String(unassignedCount)}
          hint="Tâches encore sans responsable explicite."
          icon={PlusSquare}
        />
      </div>

      <div className="md:hidden">
        <MobileFilterSheet
          title="Filtrer les tâches"
          description="Affiner le backlog par client, statut, priorité et recherche."
        >
          <TaskFilters
            search={search}
            onSearchChange={setSearch}
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedPriority={selectedPriority}
            onPriorityChange={setSelectedPriority}
            clients={clients}
          />
        </MobileFilterSheet>
      </div>

      <div className="hidden md:block">
        <TaskFilters
          search={search}
          onSearchChange={setSearch}
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          clients={clients}
        />
      </div>

      {tasks.length === 0 ? (
        <>
          <CreateRequestTaskForm
            sectionId="create-task-form"
            assignees={assignees}
            assigneesError={assigneesError}
            requestOptions={requestOptions}
            requestOptionsError={requestOptionsError}
            defaultRequestId={preselectedRequestId}
            formTitle="Créer une tâche manuelle"
          />
          <EmptyState
            title="Aucune tâche dans v_tasks_open"
            description="La vue Supabase est accessible mais ne retourne encore aucune tâche ouverte. Tu peux déjà créer une première tâche manuelle depuis ce module."
          />
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-3 md:hidden">
              {filteredTasks.map((task) => (
                <MobileTaskCard
                  key={task.id}
                  task={task}
                  assignees={assignees}
                  assigneesError={assigneesError}
                  onOpen={() => handleSelectTask(task.id)}
                />
              ))}
            </div>

            <Card className="hidden md:block">
              <CardHeader className="gap-4 border-b border-black/[0.06] pb-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <Badge variant="outline" className="bg-[#fbf8f2]">
                      File active
                    </Badge>
                    <CardTitle className="mt-3">Tâches ouvertes</CardTitle>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Vue d’exécution par responsable, niveau de priorité et échéance, pensée pour piloter vite sans quitter le backlog.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white">
                      {filteredTasks.length} visibles
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      {overdueCount} en retard
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      {unassignedCount} sans owner
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <TasksTable
                  tasks={filteredTasks}
                  selectedTaskId={selectedTask?.id ?? null}
                  onSelectTask={handleSelectTask}
                />
              </CardContent>
            </Card>

            <div className="hidden gap-3 rounded-[1.5rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-4 md:grid lg:grid-cols-2">
              <div className="rounded-[1.1rem] border border-black/[0.06] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Répartition des statuts
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(["todo", "in_progress", "blocked", "done"] as const).map((status) => {
                    const count = filteredTasks.filter((task) => task.status === status).length;

                    return (
                      <div key={status} className="inline-flex items-center gap-2">
                        <TaskStatusBadge
                          status={status}
                          className="normal-case tracking-normal"
                        />
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-black/[0.06] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Répartition des priorités
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(["critical", "high", "normal"] as const).map((priority) => {
                    const count = filteredTasks.filter((task) => task.priority === priority).length;

                    return (
                      <div key={priority} className="inline-flex items-center gap-2">
                        <RequestPriorityBadge priority={priority} className="normal-case tracking-normal" />
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <CreateRequestTaskForm
              sectionId="create-task-form"
              assignees={assignees}
              assigneesError={assigneesError}
              requestOptions={requestOptions}
              requestOptionsError={requestOptionsError}
              defaultRequestId={preselectedRequestId}
              formTitle="Créer une tâche manuelle"
            />
          </div>

          <Sheet
            open={mobileDetailsOpen && Boolean(selectedTask)}
            onOpenChange={setMobileDetailsOpen}
          >
            <SheetContent className="inset-x-0 bottom-0 top-auto h-[min(90vh,820px)] w-full max-w-none rounded-t-[1.6rem] border-b-0 border-l-0 border-r-0 p-4 sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-2xl sm:rounded-none sm:border-b sm:border-l sm:border-r-0 sm:border-t-0 sm:p-6">
              <SheetHeader>
                <SheetTitle>Détail tâche</SheetTitle>
                <SheetDescription>
                  Pilotage rapide du statut, de la priorité, du responsable et de l&apos;échéance.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:mt-6 sm:pb-6">
                <TaskDetailPanel
                  task={selectedTask}
                  assignees={assignees}
                  assigneesError={assigneesError}
                  mode="sheet"
                />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
