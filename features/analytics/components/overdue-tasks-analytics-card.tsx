import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsPageData } from "@/features/analytics/types";
import { formatDateTime } from "@/lib/utils";

export function OverdueTasksAnalyticsCard({
  overdue,
}: Readonly<{
  overdue: AnalyticsPageData["overdue"];
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Retards opérationnels</CardTitle>
        <CardDescription>
          Vue rapide sur les tâches déjà en retard et les deadlines réellement manquées.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatBox label="Tasks overdue" value={String(overdue.overdueTasksCount)} />
          <StatBox label="Deadlines missed" value={String(overdue.missedDeadlinesCount)} />
        </div>

        {overdue.items.length > 0 ? (
          <div className="space-y-3">
            {overdue.items.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.clientName} · {item.priority}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-destructive">
                    {item.dueAt ? formatDateTime(item.dueAt) : "Sans date"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun retard bloquant détecté pour l’instant.
          </p>
        )}

        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/taches">Ouvrir les tâches</Link>
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
