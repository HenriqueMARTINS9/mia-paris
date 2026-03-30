import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsKpiItem } from "@/features/analytics/types";

export function AnalyticsKpiCards({
  items,
}: Readonly<{
  items: AnalyticsKpiItem[];
}>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <span
                className={
                  item.tone === "critical"
                    ? "rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive"
                    : item.tone === "warning"
                      ? "rounded-full bg-[rgba(202,142,85,0.12)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]"
                      : "rounded-full bg-[#fbf8f2] px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                }
              >
                {item.secondary}
              </span>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
            <p className="text-sm leading-6 text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
