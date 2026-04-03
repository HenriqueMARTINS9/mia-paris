"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, CalendarClock, Flame, PlusSquare } from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { MobileFilterSheet } from "@/components/crm/mobile-filter-sheet";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DeadlineDetailPanel } from "@/features/deadlines/components/deadline-detail-panel";
import { DeadlineFilters } from "@/features/deadlines/components/deadline-filters";
import { MobileDeadlineCard } from "@/features/deadlines/components/mobile-deadline-card";
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="md:hidden">
        <MobileFilterSheet
          title="Filtrer les deadlines"
          description="Affiner les urgences par client, statut, priorité et recherche."
        >
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
        </MobileFilterSheet>
      </div>

      <div className="hidden md:block">
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
      </div>

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
            <div className="grid gap-3 md:hidden">
              {filteredDeadlines.map((deadline) => (
                <MobileDeadlineCard
                  key={deadline.id}
                  deadline={deadline}
                  onOpen={() => handleSelectDeadline(deadline.id)}
                />
              ))}
            </div>

            <Card className="hidden md:block">
              <CardHeader className="gap-4 border-b border-black/[0.06] pb-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <Badge variant="outline" className="bg-[#fbf8f2]">
                      Tension du jour
                    </Badge>
                    <CardTitle className="mt-3">Deadlines critiques</CardTitle>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Lecture opérationnelle des jalons sensibles pour savoir immédiatement ce qui menace le flux client ou la prod.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white">
                      {filteredDeadlines.length} visibles
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      {overdueCount} en retard
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      {criticalCount} critiques
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <DeadlinesTable
                  deadlines={filteredDeadlines}
                  selectedDeadlineId={selectedDeadline?.id ?? null}
                  onSelectDeadline={handleSelectDeadline}
                />
              </CardContent>
            </Card>

            <div className="hidden gap-3 rounded-[1.5rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-4 md:grid md:grid-cols-3">
              {(["open", "in_progress", "done"] as const).map((status) => {
                const count = filteredDeadlines.filter((deadline) => deadline.status === status).length;

                return (
                  <div
                    key={status}
                    className="rounded-[1.1rem] border border-black/[0.06] bg-white p-4"
                  >
                    <DeadlineStatusBadge
                      status={status}
                      className="normal-case tracking-normal"
                    />
                    <p className="mt-3 text-2xl font-semibold tracking-tight">{count}</p>
                  </div>
                );
              })}
            </div>

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
            <SheetContent className="inset-x-0 bottom-0 top-auto h-[min(90vh,820px)] w-full max-w-none rounded-t-[1.6rem] border-b-0 border-l-0 border-r-0 p-4 sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-2xl sm:rounded-none sm:border-b sm:border-l sm:border-r-0 sm:border-t-0 sm:p-6">
              <SheetHeader>
                <SheetTitle>Détail deadline</SheetTitle>
                <SheetDescription>
                  Priorité, clôture rapide et contexte du jalon critique.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:mt-6 sm:pb-6">
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
