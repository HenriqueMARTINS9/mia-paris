import Link from "next/link";
import { ArrowRight, Factory, Mail, PackageSearch, ReceiptText } from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceDefinitions } from "@/features/workspaces/config";
import type { WorkspaceKey, WorkspacePageData } from "@/features/workspaces/types";
import { formatDateTime, getDeadlineLabel } from "@/lib/utils";

export function WorkspacePage({
  data,
  workspace,
}: Readonly<{
  data: WorkspacePageData;
  workspace: WorkspaceKey;
}>) {
  const definition = workspaceDefinitions[workspace];
  const totalVisible =
    data.requests.length +
    data.tasks.length +
    data.emails.length +
    data.productions.length +
    data.documents.length;

  if (data.error && totalVisible === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={definition.eyebrow}
          title={definition.title}
          badge={definition.badge}
          description={definition.description}
        />
        <ErrorState
          title={`Impossible de consolider ${definition.title.toLowerCase()}`}
          description={data.error}
        />
      </div>
    );
  }

  if (totalVisible === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={definition.eyebrow}
          title={definition.title}
          badge={definition.badge}
          description={definition.description}
        />
        <EmptyState
          title={`Aucun signal ${definition.title.toLowerCase()} pour le moment`}
          description="Les données CRM restent accessibles, mais aucun item n’entre actuellement dans ce périmètre métier."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={definition.eyebrow}
        title={definition.title}
        badge={definition.badge}
        description={definition.description}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={definition.primaryActionHref}>
                {definition.primaryActionLabel}
              </Link>
            </Button>
            <Button asChild>
              <Link href={definition.secondaryActionHref}>
                {definition.secondaryActionLabel}
              </Link>
            </Button>
          </>
        }
      />

      {data.error ? (
        <Card className="border-[#ca8e55]/25 bg-[#fbf8f2]/92">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Certaines sources restent partielles : {data.error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            accent={metric.accent}
            hint={metric.hint}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demandes actives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.requests.length > 0 ? (
              data.requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/82 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{request.requestTypeLabel}</Badge>
                    <Badge variant="outline" className="bg-white">
                      {request.priority}
                    </Badge>
                  </div>
                  <p className="mt-3 font-semibold text-foreground">{request.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.clientName} · {request.owner}
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">
                    {request.dueAt ? getDeadlineLabel(request.dueAt) : "Sans deadline"}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyBlock message="Aucune demande active dans ce périmètre." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tâches ouvertes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tasks.length > 0 ? (
              data.tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/taches/${task.id}`}
                  className="block rounded-[1.15rem] border border-black/[0.06] bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{task.taskTypeLabel}</Badge>
                    <Badge variant={task.isOverdue ? "destructive" : "outline"}>
                      {task.status}
                    </Badge>
                  </div>
                  <p className="mt-3 font-semibold text-foreground">{task.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {task.clientName} · {task.owner}
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">
                    {task.dueAt ? formatDateTime(task.dueAt) : "Sans échéance"}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyBlock message="Aucune tâche ouverte sur ce flux." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Inbox liée</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/emails">
                Ouvrir l’inbox
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.emails.length > 0 ? (
              data.emails.map((email) => (
                <Link
                  key={email.id}
                  href="/emails"
                  className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/82 px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={email.status === "review" ? "destructive" : "outline"}>
                          {email.status}
                        </Badge>
                        {email.detectedType ? (
                          <Badge variant="outline" className="bg-white">
                            {email.detectedType}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 font-semibold text-foreground">{email.subject}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {email.fromName} · {email.clientName}
                      </p>
                      <p className="mt-2 text-sm text-foreground/80">
                        {formatDateTime(email.receivedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyBlock message="Aucun email entrant encore visible pour ce pôle." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {workspace === "billing" ? "Documents & chiffrage" : "Flux production"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace === "billing" ? (
              data.documents.length > 0 ? (
                data.documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.url ?? "#"}
                    target={document.url ? "_blank" : undefined}
                    rel={document.url ? "noreferrer" : undefined}
                    className="block rounded-[1.15rem] border border-black/[0.06] bg-white px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(202,142,85,0.12)] text-[var(--accent)]">
                        <ReceiptText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{document.type}</Badge>
                        </div>
                        <p className="mt-3 font-semibold text-foreground">{document.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {document.relatedLabel ?? "Document métier"}
                        </p>
                        <p className="mt-2 text-sm text-foreground/80">
                          {document.updatedAt ? formatDateTime(document.updatedAt) : "Date inconnue"}
                        </p>
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                <EmptyBlock message="Aucun document prix / facture encore relié." />
              )
            ) : data.productions.length > 0 ? (
              data.productions.map((production) => (
                <Link
                  key={production.id}
                  href="/productions"
                  className="block rounded-[1.15rem] border border-black/[0.06] bg-white px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                      {workspace === "logistics" ? (
                        <Factory className="h-4 w-4" />
                      ) : (
                        <PackageSearch className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={production.isBlocked ? "destructive" : "outline"}>
                          {production.status}
                        </Badge>
                        <Badge variant="outline" className="bg-white">
                          {production.risk}
                        </Badge>
                      </div>
                      <p className="mt-3 font-semibold text-foreground">
                        {production.orderNumber}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {production.clientName} · {production.modelName}
                      </p>
                      <p className="mt-2 text-sm text-foreground/80">
                        {production.blockingReason ??
                          production.plannedEndAt ??
                          production.productionModeLabel}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyBlock message="Aucune production visible dans ce périmètre." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyBlock({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
