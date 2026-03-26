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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline">Vue opérationnelle</Badge>
              <CardTitle className="mt-3">Demandes entrantes et en cours</CardTitle>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Chaque ligne est maintenant issue de Supabase et conserve la
              lecture dense du front existant.
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <RequestsTable
              requests={filteredRequests}
              selectedRequestId={activeRequestId}
              onSelectRequest={handleSelectRequest}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Répartition du pipeline</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les statuts UI sont dérivés proprement des statuts bruts de la
                vue pour ne pas casser l&apos;expérience actuelle.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
                  <Badge
                    key={status}
                    variant="secondary"
                    className="normal-case tracking-normal"
                  >
                    {requestStatusMeta[status].label} · {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={mobileDetailsOpen && Boolean(selectedRequest)}
        onOpenChange={setMobileDetailsOpen}
      >
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Détail demande</SheetTitle>
            <SheetDescription>
              Vue compacte des informations clés, actions et jalons associés.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto pb-6">
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
