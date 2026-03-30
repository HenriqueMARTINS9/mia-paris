"use client";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  productionRiskMeta,
  productionStatusMeta,
} from "@/features/productions/metadata";
import type {
  ProductionRisk,
  ProductionStatus,
} from "@/features/productions/types";
import { cn } from "@/lib/utils";

interface ProductionFiltersProps {
  onRiskChange: (value: "all" | ProductionRisk) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "all" | ProductionStatus) => void;
  search: string;
  selectedRisk: "all" | ProductionRisk;
  selectedStatus: "all" | ProductionStatus;
}

const statusOptions: Array<"all" | ProductionStatus> = [
  "all",
  "planned",
  "in_progress",
  "blocked",
  "completed",
];

const riskOptions: Array<"all" | ProductionRisk> = [
  "all",
  "critical",
  "high",
  "normal",
  "low",
];

export function ProductionFilters({
  onRiskChange,
  onSearchChange,
  onStatusChange,
  search,
  selectedRisk,
  selectedStatus,
}: Readonly<ProductionFiltersProps>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="relative max-w-none xl:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher une commande, un client, un modèle ou un blocage"
            className="pl-10"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Statut</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Atelier
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
                        ? "border-primary/[0.15] bg-primary/10 text-primary"
                        : "border-white/70 bg-white/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {status === "all" ? "Tous" : productionStatusMeta[status].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Risque</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Arbitrage
              </p>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex w-max gap-2">
                {riskOptions.map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => onRiskChange(risk)}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                      selectedRisk === risk
                        ? "border-primary/[0.15] bg-primary/10 text-primary"
                        : "border-white/70 bg-white/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {risk === "all" ? "Tous" : productionRiskMeta[risk].label}
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
