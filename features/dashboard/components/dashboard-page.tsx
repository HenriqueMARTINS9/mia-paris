import { LayoutDashboard } from "lucide-react";

import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BlockedProductionsPanel } from "@/features/dashboard/components/blocked-productions-panel";
import { DashboardKpiCards } from "@/features/dashboard/components/dashboard-kpi-cards";
import { GmailSyncStatusCard } from "@/features/dashboard/components/gmail-sync-status-card";
import { InboxTriagePanel } from "@/features/dashboard/components/inbox-triage-panel";
import { OverdueTasksPanel } from "@/features/dashboard/components/overdue-tasks-panel";
import { PriorityRequestsPanel } from "@/features/dashboard/components/priority-requests-panel";
import type { DashboardPageData } from "@/features/dashboard/types";

export function DashboardPage({
  data,
}: Readonly<{ data: DashboardPageData }>) {
  if (data.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Cockpit quotidien"
          title="Dashboard"
          badge="Temps réel"
          description="Lecture opérationnelle du jour : inbox, demandes, urgences, productions et observabilité Gmail."
        />
        <ErrorState
          title="Impossible de consolider le dashboard"
          description={data.error}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cockpit quotidien"
        title="Dashboard"
        badge="Temps réel"
        description="Vue de pilotage du jour pour absorber les emails entrants, arbitrer les priorités, sécuriser les échéances et surveiller la production."
      />

      <DashboardKpiCards kpis={data.kpis} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <PriorityRequestsPanel requests={data.priorityRequests} />
          <OverdueTasksPanel tasks={data.tasksUrgent} />
        </div>

        <div className="space-y-6">
          <InboxTriagePanel emails={data.latestEmails} />
          <BlockedProductionsPanel productions={data.productionsAtRisk} />
          <GmailSyncStatusCard
            gmailInbox={data.gmailInbox}
            latestSyncs={data.latestSyncs}
            syncError={data.syncError}
            emailRequestsCreated={data.emailRequestsCreated}
            emailRequestCreationFailures={data.emailRequestCreationFailures}
          />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Lecture opérationnelle du jour</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Le cockpit met en avant ce qui déborde, ce qui bloque et ce qui doit être transformé en action métier immédiatement.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{data.kpis.openEmails} emails à absorber</Badge>
            <Badge variant="outline">{data.kpis.tasksOverdue} retards</Badge>
            <Badge variant="outline">{data.kpis.productionsBlocked} productions bloquées</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
