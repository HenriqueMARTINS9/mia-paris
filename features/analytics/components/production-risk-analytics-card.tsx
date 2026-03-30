import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsPageData } from "@/features/analytics/types";

export function ProductionRiskAnalyticsCard({
  productionRisk,
}: Readonly<{
  productionRisk: AnalyticsPageData["productionRisk"];
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Productions bloquées / à risque</CardTitle>
        <CardDescription>
          Lecture courte des incidents concrets à arbitrer avec atelier, logistique ou équipe produit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatBox label="Bloquées" value={String(productionRisk.blockedCount)} />
          <StatBox label="High risk" value={String(productionRisk.highRiskCount)} />
        </div>

        {productionRisk.incidents.length > 0 ? (
          <div className="space-y-3">
            {productionRisk.incidents.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.label}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.clientName} · {item.status} · {item.risk}
                    </p>
                  </div>
                  {item.blockingReason ? (
                    <span className="max-w-[13rem] rounded-full bg-destructive/10 px-2 py-1 text-right text-[11px] font-semibold text-destructive">
                      {item.blockingReason}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun incident production majeur n’est remonté à ce stade.
          </p>
        )}

        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/productions">Ouvrir les productions</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatBox({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1.15rem] border border-black/[0.06] bg-white px-4 py-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
