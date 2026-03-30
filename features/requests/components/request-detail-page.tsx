import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  FileText,
  FolderKanban,
  History,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";

import { CreateRequestTaskForm } from "@/features/tasks/components/create-request-task-form";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { RequestMutationControls } from "@/features/requests/components/request-mutation-controls";
import { RequestNoteForm } from "@/features/requests/components/request-note-form";
import { RequestReplyCard } from "@/features/replies/components/request-reply-card";
import { RequestHistoryPanel } from "@/features/history/components/request-history-panel";
import { CreateDeadlineDialog } from "@/features/deadlines/components/create-deadline-dialog";
import type { RequestDetailPageData } from "@/features/requests/detail-types";
import {
  ProductionStageBadge,
  RequestPriorityBadge,
  RequestStatusBadge,
} from "@/components/crm/request-badges";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface RequestDetailPageProps {
  data: RequestDetailPageData;
}

const activityTone = {
  deadline: "bg-destructive/10 text-destructive",
  document: "bg-[rgba(58,88,122,0.12)] text-[#42566b]",
  email: "bg-primary/10 text-primary",
  request: "bg-[rgba(202,142,85,0.12)] text-[var(--accent)]",
  task: "bg-[rgba(18,92,120,0.12)] text-[#125c78]",
  validation: "bg-[rgba(95,78,145,0.12)] text-[#5f4e91]",
} as const;

