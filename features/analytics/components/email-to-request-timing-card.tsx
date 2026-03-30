import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsFlowPoint, AnalyticsTimingSummary } from "@/features/analytics/types";

export function EmailToRequestTimingCard({
  flowByDay,
  timing,
}: Readonly<{
  flowByDay: AnalyticsFlowPoint[];
  timing: AnalyticsTimingSummary;
}>) {
  const maxFlow = Math.max(
    1,
    ...flowByDay.flatMap((point) => [point.emails, point.requests]),
  );

  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Tempo du pipeline email → request</CardTitle>
        <CardDescription>
          Mesure la vitesse réelle de transformation du flux entrant en objets CRM actionnables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricBox
            label="Email → request"
            secondary={`${timing.sampleSize} cas`}
            value={formatHours(timing.avgEmailToRequestHours)}
          />
          <MetricBox
            label="Médiane email → request"
            secondary="vitesse typique"
            value={formatHours(timing.medianEmailToRequestHours)}
          />
          <MetricBox
            label="Request → 1re task"
            secondary={`${timing.requestToFirstTaskSampleSize} cas`}
            value={formatHours(timing.avgRequestToFirstTaskHours)}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Volume 7 derniers jours
          </p>
          <div className="grid grid-cols-7 gap-2">
            {flowByDay.map((point) => (
              <div key={point.label} className="flex flex-col items-center gap-2">
                <div className="flex h-28 items-end gap-1">
                  <div
                    className="w-3 rounded-full bg-primary/85"
                    style={{ height: `${Math.max(8, (point.emails / maxFlow) * 100)}%` }}
                    title={`${point.emails} emails`}
                  />
                  <div
                    className="w-3 rounded-full bg-[var(--accent)]/75"
                    style={{ height: `${Math.max(8, (point.requests / maxFlow) * 100)}%` }}
                    title={`${point.requests} requests`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold text-foreground">{point.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {point.emails}/{point.requests}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBox({
  label,
  secondary,
  value,
}: Readonly<{
  label: string;
  secondary: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>
    </div>
  );
}

function formatHours(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (value < 24) {
    return `${Math.round(value * 10) / 10} h`;
  }

  return `${Math.round((value / 24) * 10) / 10} j`;
}
