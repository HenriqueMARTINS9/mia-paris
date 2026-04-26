import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/crm/page-header";
import {
  RequestPriorityBadge,
  RequestStatusBadge,
} from "@/components/crm/request-badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateDeadlineDialog } from "@/features/deadlines/components/create-deadline-dialog";
import { RequestMutationControls } from "@/features/requests/components/request-mutation-controls";
import { RequestNoteForm } from "@/features/requests/components/request-note-form";
import type { RequestDetailPageData } from "@/features/requests/detail-types";
import { RequestReplyCard } from "@/features/replies/components/request-reply-card";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { cn, formatDate, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface RequestDetailPageProps {
  data: RequestDetailPageData;
}

export function RequestDetailPage({ data }: Readonly<RequestDetailPageProps>) {
  const request = data.request;

  if (!request) {
    return null;
  }

  const linkedEmailCount = data.emails.length;
  const openTaskCount = data.tasks.filter((task) => task.status.toLowerCase() !== "done").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Demande client"
        title={request.title}
        badge={request.clientName}
        description={request.requestSummary}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/demandes">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Link>
            </Button>
            <CreateTaskDialog
              requestId={request.id}
              assignees={data.assignees}
              assigneesError={data.assigneesError}
              defaultAssignedUserId={request.assignedUserId}
              defaultDueAt={request.dueAt}
              triggerLabel="Tâche"
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
              triggerLabel="Deadline"
            />
          </>
        }
      />

      {data.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Données partielles sur certains éléments liés. La demande reste exploitable.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="gap-4 border-b border-black/[0.06] pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <RequestStatusBadge status={request.status} />
                <RequestPriorityBadge priority={request.priority} />
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  {request.requestTypeLabel}
                </Badge>
                <Badge variant="outline">{request.reference}</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div>
                  <CardTitle className="text-2xl">{request.title}</CardTitle>
                  <CardDescription className="mt-3 max-w-3xl leading-6">
                    {request.notes || request.emailPreview || "Aucun résumé opérationnel disponible."}
                  </CardDescription>
                </div>
                <div className="rounded-lg border border-black/[0.06] bg-[#fbf8f2] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Deadline
                  </p>
                  <p className="mt-2 text-lg font-semibold">{getDeadlineLabel(request.dueAt)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(request.dueAt)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <KeyInfo
                  icon={UserRound}
                  label="Client"
                  value={request.clientName}
                  detail={request.department}
                />
                <KeyInfo
                  icon={CalendarClock}
                  label="Statut"
                  value={request.rawStatus}
                  detail={request.owner}
                />
                <KeyInfo
                  icon={Mail}
                  label="Emails"
                  value={`${linkedEmailCount}`}
                  detail="rattaché(s)"
                />
                <KeyInfo
                  icon={CheckCircle2}
                  label="Tâches"
                  value={`${openTaskCount}`}
                  detail="ouverte(s)"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <SimpleCard
              icon={MessageSquareText}
              title="Ce qu’il faut retenir"
              description="Le contexte utile pour décider vite."
            >
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <MetaLine label="Action attendue" value={request.nextActions[0] ?? "À préciser"} />
                <MetaLine label="Responsable" value={request.owner} />
                <MetaLine label="Modèle" value={request.modelName ?? "Non relié"} />
                <MetaLine label="Réf client" value={request.clientRef ?? "Non renseignée"} />
              </div>
            </SimpleCard>

            <SimpleCard
              icon={FileText}
              title="Pièces utiles"
              description="Documents et validations visibles sans fouiller."
            >
              <CompactList
                emptyLabel="Aucune pièce liée pour l’instant."
                items={[
                  ...data.documents.slice(0, 3).map((document) => ({
                    meta: document.updatedAt ? formatDate(document.updatedAt) : "Sans date",
                    title: document.name,
                  })),
                  ...data.validations.slice(0, 2).map((validation) => ({
                    meta: validation.status,
                    title: validation.label,
                  })),
                ]}
              />
            </SimpleCard>
          </div>

          <SimpleCard
            icon={Mail}
            title="Emails rattachés"
            description="Les messages qui nourrissent cette demande."
            badge={`${data.emails.length}`}
          >
            <div className="space-y-3">
              {data.emails.length > 0 ? (
                data.emails.slice(0, 6).map((email) => (
                  <Link
                    key={email.id}
                    href={`/emails?email=${email.id}`}
                    className="block rounded-lg border border-black/[0.06] bg-[#fbf8f2]/70 p-4 transition hover:border-primary/25 hover:bg-primary/[0.04]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{email.subject}</p>
                      <Badge variant="outline">{email.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{email.from}</p>
                    {email.preview ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground/75">
                        {email.preview}
                      </p>
                    ) : null}
                    {email.receivedAt ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {formatDateTime(email.receivedAt)}
                      </p>
                    ) : null}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun email n’est encore rattaché à cette demande.
                </p>
              )}
            </div>
          </SimpleCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SimpleCard
              icon={CheckCircle2}
              title="Tâches"
              description="Ce qui reste à faire."
              badge={`${data.tasks.length}`}
            >
              <CompactList
                emptyLabel="Aucune tâche liée."
                items={data.tasks.slice(0, 6).map((task) => ({
                  meta: [task.status, task.assigneeName, task.dueAt ? formatDateTime(task.dueAt) : null]
                    .filter(Boolean)
                    .join(" · "),
                  title: task.title,
                }))}
              />
            </SimpleCard>

            <SimpleCard
              icon={Clock3}
              title="Deadlines"
              description="Les échéances à surveiller."
              badge={`${data.deadlines.length}`}
            >
              <CompactList
                emptyLabel="Aucune deadline liée."
                items={data.deadlines.slice(0, 6).map((deadline) => ({
                  meta: [
                    deadline.status,
                    deadline.priority,
                    deadline.deadlineAt ? formatDateTime(deadline.deadlineAt) : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  title: deadline.label,
                }))}
              />
            </SimpleCard>
          </div>
        </main>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader className="border-b border-black/[0.06] pb-4">
              <CardTitle>Pilotage</CardTitle>
              <CardDescription>
                Statut, priorité, assignation et clôture.
              </CardDescription>
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
        </aside>
      </div>
    </div>
  );
}

function KeyInfo({
  detail,
  icon: Icon,
  label,
  value,
}: Readonly<{
  detail: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 truncate font-semibold">{value}</p>
      <p className="mt-1 truncate text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function SimpleCard({
  badge,
  children,
  description,
  icon: Icon,
  title,
}: Readonly<{
  badge?: string;
  children: ReactNode;
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MetaLine({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/[0.05] pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function CompactList({
  emptyLabel,
  items,
}: Readonly<{
  emptyLabel: string;
  items: Array<{ meta: string; title: string }>;
}>) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.title}-${item.meta}`}
          className={cn(
            "rounded-lg border border-black/[0.06] bg-[#fbf8f2]/70 p-4",
            "transition-colors",
          )}
        >
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
        </div>
      ))}
    </div>
  );
}
