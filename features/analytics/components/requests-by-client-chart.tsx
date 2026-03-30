import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsDistributionItem } from "@/features/analytics/types";

export function RequestsByClientChart({
  items,
}: Readonly<{
  items: AnalyticsDistributionItem[];
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Clients les plus demandeurs</CardTitle>
        <CardDescription>
          Priorise les comptes les plus consommateurs et les clients qui remontent déjà beaucoup d’urgences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.label}</p>
                  {item.secondary ? (
                    <p className="truncate text-sm text-muted-foreground">{item.secondary}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.share}% du flux</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Pas encore assez de volume client pour lire un top exploitable.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
