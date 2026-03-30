import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringEventItem } from "@/features/monitoring/types";

export function RecentSystemEventsCard({
  items,
}: Readonly<{
  items: MonitoringEventItem[];
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <CardTitle className="text-base">Recent System Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement système récent.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[0.95rem] border border-black/[0.06] bg-white/80 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === "success" ? "default" : "outline"}>
                  {item.status === "success" ? "Success" : "Failure"}
                </Badge>
                <Badge variant="outline">{item.action}</Badge>
                {item.source ? <Badge variant="outline">{item.source}</Badge> : null}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {item.description ?? "Événement sans description détaillée."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.scope ?? item.entityType ?? "system"} ·{" "}
                {new Date(item.createdAt).toLocaleString("fr-FR")}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
