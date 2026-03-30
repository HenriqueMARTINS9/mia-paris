import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsDistributionItem } from "@/features/analytics/types";

export function RequestsByTypeChart({
  items,
}: Readonly<{
  items: AnalyticsDistributionItem[];
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Répartition des requests par type</CardTitle>
        <CardDescription>
          Lecture directe des demandes récurrentes qui prennent le plus de bande passante métier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.label}</p>
                  {item.secondary ? (
                    <p className="truncate text-sm text-muted-foreground">{item.secondary}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.share}%</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#f1ece3]">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.max(item.share, 6)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Pas assez de requests pour calculer une répartition exploitable.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
