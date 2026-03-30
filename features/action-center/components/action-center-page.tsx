import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { AutomationRulesList } from "@/features/automations/components/automation-rules-list";
import { AutomationRunHistoryPanel } from "@/features/automations/components/automation-run-history-panel";
import { AutomationSummaryCard } from "@/features/automations/components/automation-summary-card";
import { ToDecidePanel } from "@/features/action-center/components/to-decide-panel";
import { ToProcessPanel } from "@/features/action-center/components/to-process-panel";
import { GmailSyncControls } from "@/features/emails/components/gmail-sync-controls";
import type { ActionCenterPageData } from "@/features/action-center/types";

export function ActionCenterPage({
  data,
}: Readonly<{ data: ActionCenterPageData }>) {
  if (data.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Centre d’action"
          title="À traiter / À décider"
          badge="Opérationnel"
          description="Vue concentrée sur les signaux qui nécessitent une action humaine immédiate ou un arbitrage métier."
        />
        <ErrorState
          title="Impossible de consolider le centre d’action"
          description={data.error}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Centre d’action"
        title="À traiter / À décider"
        badge={`${data.overview.summary.totalOpen} alertes`}
        description="L’écran priorise ce qui demande une action humaine rapide pour tenir les délais, absorber l’inbox et arbitrer les dossiers textile B2B."
        actions={<GmailSyncControls gmailInbox={data.gmailInbox} />}
      />

      <AutomationSummaryCard overview={data.overview} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ToProcessPanel
          assignees={data.assignees}
          assigneesError={data.assigneesError}
          currentAppUserId={data.currentAppUserId}
          items={data.toProcess}
        />
        <ToDecidePanel
          assignees={data.assignees}
          assigneesError={data.assigneesError}
          currentAppUserId={data.currentAppUserId}
          items={data.toDecide}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AutomationRulesList rules={data.overview.rules} />
        <AutomationRunHistoryPanel runs={data.overview.runs} />
      </div>
    </div>
  );
}
