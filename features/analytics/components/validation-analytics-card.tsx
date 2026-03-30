import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsPageData } from "@/features/analytics/types";
import { formatDateTime } from "@/lib/utils";

export function ValidationAnalyticsCard({
  validation,
}: Readonly<{
  validation: AnalyticsPageData["validation"];
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Validations</CardTitle>
        <CardDescription>
          Temps moyen de cycle et validations qui s’éternisent encore dans le flux.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBox
            label="Temps moyen"
            value={formatHours(validation.averageHours)}
          />
          <StatBox label="Pending" value={String(validation.pendingCount)} />
          <StatBox label="Mesure" value={String(validation.sampleSize)} />
        </div>

        {validation.slowest.length > 0 ? (
          <div className="space-y-3">
            {validation.slowest.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.label}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.status}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatHours(item.turnaroundHours)}</p>
                    {item.updatedAt ? <p>{formatDateTime(item.updatedAt)}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pas encore assez de validations clôturées pour sortir une tendance fiable.
          </p>
        )}
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

function formatHours(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (value < 24) {
    return `${Math.round(value * 10) / 10} h`;
  }

  return `${Math.round((value / 24) * 10) / 10} j`;
}
