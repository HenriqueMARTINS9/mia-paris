import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { AnalyticsKpiCards } from "@/features/analytics/components/analytics-kpi-cards";
import { EmailToRequestTimingCard } from "@/features/analytics/components/email-to-request-timing-card";
import { OverdueTasksAnalyticsCard } from "@/features/analytics/components/overdue-tasks-analytics-card";
import { ProductionRiskAnalyticsCard } from "@/features/analytics/components/production-risk-analytics-card";
import { RequestsByClientChart } from "@/features/analytics/components/requests-by-client-chart";
import { RequestsByTypeChart } from "@/features/analytics/components/requests-by-type-chart";
import { ValidationAnalyticsCard } from "@/features/analytics/components/validation-analytics-card";
import type { AnalyticsPageData } from "@/features/analytics/types";

export function AnalyticsOverviewPage({
  data,
}: Readonly<{
  data: AnalyticsPageData;
}>) {
  const header = (
    <PageHeader
      eyebrow="Pilotage intelligent"
      title="Analytics métier"
      badge="Ops"
      description="Lecture sobre des volumes, timings, retards et risques pour piloter MIA PARIS sans bruit visuel inutile."
    />
  );

  if (data.error) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Impossible de consolider les analytics"
          description={data.error}
        />
      </div>
    );
  }

  if (data.kpis.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="Pas encore assez de données"
          description="Les analytics se rempliront dès que les emails, demandes, tâches et productions auront suffisamment d’historique."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <AnalyticsKpiCards items={data.kpis} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <EmailToRequestTimingCard
          flowByDay={data.flowByDay}
          timing={data.timing}
        />
        <RequestsByTypeChart items={data.requestsByType} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <RequestsByClientChart items={data.requestsByClient} />
        <OverdueTasksAnalyticsCard overdue={data.overdue} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ProductionRiskAnalyticsCard productionRisk={data.productionRisk} />
        <ValidationAnalyticsCard validation={data.validation} />
      </div>
    </div>
  );
}
