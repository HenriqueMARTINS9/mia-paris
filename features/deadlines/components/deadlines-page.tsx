"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, CalendarClock, Flame, PlusSquare } from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DeadlineDetailPanel } from "@/features/deadlines/components/deadline-detail-panel";
import { DeadlineFilters } from "@/features/deadlines/components/deadline-filters";
import { DeadlinesTable } from "@/features/deadlines/components/deadlines-table";
import { CreateDeadlineForm } from "@/features/deadlines/components/create-deadline-form";
import { DeadlineStatusBadge } from "@/features/deadlines/components/deadline-badges";
import type { DeadlinesPageData } from "@/features/deadlines/types";

interface DeadlinesPageProps extends DeadlinesPageData {
  preselectedRequestId?: string | null;
}

export function DeadlinesPage({
  deadlines,
  requestOptions,
  requestOptionsError = null,
  error = null,
  preselectedRequestId = null,
}: Readonly<DeadlinesPageProps>) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | (typeof deadlines)[number]["status"]>("all");
  const [selectedPriority, setSelectedPriority] = useState<"all" | (typeof deadlines)[number]["priority"]>("all");
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(
    deadlines[0]?.id ?? null,
  );
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const clients = useMemo(
    () => Array.from(new Set(deadlines.map((deadline) => deadline.clientName))).sort(),
    [deadlines],
  );

  const filteredDeadlines = deadlines.filter((deadline) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [
        deadline.label,
        deadline.clientName,
        deadline.requestTitle,
        deadline.linkedObjectLabel,
        deadline.orderNumber ?? "",
        deadline.productionStatus ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesClient =
      selectedClient === "all" || deadline.clientName === selectedClient;
    const matchesStatus =
      selectedStatus === "all" || deadline.status === selectedStatus;
    const matchesPriority =
      selectedPriority === "all" || deadline.priority === selectedPriority;

    return matchesSearch && matchesClient && matchesStatus && matchesPriority;
  });

  const selectedDeadline =
    filteredDeadlines.find((deadline) => deadline.id === selectedDeadlineId) ??
    filteredDeadlines[0] ??
    null;

  const under24hCount = filteredDeadlines.filter((deadline) => {
    const hours = getHoursUntil(deadline.deadlineAt);
    return hours !== null && hours >= 0 && hours <= 24;
  }).length;
  const under48hCount = filteredDeadlines.filter((deadline) => {
    const hours = getHoursUntil(deadline.deadlineAt);
    return hours !== null && hours >= 0 && hours <= 48;
  }).length;
  const overdueCount = filteredDeadlines.filter((deadline) => deadline.isOverdue).length;
  const criticalCount = filteredDeadlines.filter((deadline) => deadline.priority === "critical").length;

  function handleSelectDeadline(deadlineId: string) {
    setSelectedDeadlineId(deadlineId);
    setMobileDetailsOpen(true);
  }

  const header = (
    <PageHeader
      eyebrow="Étape 4 · Deadlines / urgences"
      title="Deadlines & urgences"
      badge={`${filteredDeadlines.length} point${filteredDeadlines.length > 1 ? "s" : ""} critique${filteredDeadlines.length > 1 ? "s" : ""}`}
      description="Lecture priorisée des jalons sensibles MIA PARIS : alertes, retards et deadlines à absorber avant validation ou production."
      actions={
        <>
          <Button variant="outline">
            <ArrowDownToLine className="h-4 w-4" />
            Exporter
          </Button>
          <Button asChild>
            <a href="#create-deadline-form">
              <PlusSquare className="h-4 w-4" />
              Nouvelle deadline
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
          title="Connexion Supabase impossible pour Deadlines"
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
          label="Sous 24h"
          value={String(under24hCount)}
          hint="Jalons critiques à traiter dans la journée."
          icon={CalendarClock}
          accent="danger"
        />
        <MetricCard
          label="Sous 48h"
          value={String(under48hCount)}
          hint="Fenêtre d'action immédiate sur deux jours."
          icon={Flame}
          accent="accent"
        />
        <MetricCard
          label="En retard"
          value={String(overdueCount)}
          hint="Deadlines déjà dépassées à résorber."
          icon={AlertTriangle}
          accent="danger"
        />
        <MetricCard
          label="Critiques"
          value={String(criticalCount)}
          hint="Objets portés en priorité critique."
          icon={PlusSquare}
        />
      </div>

      <DeadlineFilters
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

      {deadlines.length === 0 ? (
        <>
          <CreateDeadlineForm
            sectionId="create-deadline-form"
            requestOptions={requestOptions}
            requestOptionsError={requestOptionsError}
            defaultRequestId={preselectedRequestId}
          />
          <EmptyState
            title="Aucune deadline dans v_deadlines_critical"
            description="La vue Supabase est accessible mais ne remonte encore aucun jalon critique. Tu peux déjà créer une deadline manuelle pour lancer le suivi."
          />
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Badge variant="outline">Tension du jour</Badge>
                  <CardTitle className="mt-3">Deadlines critiques</CardTitle>
                </div>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Vue branchée sur `v_deadlines_critical`, enrichie par la table `deadlines` pour piloter les arbitrages.
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <DeadlinesTable
                  deadlines={filteredDeadlines}
                  selectedDeadlineId={selectedDeadline?.id ?? null}
                  onSelectDeadline={handleSelectDeadline}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">Répartition des deadlines</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lecture immédiate du niveau de risque et de traitement.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["open", "in_progress", "done"] as const).map((status) => {
                    const count = filteredDeadlines.filter((deadline) => deadline.status === status).length;

                    return (
                      <div key={status} className="inline-flex items-center gap-2">
                        <DeadlineStatusBadge
                          status={status}
                          className="normal-case tracking-normal"
                        />
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <CreateDeadlineForm
              sectionId="create-deadline-form"
              requestOptions={requestOptions}
              requestOptionsError={requestOptionsError}
              defaultRequestId={preselectedRequestId}
            />
          </div>

          <Sheet
            open={mobileDetailsOpen && Boolean(selectedDeadline)}
            onOpenChange={setMobileDetailsOpen}
          >
            <SheetContent className="sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>Détail deadline</SheetTitle>
                <SheetDescription>
                  Priorité, clôture rapide et contexte du jalon critique.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 overflow-y-auto pb-6">
                <DeadlineDetailPanel deadline={selectedDeadline} mode="sheet" />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

function getHoursUntil(input: string | null) {
  if (!input) {
    return null;
  }

  return Math.round((new Date(input).getTime() - Date.now()) / 3_600_000);
}
