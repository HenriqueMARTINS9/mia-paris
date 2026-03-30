import Link from "next/link";
import { Factory } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionStatusBadge, RiskBadge } from "@/features/productions/components/production-badges";
import type { ProductionListItem } from "@/features/productions/types";
import { formatDate } from "@/lib/utils";

export function TodayBlockedProductionsPanel({
  productions,
}: Readonly<{
  productions: ProductionListItem[];
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Productions à risque</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {productions.length > 0 ? (
          productions.map((production) => (
            <Link
              key={production.id}
              href="/productions"
              className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {production.orderNumber}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {production.clientName} · {production.modelName}
                  </p>
                </div>
                <ProductionStatusBadge status={production.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <RiskBadge risk={production.risk} />
                {production.plannedEndAt ? (
                  <span>Fin {formatDate(production.plannedEndAt)}</span>
                ) : null}
                {production.blockingReason ? (
                  <span className="text-destructive">{production.blockingReason}</span>
                ) : null}
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucun blocage production remonté aujourd’hui.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
