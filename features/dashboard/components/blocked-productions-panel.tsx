import { AlertTriangle, Factory } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProductionStatusBadge,
  RiskBadge,
} from "@/features/productions/components/production-badges";
import type { ProductionListItem } from "@/features/productions/types";
import { formatDateTime } from "@/lib/utils";

export function BlockedProductionsPanel({
  productions,
}: Readonly<{ productions: ProductionListItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Productions à risque</CardTitle>
        </div>
        <CardDescription>
          Commandes bloquées ou sensibles à arbitrer côté atelier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {productions.length > 0 ? (
          productions.map((production) => (
            <div
              key={production.id}
              className="rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{production.orderNumber}</p>
                    <ProductionStatusBadge
                      status={production.status}
                      className="normal-case tracking-normal"
                    />
                    <RiskBadge risk={production.risk} className="normal-case tracking-normal" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {production.clientName} · {production.modelName}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/80">
                    {production.blockingReason ?? "Risque élevé sans blocage explicite."}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div className="inline-flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {production.isBlocked ? "Bloquée" : "Sous surveillance"}
                  </div>
                  <p className="mt-2">
                    {production.plannedEndAt
                      ? formatDateTime(production.plannedEndAt)
                      : "Fin non planifiée"}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune production sensible à remonter dans le cockpit pour l’instant.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
