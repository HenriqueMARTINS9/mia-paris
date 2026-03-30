import Link from "next/link";
import { ClipboardList, Sparkles } from "lucide-react";

import { ErrorState } from "@/components/crm/error-state";
import { MobileQuickActionsSheet } from "@/components/crm/mobile-quick-actions-sheet";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateDeadlineDialog } from "@/features/deadlines/components/create-deadline-dialog";
import type { DocumentFormOptions } from "@/features/documents/types";
import { NotificationPreferencesCard } from "@/features/notifications/components/notification-preferences-card";
import type { NotificationPreferencesState } from "@/features/notifications/types";
import { AutomationSummaryCard } from "@/features/automations/components/automation-summary-card";
import { TodayBlockedProductionsPanel } from "@/features/today/components/today-blocked-productions-panel";
import { TodayEmailsPanel } from "@/features/today/components/today-emails-panel";
import { TodaySyncStatusPanel } from "@/features/today/components/today-sync-status-panel";
import { TodayTasksPanel } from "@/features/today/components/today-tasks-panel";
import { TodayUrgenciesPanel } from "@/features/today/components/today-urgencies-panel";
import type { TodayOverviewData } from "@/features/today/types";
import { CreateRequestDialog } from "@/features/requests/components/create-request-dialog";
import type { RequestAssigneeOption, RequestFormOptions, RequestLinkOption } from "@/features/requests/types";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { formatCompactNumber } from "@/lib/utils";

export function TodayOverviewPage({
  assignees,
  assigneesError = null,
  data,
  deadlineRequestOptions,
  deadlineRequestOptionsError = null,
  documentOptions,
  documentOptionsError = null,
  notificationPreferencesState,
  requestFormOptions,
  requestFormOptionsError = null,
  requestOptions,
  requestOptionsError = null,
}: Readonly<{
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  data: TodayOverviewData;
  deadlineRequestOptions: RequestLinkOption[];
  deadlineRequestOptionsError?: string | null;
  documentOptions: DocumentFormOptions;
  documentOptionsError?: string | null;
  notificationPreferencesState: NotificationPreferencesState;
  requestFormOptions: RequestFormOptions;
  requestFormOptionsError?: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
}>) {
  if (data.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Vue du jour"
          title="Aujourd’hui"
          badge="Mobile first"
          description="Lecture rapide des priorités quotidiennes : inbox, urgences, retards, productions bloquées et sync Gmail."
        />
        <ErrorState
          title="Impossible de charger Aujourd’hui"
          description={data.error}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Vue du jour"
        title="Aujourd’hui"
        badge="Opérationnel"
        description="Le cockpit quotidien MIA PARIS pour absorber l’inbox, sécuriser les urgences et lever les blocages métier en quelques taps."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <TodayKpiCard label="Emails à trier" value={data.kpis.emailsToTriage} href="/emails" />
        <TodayKpiCard label="Urgences < 24h" value={data.kpis.urgencies24h} href="/deadlines" />
        <TodayKpiCard label="Tâches du jour" value={data.kpis.tasksToday} href="/taches" />
        <TodayKpiCard label="Demandes sans assignation" value={data.kpis.unassignedRequests} href="/demandes" />
        <TodayKpiCard label="Productions bloquées" value={data.kpis.blockedProductions} href="/productions" />
        <TodayKpiCard label="Validations en attente" value={data.kpis.pendingValidations} href="/validations-ia" />
      </div>

      <AutomationSummaryCard compact overview={data.automationOverview} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <TodayEmailsPanel emails={data.emailsToTriage} />
        <TodaySyncStatusPanel
          gmailInbox={data.gmailInbox}
          latestSyncs={data.latestSyncs}
        />
      </div>

      <NotificationPreferencesCard state={notificationPreferencesState} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TodayUrgenciesPanel deadlines={data.urgencies24h} />
        <TodayTasksPanel tasks={data.tasksToday} />
        <TodayBlockedProductionsPanel productions={data.blockedProductions} />

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">Demandes sans assignation</p>
            </div>
            {data.unassignedRequests.length > 0 ? (
              data.unassignedRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-4"
                >
                  <p className="truncate font-semibold text-foreground">
                    {request.clientName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {request.title}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-white">
                      {request.requestTypeLabel}
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      Score {formatCompactNumber(request.urgencyScore)}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                Toutes les demandes prioritaires sont assignées.
              </p>
            )}

            <div className="rounded-[1.15rem] border border-black/[0.06] bg-white px-4 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">Validations en attente</p>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {data.pendingValidations}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Les validations nécessitant une revue métier restent visibles dans Validation IA.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden">
        <MobileQuickActionsSheet description="Créer vite un objet métier ou relancer la sync Gmail.">
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
            {documentOptions.requests.length > 0 || documentOptions.models.length > 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Documents métier disponibles depuis Emails, Demandes et Productions.
                  {documentOptionsError ? ` ${documentOptionsError}` : ""}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </MobileQuickActionsSheet>
      </div>
    </div>
  );
}

function TodayKpiCard({
  href,
  label,
  value,
}: Readonly<{
  href: string;
  label: string;
  value: number;
}>) {
  return (
    <Link
      href={href}
      className="rounded-[1.2rem] border border-black/[0.06] bg-white/88 px-4 py-4 shadow-[0_14px_34px_rgba(18,27,34,0.04)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {formatCompactNumber(value)}
      </p>
    </Link>
  );
}
