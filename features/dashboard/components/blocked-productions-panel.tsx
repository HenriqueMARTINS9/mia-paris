import { AlertTriangle, Factory } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProductionStatusBadge,
  RiskBadge,
} from "@/features/productions/components/production-badges";
import type { ProductionListItem } from "@/features/productions/types";
import { formatDateTime } from "@/lib/utils";

export function BlockedProductionsPanel({
  description = "Commandes bloquées ou sensibles à arbitrer côté atelier.",
  emptyMessage = "Aucune production sensible à remonter dans le cockpit pour l’instant.",
  productions,
  title = "Productions à risque",
}: Readonly<{
  description?: string;
  emptyMessage?: string;
  productions: ProductionListItem[];
  title?: string;
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-[#fbf8f2]">
            {productions.length}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {productions.length > 0 ? (
          productions.map((production) => (
            <div
              key={production.id}
              className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
            >
              <div className="space-y-3">
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {production.isBlocked ? "Bloquée" : "Sous surveillance"}
                  </span>
                  <span>
                    {production.plannedEndAt
                      ? formatDateTime(production.plannedEndAt)
                      : "Fin non planifiée"}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
