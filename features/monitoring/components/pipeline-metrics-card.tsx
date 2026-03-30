import { Activity, BriefcaseBusiness } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringPipelineMetrics } from "@/features/monitoring/types";

export function PipelineMetricsCard({
  metrics,
}: Readonly<{
  metrics: MonitoringPipelineMetrics;
}>) {
  const items = [
    {
      id: "emails",
      label: "Emails non traités",
      value: metrics.emailsNonTraites,
    },
    {
      id: "requests-today",
      label: "Requests créées aujourd’hui",
      value: metrics.requestsCreatedToday,
    },
    {
      id: "requests-success",
      label: "Email -> request réussis",
      value: metrics.emailRequestsCreated,
    },
    {
      id: "requests-failures",
      label: "Email -> request en échec",
      value: metrics.emailRequestCreationFailures,
    },
    {
      id: "tasks-overdue",
      label: "Tasks overdue",
      value: metrics.tasksOverdue,
    },
    {
      id: "blocked-productions",
      label: "Productions bloquées",
      value: metrics.productionsBlocked,
    },
    {
      id: "validations",
      label: "Validations pending",
      value: metrics.validationsPending,
    },
  ];

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
          Pipeline Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <p className="text-sm">{item.label}</p>
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
