import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { DashboardFocusCards } from "@/features/dashboard/components/dashboard-focus-cards";
import { DashboardTodayActivity } from "@/features/dashboard/components/dashboard-today-activity";
import { InboxTriagePanel } from "@/features/dashboard/components/inbox-triage-panel";
import { PriorityRequestsPanel } from "@/features/dashboard/components/priority-requests-panel";
import { RecentAssistantActionsCard } from "@/features/dashboard/components/recent-assistant-actions-card";
import { GmailAutoSyncBridge } from "@/features/emails/components/gmail-auto-sync-bridge";
import type { DashboardPageData } from "@/features/dashboard/types";

export function DashboardPage({
  data,
}: Readonly<{
  data: DashboardPageData;
}>) {
  if (data.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Cockpit quotidien"
          title="Dashboard"
          badge="Essentiel"
          description="Vue de contrôle simplifiée : uniquement ce qui demande une vérification, une validation ou une reprise en main."
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
      <GmailAutoSyncBridge gmailInbox={data.gmailInbox} />

      <PageHeader
        eyebrow="Cockpit quotidien"
        title="Dashboard"
        badge="Essentiel"
        description="Claw agit, le CRM résume, vous vérifiez. Cette vue ne garde que ce qui mérite vraiment votre attention aujourd’hui."
      />

      <DashboardFocusCards kpis={data.kpis} />

      <DashboardTodayActivity
        emails={data.todayEmails}
        requests={data.todayRequests}
        summary={data.todaySummary}
        tasks={data.todayTasks}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <PriorityRequestsPanel
          requests={data.unassignedRequests}
          title="Demandes non assignées"
          description="Demandes déjà captées par le CRM, mais qui attendent encore un responsable."
          emptyMessage="Toutes les demandes visibles ont déjà un responsable."
        />
        <InboxTriagePanel
          emails={data.importantEmails}
          href="/emails?bucket=important"
          title="Emails importants à vérifier"
          description="Messages que Claw a laissés dans l’inbox principale pour validation ou arbitrage."
          emptyMessage="Aucun email important ne demande votre attention immédiate."
        />
      </div>

      <RecentAssistantActionsCard actions={data.recentAssistantActions} />
    </div>
  );
}
