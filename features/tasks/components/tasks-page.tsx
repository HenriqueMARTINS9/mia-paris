"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, CalendarClock, FolderKanban, PlusSquare } from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { CreateRequestTaskForm } from "@/features/tasks/components/create-request-task-form";
import { TaskDetailPanel } from "@/features/tasks/components/task-detail-panel";
import { TaskFilters } from "@/features/tasks/components/task-filters";
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
      description="Vue opérationnelle des actions ouvertes MIA PARIS : owners, échéances, demande liée et arbitrages du jour."
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Badge variant="outline">File active</Badge>
                  <CardTitle className="mt-3">Tâches ouvertes</CardTitle>
                </div>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Lecture dense par owner, priorité et échéance, branchée sur `v_tasks_open` et la table `tasks`.
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <TasksTable
                  tasks={filteredTasks}
                  selectedTaskId={selectedTask?.id ?? null}
                  onSelectTask={handleSelectTask}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">Répartition des tâches</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vision immédiate du flux d&apos;exécution ouvert.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>

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
            <SheetContent className="sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>Détail tâche</SheetTitle>
                <SheetDescription>
                  Pilotage rapide du statut, de la priorité, du responsable et de l&apos;échéance.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 overflow-y-auto pb-6">
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
