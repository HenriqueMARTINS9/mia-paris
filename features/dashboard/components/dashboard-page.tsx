import { ErrorState } from "@/components/crm/error-state";
import { MobileQuickActionsSheet } from "@/components/crm/mobile-quick-actions-sheet";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BlockedProductionsPanel } from "@/features/dashboard/components/blocked-productions-panel";
import { DashboardKpiCards } from "@/features/dashboard/components/dashboard-kpi-cards";
import { GmailSyncHistoryPanel } from "@/features/dashboard/components/gmail-sync-history-panel";
import { GmailSyncStatusCard } from "@/features/dashboard/components/gmail-sync-status-card";
import { InboxTriagePanel } from "@/features/dashboard/components/inbox-triage-panel";
import { ManualCreatePanel } from "@/features/dashboard/components/manual-create-panel";
import { MobileBlockedProductionsCard } from "@/features/dashboard/components/mobile-blocked-productions-card";
import { MobileDashboardKpis } from "@/features/dashboard/components/mobile-dashboard-kpis";
import { MobileInboxTriageCard } from "@/features/dashboard/components/mobile-inbox-triage-card";
import { MobileSyncStatusCard } from "@/features/dashboard/components/mobile-sync-status-card";
import { MobileUrgentTasksCard } from "@/features/dashboard/components/mobile-urgent-tasks-card";
import { OverdueTasksPanel } from "@/features/dashboard/components/overdue-tasks-panel";
import { PriorityRequestsPanel } from "@/features/dashboard/components/priority-requests-panel";
import { CreateDeadlineDialog } from "@/features/deadlines/components/create-deadline-dialog";
import type { DocumentFormOptions } from "@/features/documents/types";
import type { ProductionFormOptions } from "@/features/productions/types";
import { CreateRequestDialog } from "@/features/requests/components/create-request-dialog";
import type { RequestAssigneeOption, RequestFormOptions, RequestLinkOption } from "@/features/requests/types";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import type { ValidationFormOptions } from "@/features/validations/types";
import type { DashboardPageData } from "@/features/dashboard/types";

export function DashboardPage({
  assignees,
  assigneesError = null,
  data,
  deadlineRequestOptions,
  deadlineRequestOptionsError = null,
  documentOptions,
  documentOptionsError = null,
  productionOptions,
  productionOptionsError = null,
  requestFormOptions,
  requestFormOptionsError = null,
  requestOptions,
  requestOptionsError = null,
  validationOptions,
  validationOptionsError = null,
}: Readonly<DashboardPageProps>) {
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

      <div className="md:hidden">
        <MobileQuickActionsSheet description="Créer vite un objet métier, relancer Gmail ou basculer vers les urgences.">
          <div className="grid gap-3">
            <CreateRequestDialog
              options={requestFormOptions}
              optionsError={requestFormOptionsError}
              triggerLabel="Créer une demande"
            />
            <CreateTaskDialog
              assignees={assignees}
              assigneesError={assigneesError}
              requestOptions={requestOptions}
              requestOptionsError={requestOptionsError}
              triggerLabel="Créer une tâche"
            />
            <CreateDeadlineDialog
              requestOptions={deadlineRequestOptions}
              requestOptionsError={deadlineRequestOptionsError}
              triggerLabel="Créer une deadline"
            />
            <GmailSyncStatusCard
              gmailInbox={data.gmailInbox}
              latestSyncs={data.latestSyncs}
              syncError={data.syncError}
              emailRequestsCreated={data.emailRequestsCreated}
              emailRequestCreationFailures={data.emailRequestCreationFailures}
            />
          </div>
        </MobileQuickActionsSheet>
      </div>

      <Card className="md:hidden">
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-base font-semibold tracking-tight text-foreground">
            Priorité mobile du jour
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Commence par les emails entrants, les urgences et les retards qui bloquent le flux client.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:hidden">
        <MobileDashboardKpis kpis={data.kpis} />
        <MobileInboxTriageCard emails={data.latestEmails} />
        <MobileUrgentTasksCard tasks={data.tasksUrgent} />
        <MobileBlockedProductionsCard productions={data.productionsAtRisk} />
        <MobileSyncStatusCard
          gmailInbox={data.gmailInbox}
          latestSyncs={data.latestSyncs}
        />
      </div>

      <Card className="hidden md:block">
        <CardContent className="flex flex-col gap-4 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-[#fbf8f2]">
                Brief du jour
              </Badge>
              <Badge variant="outline" className="bg-white">
                {data.kpis.openEmails} emails à absorber
              </Badge>
              <Badge variant="outline" className="bg-white">
                {data.kpis.urgencies24h} urgences &lt; 24h
              </Badge>
            </div>
            <p className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Commence par l’inbox et les urgences, puis traite les retards et les blocages qui freinent le pipeline.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              L’écran met d’abord en avant les signaux critiques, puis le détail opérationnel par bloc métier, sans doublons visuels ni panneaux qui se concurrencent.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="hidden md:block">
        <DashboardKpiCards kpis={data.kpis} />
      </div>

      <div className="hidden md:block">
        <ManualCreatePanel
          assignees={assignees}
          assigneesError={assigneesError}
          deadlineRequestOptions={deadlineRequestOptions}
          deadlineRequestOptionsError={deadlineRequestOptionsError}
          documentOptions={documentOptions}
          documentOptionsError={documentOptionsError}
          productionOptions={productionOptions}
          productionOptionsError={productionOptionsError}
          requestFormOptions={requestFormOptions}
          requestFormOptionsError={requestFormOptionsError}
          requestOptions={requestOptions}
          requestOptionsError={requestOptionsError}
          validationOptions={validationOptions}
          validationOptionsError={validationOptionsError}
        />
      </div>

      <div className="hidden gap-6 md:grid xl:grid-cols-2">
        <PriorityRequestsPanel requests={data.priorityRequests} />
        <InboxTriagePanel emails={data.latestEmails} />
        <OverdueTasksPanel tasks={data.tasksUrgent} />
        <BlockedProductionsPanel productions={data.productionsAtRisk} />
      </div>

      <div className="hidden gap-6 md:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <GmailSyncStatusCard
          gmailInbox={data.gmailInbox}
          latestSyncs={data.latestSyncs}
          syncError={data.syncError}
          emailRequestsCreated={data.emailRequestsCreated}
          emailRequestCreationFailures={data.emailRequestCreationFailures}
        />
        <GmailSyncHistoryPanel latestSyncs={data.latestSyncs} />
      </div>
    </div>
  );
}

type DashboardPageProps = {
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  data: DashboardPageData;
  deadlineRequestOptions: RequestLinkOption[];
  deadlineRequestOptionsError?: string | null;
  documentOptions: DocumentFormOptions;
  documentOptionsError?: string | null;
  productionOptions: ProductionFormOptions;
  productionOptionsError?: string | null;
  requestFormOptions: RequestFormOptions;
  requestFormOptionsError?: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
  validationOptions: ValidationFormOptions;
  validationOptionsError?: string | null;
};
