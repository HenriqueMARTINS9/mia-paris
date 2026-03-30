import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringFailureItem } from "@/features/monitoring/types";

export function ActionFailuresCard({
  items,
  last24h,
  last7d,
}: Readonly<{
  items: MonitoringFailureItem[];
  last24h: number;
  last7d: number;
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Action Failures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Dernières 24h
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {last24h}
            </p>
          </div>
          <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Derniers 7 jours
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {last7d}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun échec récent détecté.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[0.95rem] border border-black/[0.06] bg-white/80 px-3 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.action}</Badge>
                  {item.source ? <Badge variant="outline">{item.source}</Badge> : null}
                  {item.scope ? <Badge variant="outline">{item.scope}</Badge> : null}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {item.description ?? "Échec métier sans description détaillée."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.entityType ?? "entity"} · {item.entityId ?? "n/a"} ·{" "}
                  {new Date(item.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
