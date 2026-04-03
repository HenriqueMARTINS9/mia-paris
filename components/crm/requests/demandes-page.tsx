"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCheck,
  FileClock,
  MailPlus,
} from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { MobileFilterSheet } from "@/components/crm/mobile-filter-sheet";
import { PageHeader } from "@/components/crm/page-header";
import { RequestDetailPanel } from "@/components/crm/requests/request-detail-panel";
import { RequestFilters } from "@/components/crm/requests/request-filters";
import { RequestsTable } from "@/components/crm/requests/requests-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { requestStatusMeta } from "@/features/requests/metadata";
import { MobileRequestCard } from "@/features/requests/components/mobile-request-card";
import type {
  RequestAssigneeOption,
  RequestOverviewListItem,
} from "@/features/requests/types";
import { getDaysUntil } from "@/lib/utils";

interface DemandesPageProps {
  requests: RequestOverviewListItem[];
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  error?: string | null;
}

export function DemandesPage({
  requests,
  assignees,
  assigneesError = null,
  error = null,
}: Readonly<DemandesPageProps>) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | RequestOverviewListItem["status"]
  >("all");
  const [selectedPriority, setSelectedPriority] = useState<
    "all" | RequestOverviewListItem["priority"]
  >("all");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    requests[0]?.id ?? null,
  );
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const header = (
    <PageHeader
      eyebrow="Étape 2 · Demandes"
      title="Demandes"
      badge={`${requests.length} dossier${requests.length > 1 ? "s" : ""}`}
      description="Écran pivot du CRM textile MIA PARIS : la page consomme maintenant directement v_requests_overview via Supabase, tout en conservant le shell visuel existant."
      actions={
        <>
          <Button variant="outline">
            <ArrowDownToLine className="h-4 w-4" />
            Exporter la vue
          </Button>
          <Button>
            <MailPlus className="h-4 w-4" />
            Nouvelle demande
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
          title="Connexion Supabase impossible pour Demandes"
          description={error}
        />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="Aucune demande dans v_requests_overview"
          description="La vue Supabase est accessible, mais ne retourne encore aucun dossier. Dès qu'une demande sera présente, la page l'affichera ici sans changement UI."
        />
      </div>
    );
  }

  const clients = Array.from(
    new Set(requests.map((request) => request.clientName)),
  ).sort();

  const filteredRequests = requests.filter((request) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [
        request.reference,
        request.clientName,
        request.department,
        request.requestTypeLabel,
        request.sourceSubject,
        request.emailPreview,
        request.owner,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesClient =
      selectedClient === "all" || request.clientName === selectedClient;
    const matchesStatus =
      selectedStatus === "all" || request.status === selectedStatus;
    const matchesPriority =
      selectedPriority === "all" || request.priority === selectedPriority;

    return matchesSearch && matchesClient && matchesStatus && matchesPriority;
  });

  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedRequestId) ??
    filteredRequests[0] ??
    null;
  const activeRequestId = selectedRequest?.id ?? null;

  const qualificationCount = filteredRequests.filter((request) =>
    ["new", "qualification"].includes(request.status),
  ).length;
  const criticalCount = filteredRequests.filter(
    (request) => request.priority === "critical" || request.urgencyScore >= 80,
  ).length;
  const averageConfidence = computeAverageConfidence(filteredRequests);
  const dueSoonCount = filteredRequests.filter(
    (request) => getDaysUntil(request.dueAt) <= 2,
  ).length;

  function handleSelectRequest(requestId: string) {
    setSelectedRequestId(requestId);
    setMobileDetailsOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Étape 2 · Demandes"
        title="Demandes"
        badge={`${filteredRequests.length} dossier${filteredRequests.length > 1 ? "s" : ""}`}
        description="Vue opérationnelle branchée sur Supabase : qualification, suivi, urgence et contexte dossier sont désormais alimentés par v_requests_overview."
        actions={
          <>
            <Button variant="outline">
              <ArrowDownToLine className="h-4 w-4" />
              Exporter la vue
            </Button>
            <Button>
              <MailPlus className="h-4 w-4" />
              Nouvelle demande
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="À qualifier"
          value={String(qualificationCount)}
          hint="Demandes encore en cadrage ou fraîchement créées."
          icon={MailPlus}
        />
        <MetricCard
          label="Urgences"
          value={String(criticalCount)}
          hint="Dossiers critiques ou avec score d'urgence élevé."
          icon={AlertTriangle}
          accent="danger"
        />
        <MetricCard
          label="Confiance IA"
          value={`${averageConfidence}%`}
          hint="Moyenne des scores AI confidence de la vue."
          icon={CheckCheck}
          accent="accent"
        />
        <MetricCard
          label="À 48h"
          value={String(dueSoonCount)}
          hint="Demandes dont l'échéance est dans les deux prochains jours."
          icon={FileClock}
        />
      </div>

      <div className="md:hidden">
        <MobileFilterSheet
          title="Filtrer les demandes"
          description="Affiner rapidement les dossiers par client, statut, priorité et recherche métier."
        >
          <RequestFilters
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
        <RequestFilters
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

      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-3 md:hidden">
          {filteredRequests.map((request) => (
            <MobileRequestCard
              key={request.id}
              request={request}
              assignees={assignees}
              assigneesError={assigneesError}
              onOpen={() => handleSelectRequest(request.id)}
            />
          ))}
        </div>

        <Card className="hidden md:block">
          <CardHeader className="gap-4 border-b border-black/[0.06] pb-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  Vue opérationnelle
                </Badge>
                <CardTitle className="mt-3">Demandes entrantes et en cours</CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Vue compacte pour absorber le flux client, arbitrer les priorités et faire avancer le pipeline sans perdre le contexte dossier.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white">
                  {filteredRequests.length} visibles
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {criticalCount} urgentes
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {dueSoonCount} sous 48h
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <RequestsTable
              requests={filteredRequests}
              selectedRequestId={activeRequestId}
              onSelectRequest={handleSelectRequest}
            />
          </CardContent>
        </Card>

        <div className="hidden gap-3 rounded-[1.5rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-4 md:grid md:grid-cols-2 xl:grid-cols-3">
          {(
            [
              "new",
              "qualification",
              "costing",
              "awaiting_validation",
              "approved",
              "in_production",
            ] as const
          ).map((status) => {
            const count = filteredRequests.filter(
              (request) => request.status === status,
            ).length;

            return (
              <div
                key={status}
                className="rounded-[1.1rem] border border-black/[0.06] bg-white px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {requestStatusMeta[status].label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      <Sheet
        open={mobileDetailsOpen && Boolean(selectedRequest)}
        onOpenChange={setMobileDetailsOpen}
      >
        <SheetContent className="inset-x-0 bottom-0 top-auto h-[min(90vh,820px)] w-full max-w-none rounded-t-[1.6rem] border-b-0 border-l-0 border-r-0 p-4 sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-2xl sm:rounded-none sm:border-b sm:border-l sm:border-r-0 sm:border-t-0 sm:p-6">
          <SheetHeader>
            <SheetTitle>Détail demande</SheetTitle>
            <SheetDescription>
              Vue compacte des informations clés, actions et jalons associés.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:mt-6 sm:pb-6">
            <RequestDetailPanel
              request={selectedRequest}
              assignees={assignees}
              assigneesError={assigneesError}
              mode="sheet"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function computeAverageConfidence(requests: RequestOverviewListItem[]) {
  const availableScores = requests
    .map((request) => request.aiConfidence)
    .filter((score): score is number => score !== null);

  if (availableScores.length === 0) {
    return 0;
  }

  const average =
    availableScores.reduce((total, score) => total + score, 0) /
    availableScores.length;

  return Math.round(average * 100);
}
