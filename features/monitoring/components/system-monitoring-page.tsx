import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { ActionFailuresCard } from "@/features/monitoring/components/action-failures-card";
import { GmailSyncHealthCard } from "@/features/monitoring/components/gmail-sync-health-card";
import { PipelineMetricsCard } from "@/features/monitoring/components/pipeline-metrics-card";
import { RecentSystemEventsCard } from "@/features/monitoring/components/recent-system-events-card";
import type { MonitoringPageData } from "@/features/monitoring/types";

export function SystemMonitoringPage({
  data,
}: Readonly<{
  data: MonitoringPageData;
}>) {
  const header = (
    <PageHeader
      eyebrow="System"
      title="Monitoring"
      badge="Prod"
      description="Vue minimale mais exploitable pour surveiller la sync Gmail, les échecs d’actions sensibles et les métriques pipeline MIA PARIS."
    />
  );

  if (data.error) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Monitoring indisponible"
          description={data.error}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <GmailSyncHealthCard health={data.gmailHealth} />
        <PipelineMetricsCard metrics={data.pipeline} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ActionFailuresCard
          items={data.failures.items}
          last24h={data.failures.last24h}
          last7d={data.failures.last7d}
        />
        <RecentSystemEventsCard items={data.recentEvents} />
      </div>
    </div>
  );
}
