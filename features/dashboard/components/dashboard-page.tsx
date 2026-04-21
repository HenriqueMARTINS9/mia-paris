import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { BlockedProductionsPanel } from "@/features/dashboard/components/blocked-productions-panel";
import { DashboardFocusCards } from "@/features/dashboard/components/dashboard-focus-cards";
import { DashboardShortcutsCard } from "@/features/dashboard/components/dashboard-shortcuts-card";
import { InboxTriagePanel } from "@/features/dashboard/components/inbox-triage-panel";
import { PriorityRequestsPanel } from "@/features/dashboard/components/priority-requests-panel";
import { RecentAssistantActionsCard } from "@/features/dashboard/components/recent-assistant-actions-card";
import { TodayUrgenciesPanel } from "@/features/dashboard/components/today-urgencies-panel";
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <TodayUrgenciesPanel deadlines={data.urgentDeadlines} />
        <DashboardShortcutsCard />
      </div>

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
        <BlockedProductionsPanel
          productions={data.blockedProductions}
          title="Productions bloquées"
          description="Blocages à lever vite pour éviter un impact planning ou atelier."
          emptyMessage="Aucune production bloquée à signaler pour le moment."
        />
        <BlockedProductionsPanel
          productions={data.highRiskProductions}
          title="Productions à risque élevé"
          description="Productions à surveiller de près, même sans blocage franc pour l’instant."
          emptyMessage="Aucune production à risque élevé ne remonte dans le cockpit."
        />
      </div>

      <RecentAssistantActionsCard actions={data.recentAssistantActions} />
    </div>
  );
}
