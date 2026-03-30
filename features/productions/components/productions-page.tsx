"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
} from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
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
import {
  ProductionStatusBadge,
  RiskBadge,
} from "@/features/productions/components/production-badges";
import { CreateOrderDialog } from "@/features/orders/components/create-order-dialog";
import { CreateProductionDialog } from "@/features/productions/components/create-production-dialog";
import { ProductionDetailPanel } from "@/features/productions/components/production-detail-panel";
import { ProductionFilters } from "@/features/productions/components/production-filters";
import { ProductionKpis } from "@/features/productions/components/production-kpis";
import { ProductionsTable } from "@/features/productions/components/productions-table";
import type {
  ProductionDetailItem,
  ProductionFormOptions,
  ProductionListItem,
} from "@/features/productions/types";

interface ProductionsPageProps {
  detailsById: Record<string, ProductionDetailItem>;
  error?: string | null;
  formOptions: ProductionFormOptions;
  formOptionsError?: string | null;
  productions: ProductionListItem[];
}

export function ProductionsPage({
  detailsById,
  error = null,
  formOptions,
  formOptionsError = null,
  productions,
}: Readonly<ProductionsPageProps>) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | ProductionListItem["status"]
  >("all");
  const [selectedRisk, setSelectedRisk] = useState<
    "all" | ProductionListItem["risk"]
  >("all");
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(
    productions[0]?.id ?? null,
  );
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const filteredProductions = useMemo(
    () =>
      productions.filter((production) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          query.length === 0 ||
          [
            production.orderNumber,
            production.clientName,
            production.modelName,
            production.productionModeLabel,
            production.requestTitle ?? "",
            production.blockingReason ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          selectedStatus === "all" || production.status === selectedStatus;
        const matchesRisk =
          selectedRisk === "all" || production.risk === selectedRisk;

        return matchesSearch && matchesStatus && matchesRisk;
      }),
    [productions, search, selectedRisk, selectedStatus],
  );

  const selectedProductionSummary =
    filteredProductions.find((production) => production.id === selectedProductionId) ??
    filteredProductions[0] ??
    null;
  const selectedProduction =
    (selectedProductionSummary
      ? detailsById[selectedProductionSummary.id] ?? null
      : null) ?? null;

  const header = (
    <PageHeader
      eyebrow="Étape 6 · Productions"
      title="Productions"
      badge={`${filteredProductions.length} suivi${filteredProductions.length > 1 ? "s" : ""}`}
      description="Pilotage textile B2B des commandes lancées : statut atelier, risque, planning prévisionnel et points bloquants."
      actions={
        <>
          <CreateOrderDialog
            options={formOptions}
            optionsError={formOptionsError}
          />
          <Button variant="outline">
            <ArrowDownToLine className="h-4 w-4" />
            Exporter
          </Button>
          <CreateProductionDialog
            options={formOptions}
            optionsError={formOptionsError}
          />
        </>
      }
    />
  );

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Connexion Supabase impossible pour Productions"
          description={error}
        />
      </div>
    );
  }

  if (productions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="Aucune production dans la table productions"
          description="La table Supabase est accessible mais ne contient encore aucun suivi de production exploitable pour le cockpit MIA PARIS."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <ProductionKpis productions={filteredProductions} />

      <ProductionFilters
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedRisk={selectedRisk}
        onRiskChange={setSelectedRisk}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader className="gap-4 border-b border-black/[0.06] pb-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  Suivi atelier
                </Badge>
                <CardTitle className="mt-3">Productions actives et à risque</CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Vue terrain des commandes en production avec les dates utiles, le niveau de risque et les blocages à lever en priorité.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white">
                  {filteredProductions.length} suivis
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {
                    filteredProductions.filter((production) => production.isBlocked)
                      .length
                  } bloqués
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {
                    filteredProductions.filter(
                      (production) =>
                        production.risk === "critical" || production.risk === "high",
                    ).length
                  } à risque
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ProductionsTable
              productions={filteredProductions}
              selectedProductionId={selectedProduction?.id ?? null}
              onSelectProduction={(productionId) => {
                setSelectedProductionId(productionId);
                setMobileDetailsOpen(true);
              }}
            />
          </CardContent>
        </Card>

        <div className="grid gap-3 rounded-[1.5rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-4 lg:grid-cols-2">
          <div className="rounded-[1.1rem] border border-black/[0.06] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Statuts de production
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["blocked", "in_progress", "planned", "completed"] as const).map(
                (status) => {
                  const count = filteredProductions.filter(
                    (production) => production.status === status,
                  ).length;

                  return (
                    <div key={status} className="inline-flex items-center gap-2">
                      <ProductionStatusBadge status={status} className="normal-case tracking-normal" />
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
          <div className="rounded-[1.1rem] border border-black/[0.06] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Niveaux de risque
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["critical", "high", "normal", "low"] as const).map((risk) => {
                const count = filteredProductions.filter(
                  (production) => production.risk === risk,
                ).length;

                return (
                  <div key={risk} className="inline-flex items-center gap-2">
                    <RiskBadge risk={risk} className="normal-case tracking-normal" />
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {formOptionsError ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              {formOptionsError}
            </CardContent>
          </Card>
        ) : null}

        {selectedProductionSummary?.isBlocked ? (
          <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-destructive">
                  Blocage en cours sur {selectedProductionSummary.orderNumber}
                </p>
                <p className="mt-1 text-sm leading-6 text-destructive/90">
                  {selectedProductionSummary.blockingReason ??
                    "Un blocage est signalé sans détail complémentaire."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Sheet
        open={mobileDetailsOpen && Boolean(selectedProduction)}
        onOpenChange={setMobileDetailsOpen}
      >
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Détail production</SheetTitle>
            <SheetDescription>
              Arbitrage rapide du statut, du risque, du planning, des pièces jointes métier et des demandes liées.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto pb-6">
            <ProductionDetailPanel
              allProductions={productions}
              production={selectedProduction}
              mode="sheet"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
