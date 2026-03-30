"use client";

import { ArrowUpRight, CalendarRange, Factory } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BlockingReasonCell } from "@/features/productions/components/blocking-reason-cell";
import {
  ProductionStatusBadge,
  RiskBadge,
} from "@/features/productions/components/production-badges";
import type { ProductionListItem } from "@/features/productions/types";
import { cn, formatDate, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface ProductionsTableProps {
  onSelectProduction: (productionId: string) => void;
  productions: ProductionListItem[];
  selectedProductionId: string | null;
}

export function ProductionsTable({
  onSelectProduction,
  productions,
  selectedProductionId,
}: Readonly<ProductionsTableProps>) {
  if (productions.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/40 px-6 py-12 text-center">
        <p className="text-base font-semibold">Aucune production trouvée</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste les filtres ou attends le prochain dossier validé côté production.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-black/[0.06] md:hidden">
        {productions.map((production) => {
          const isSelected = production.id === selectedProductionId;

          return (
            <button
              key={production.id}
              type="button"
              className={cn(
                "block w-full px-4 py-4 text-left transition hover:bg-[#faf7f1]",
                isSelected && "bg-primary/[0.06]",
                production.isBlocked && "bg-destructive/[0.04]",
              )}
              onClick={() => onSelectProduction(production.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold tracking-tight">
                      {production.orderNumber}
                    </p>
                    {production.isBlocked ? <Badge variant="destructive">Bloquée</Badge> : null}
                  </div>
                  <p className="mt-2 font-semibold">{production.clientName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{production.modelName}</p>
                </div>
                <Badge variant="outline" className="normal-case tracking-normal">
                  {production.productionModeLabel}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ProductionStatusBadge status={production.status} className="w-fit" />
                <RiskBadge risk={production.risk} className="w-fit" />
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Début prévu
                  </p>
                  <p className="mt-1 font-semibold">
                    {production.plannedStartAt
                      ? formatDate(production.plannedStartAt)
                      : "À planifier"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Fin prévue
                  </p>
                  <p className="mt-1 font-semibold">
                    {production.plannedEndAt
                      ? getDeadlineLabel(production.plannedEndAt)
                      : "Sans date"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {production.plannedEndAt
                      ? formatDate(production.plannedEndAt)
                      : "À caler"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Blocage
                  </p>
                  <div className="mt-1">
                    <BlockingReasonCell
                      blockingReason={production.blockingReason}
                      isBlocked={production.isBlocked}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {formatDateTime(
                    production.updatedAt ??
                      production.createdAt ??
                      new Date().toISOString(),
                  )}
                </span>
                {production.requestId ? (
                  <Link
                    href={`/requests/${production.requestId}`}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Demande liée
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[180px]">Commande</TableHead>
              <TableHead className="min-w-[180px]">Client</TableHead>
              <TableHead className="min-w-[180px]">Modèle</TableHead>
              <TableHead className="min-w-[170px]">Mode de production</TableHead>
              <TableHead className="min-w-[150px]">Statut</TableHead>
              <TableHead className="min-w-[140px]">Risque</TableHead>
              <TableHead className="min-w-[160px]">Début prévu</TableHead>
              <TableHead className="min-w-[170px]">Fin prévue</TableHead>
              <TableHead className="min-w-[260px]">Blocage éventuel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productions.map((production) => {
              const isSelected = production.id === selectedProductionId;

              return (
                <TableRow
                  key={production.id}
                  className={cn(
                    "cursor-pointer",
                    isSelected && "bg-primary/[0.06]",
                    production.isBlocked && "bg-destructive/[0.04]",
                  )}
                  onClick={() => onSelectProduction(production.id)}
                >
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                        <Factory className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold tracking-tight">
                            {production.orderNumber}
                          </p>
                          {production.isBlocked ? (
                            <Badge variant="destructive">Bloquée</Badge>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {formatDateTime(
                              production.updatedAt ??
                                production.createdAt ??
                                new Date().toISOString(),
                            )}
                          </span>
                          {production.requestId ? (
                            <Link
                              href={`/requests/${production.requestId}`}
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Demande liée
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{production.clientName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {production.requestTitle ?? "Sans demande liée"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{production.modelName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {production.requestTitle ?? "Suivi production"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {production.productionModeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProductionStatusBadge status={production.status} className="w-fit" />
                  </TableCell>
                  <TableCell>
                    <RiskBadge risk={production.risk} className="w-fit" />
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold">
                      <CalendarRange className="h-4 w-4 text-primary" />
                      {production.plannedStartAt
                        ? formatDate(production.plannedStartAt)
                        : "À planifier"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex flex-col items-start gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold">
                        <CalendarRange className="h-4 w-4 text-primary" />
                        {production.plannedEndAt
                          ? getDeadlineLabel(production.plannedEndAt)
                          : "Sans date"}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {production.plannedEndAt
                          ? formatDate(production.plannedEndAt)
                          : "À caler"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <BlockingReasonCell
                      blockingReason={production.blockingReason}
                      isBlocked={production.isBlocked}
                    />
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