export function RequestDetailPage({ data }: Readonly<RequestDetailPageProps>) {
  const request = data.request;

  if (!request) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Dossier demande"
        title={request.reference}
        badge={request.clientName}
        description={request.sourceSubject}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/demandes">
                <ArrowLeft className="h-4 w-4" />
                Retour Demandes
              </Link>
            </Button>
            <CreateTaskDialog
              requestId={request.id}
              assignees={data.assignees}
              assigneesError={data.assigneesError}
              defaultAssignedUserId={request.assignedUserId}
              defaultDueAt={request.dueAt}
              triggerLabel="Nouvelle tâche"
            />
            <CreateDeadlineDialog
              defaultDeadlineAt={request.dueAt}
              defaultRequestId={request.id}
              requestOptions={[
                {
                  clientName: request.clientName,
                  id: request.id,
                  label: `${request.reference} · ${request.title}`,
                },
              ]}
              triggerLabel="Nouvelle deadline"
            />
          </>
        }
      />

      {data.warnings.length > 0 ? (
        <Card className="border-[rgba(202,142,85,0.18)] bg-[rgba(202,142,85,0.08)]">
          <CardContent className="flex flex-col gap-2 p-5 text-sm text-foreground/80">
            <p className="font-semibold">Certaines données liées sont partielles</p>
            {data.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_400px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="space-y-5 border-b border-black/[0.06] pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <RequestStatusBadge status={request.status} />
                <RequestPriorityBadge priority={request.priority} />
                <ProductionStageBadge stage={request.productionStage} />
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  {request.requestTypeLabel}
                </Badge>
              </div>
              <div>
                <CardTitle className="text-[1.5rem]">{request.title}</CardTitle>
                <CardDescription className="mt-3 max-w-3xl">
                  {request.requestSummary}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <DetailStatCard
                label="Client / département"
                value={request.clientName}
                meta={request.department}
              />
              <DetailStatCard
                label="Modèle"
                value={request.modelName ?? "Non relié"}
                meta={request.modelReference ?? "Aucune référence modèle"}
              />
              <DetailStatCard
                label="Deadline principale"
                value={getDeadlineLabel(request.dueAt)}
                meta={formatDateTime(request.dueAt)}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Infos client / dossier"
              icon={Users}
              content={
                <div className="space-y-3 text-sm">
                  <MetaRow label="Client" value={request.clientName} />
                  <MetaRow label="Département" value={request.department} />
                  <MetaRow
                    label="Réf interne"
                    value={request.internalRef ?? "Non renseignée"}
                  />
                  <MetaRow
                    label="Réf client"
                    value={request.clientRef ?? "Non renseignée"}
                  />
                  <MetaRow label="Owner" value={request.owner} />
                </div>
              }
            />

            <SectionCard
              title="Résumé opérationnel"
              icon={Package}
              content={
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-foreground/80">
                    {request.notes}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {request.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="normal-case tracking-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RelatedSection
              title="Tâches liées"
              icon={FolderKanban}
              badge={`${data.tasks.length}`}
              emptyMessage="Aucune tâche liée disponible pour cette demande."
            >
              {data.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{task.title}</p>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {task.taskType}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {task.status} · {task.priority}
                  </p>
                  <p className="mt-3 text-sm text-foreground/80">
                    {task.assigneeName}
                    {task.dueAt ? ` · ${formatDateTime(task.dueAt)}` : ""}
                  </p>
                </div>
              ))}
            </RelatedSection>

            <RelatedSection
              title="Deadlines liées"
              icon={Clock3}
              badge={`${data.deadlines.length}`}
              emptyMessage="Aucune deadline liée disponible."
            >
              {data.deadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{deadline.label}</p>
                    <Badge variant="secondary" className="normal-case tracking-normal">
                      {deadline.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {deadline.status}
                  </p>
                  <p className="mt-3 text-sm text-foreground/80">
                    {deadline.deadlineAt
                      ? formatDateTime(deadline.deadlineAt)
                      : "Pas de date renseignée"}
                  </p>
                </div>
              ))}
            </RelatedSection>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RelatedSection
              title="Validations liées"
              icon={ShieldCheck}
              badge={`${data.validations.length}`}
              emptyMessage="Aucune validation liée disponible."
            >
              {data.validations.map((validation) => (
                <div
                  key={validation.id}
                  className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{validation.label}</p>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {validation.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {validation.decision ?? "Décision non renseignée"}
                  </p>
                  <p className="mt-3 text-sm text-foreground/80">
                    {validation.ownerName ?? "Owner non renseigné"}
                    {validation.updatedAt
                      ? ` · ${formatDateTime(validation.updatedAt)}`
                      : ""}
                  </p>
                </div>
              ))}
            </RelatedSection>

            <RelatedSection
              title="Documents liés"
              icon={FileText}
              badge={`${data.documents.length}`}
              emptyMessage="Aucun document lié disponible."
            >
              {data.documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{document.name}</p>
                    <Badge variant="secondary" className="normal-case tracking-normal">
                      {document.type}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {document.status ?? "Statut non renseigné"}
                  </p>
                  <p className="mt-3 text-sm text-foreground/80">
                    {document.updatedAt
                      ? `Mis à jour ${formatDate(document.updatedAt)}`
                      : "Aucune date disponible"}
                  </p>
                  {document.url ? (
                    <div className="mt-3">
                      <Button asChild variant="outline" size="sm">
                        <a href={document.url} target="_blank" rel="noreferrer">
                          Ouvrir le document
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </RelatedSection>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Historique d&apos;activité</CardTitle>
              </div>
              <CardDescription>
                Consolidation des objets liés disponibles autour de la demande.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.history.length > 0 ? (
                data.history.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-4"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[11px] font-semibold uppercase tracking-[0.14em] ${activityTone[event.category]}`}
                    >
                      {event.category.slice(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(event.date)}
                      </p>
                      {event.description ? (
                        <p className="mt-2 text-sm leading-6 text-foreground/80">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun historique exploitable n&apos;est disponible pour cette
                  demande.
                </p>
              )}
            </CardContent>
          </Card>

          <RequestHistoryPanel data={data.historyContext} />
        </div>

        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <Card>
            <CardHeader className="space-y-4 border-b border-black/[0.06] pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <RequestStatusBadge status={request.status} />
                <RequestPriorityBadge priority={request.priority} />
              </div>
              <div>
                <CardTitle>Actions dossier</CardTitle>
                <CardDescription>
                  Statut, priorité, assignation et clôture rapide du dossier.
                </CardDescription>
              </div>
            </CardHeader>
          <CardContent>
              <RequestMutationControls
                key={`${request.id}:${request.status}:${request.priority}:${request.assignedUserId ?? "none"}`}
                request={request}
                assignees={data.assignees}
                assigneesError={data.assigneesError}
              />
          </CardContent>
          </Card>

          <RequestNoteForm
            key={`${request.id}:${request.updatedAt}:${request.persistedNote ?? ""}`}
            requestId={request.id}
            existingNote={request.persistedNote}
            noteField={request.noteField}
          />

          <RequestReplyCard request={request} historyContext={data.historyContext} />

          <CreateRequestTaskForm
            key={`${request.id}:${request.assignedUserId ?? "none"}:${request.dueAt}`}
            requestId={request.id}
            assignees={data.assignees}
            assigneesError={data.assigneesError}
            defaultAssignedUserId={request.assignedUserId}
            defaultDueAt={request.dueAt}
          />
        </div>
      </div>
    </div>
  );
}

interface DetailStatCardProps {
  label: string;
  meta: string;
  value: string;
}

function DetailStatCard({ label, meta, value }: Readonly<DetailStatCardProps>) {
  return (
    <div className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-base font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}

interface SectionCardProps {
  content: ReactNode;
  icon: ComponentType<{ className?: string }>;
  title: string;
}

function SectionCard({ content, icon: Icon, title }: Readonly<SectionCardProps>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

interface RelatedSectionProps {
  badge: string;
  children: ReactNode;
  emptyMessage: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}

function RelatedSection({
  badge,
  children,
  emptyMessage,
  icon: Icon,
  title,
}: Readonly<RelatedSectionProps>) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean);

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant="outline">{badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasItems ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface MetaRowProps {
  label: string;
  value: string;
}

function MetaRow({ label, value }: Readonly<MetaRowProps>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
