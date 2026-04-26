import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  Sparkles,
} from "lucide-react";

import { RequestPriorityBadge, RequestStatusBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import type { TaskStatus } from "@/features/tasks/types";
import type {
  DashboardDailySummaryPreview,
  DashboardTodayEmailItem,
  DashboardTodayRequestItem,
  DashboardTodayTaskItem,
} from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils";

export function DashboardTodayActivity({
  emails,
  requests,
  summary,
  tasks,
}: Readonly<{
  emails: DashboardTodayEmailItem[];
  requests: DashboardTodayRequestItem[];
  summary: DashboardDailySummaryPreview | null;
  tasks: DashboardTodayTaskItem[];
}>) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
      <TodaySummaryCard summary={summary} emails={emails} />
      <TodayWorklogCard requests={requests} tasks={tasks} />
    </div>
  );
}

function TodaySummaryCard({
  emails,
  summary,
}: Readonly<{
  emails: DashboardTodayEmailItem[];
  summary: DashboardDailySummaryPreview | null;
}>) {
  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-white via-[#fbf8f2] to-[#f6efe1]">
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle>Synthèse du jour</CardTitle>
          </div>
          <Badge variant="outline" className="bg-white/70">
            {summary ? `${summary.summaryTime}` : "En attente"}
          </Badge>
        </div>
        <CardDescription>
          Résumé écrit par Claw et derniers emails reçus aujourd’hui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {summary ? (
          <div className="rounded-[1.35rem] border border-primary/10 bg-white/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{summary.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {summary.overview}
                </p>
              </div>
              <Link
                href="/syntheses"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
              >
                Voir
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            {summary.clientSummaries.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {summary.clientSummaries.slice(0, 4).map((client) => (
                  <div
                    key={client.clientName}
                    className="rounded-2xl bg-[#fbf8f2] p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {client.clientName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-foreground/80">
                      {client.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-black/10 bg-white/60 p-4">
            <p className="font-semibold text-foreground">
              Pas encore de synthèse aujourd’hui.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Elle apparaîtra ici dès que Claw aura lancé la routine avec
              `writeSummary`.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Emails reçus aujourd’hui</p>
            </div>
            <Badge variant="secondary">{emails.length}</Badge>
          </div>

          {emails.length > 0 ? (
            <div className="space-y-2">
              {emails.slice(0, 5).map((email) => (
                <Link
                  key={email.id}
                  href={`/emails?selected=${email.id}`}
                  className="block rounded-2xl border border-black/[0.06] bg-white/70 p-3 transition hover:border-primary/20 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{email.subject}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {email.clientName ?? email.from}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-foreground/70">
                        {email.previewText || "Aucun aperçu disponible."}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <EmailBucketBadge bucket={email.bucket} />
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTime(email.receivedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white/60 p-3 text-sm text-muted-foreground">
              Aucun email reçu aujourd’hui dans la boîte synchronisée.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TodayWorklogCard({
  requests,
  tasks,
}: Readonly<{
  requests: DashboardTodayRequestItem[];
  tasks: DashboardTodayTaskItem[];
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Créé / modifié aujourd’hui</CardTitle>
          </div>
          <Badge variant="outline" className="bg-[#fbf8f2]">
            {requests.length + tasks.length}
          </Badge>
        </div>
        <CardDescription>
          Demandes et tâches que Claw ou l’équipe ont ajoutées ou mises à jour.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <SectionTitle
            count={requests.length}
            icon={FileText}
            title="Demandes"
          />
          {requests.length > 0 ? (
            <div className="space-y-2">
              {requests.slice(0, 5).map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/75 p-3 transition hover:border-primary/20 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChangeBadge changeType={request.changeType} />
                        <RequestPriorityBadge
                          priority={request.priority}
                          className="normal-case tracking-normal"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold">
                        {request.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {request.clientName} · {request.type}
                      </p>
                    </div>
                    <RequestStatusBadge
                      status={request.status}
                      className="shrink-0 normal-case tracking-normal"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyTodayLine label="Aucune demande créée ou modifiée aujourd’hui." />
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle count={tasks.length} icon={CheckCircle2} title="Tâches" />
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task) => (
                <Link
                  key={task.id}
                  href={`/taches/${task.id}`}
                  className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/75 p-3 transition hover:border-primary/20 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChangeBadge changeType={task.changeType} />
                        {task.priority ? (
                          <Badge variant="outline" className="bg-white/75 capitalize">
                            {task.priority}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold">
                        {task.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {task.requestTitle ?? "Sans demande liée"}
                      </p>
                    </div>
                    {task.status ? (
                      <TaskStatusBadge
                        status={normalizeTaskStatus(task.status)}
                        className="shrink-0 normal-case tracking-normal"
                      />
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyTodayLine label="Aucune tâche créée ou modifiée aujourd’hui." />
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  count,
  icon: Icon,
  title,
}: Readonly<{
  count: number;
  icon: typeof ClipboardList;
  title: string;
}>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <Badge variant="secondary">{count}</Badge>
    </div>
  );
}

function EmptyTodayLine({ label }: Readonly<{ label: string }>) {
  return (
    <p className="rounded-2xl bg-[#fbf8f2]/85 p-3 text-sm text-muted-foreground">
      {label}
    </p>
  );
}

function ChangeBadge({
  changeType,
}: Readonly<{ changeType: "created" | "updated" }>) {
  return (
    <Badge variant={changeType === "created" ? "default" : "outline"}>
      {changeType === "created" ? "Créé" : "Modifié"}
    </Badge>
  );
}

function EmailBucketBadge({
  bucket,
}: Readonly<{ bucket: DashboardTodayEmailItem["bucket"] }>) {
  if (bucket === "important") {
    return <Badge>Important</Badge>;
  }

  if (bucket === "to_review") {
    return <Badge variant="outline">À vérifier</Badge>;
  }

  if (bucket === "promotional") {
    return <Badge variant="secondary">Pub</Badge>;
  }

  return <Badge variant="outline">Non classé</Badge>;
}

function normalizeTaskStatus(value: string): TaskStatus {
  if (value === "done") {
    return "done";
  }

  if (value === "in_progress") {
    return "in_progress";
  }

  if (value === "blocked" || value === "waiting_external") {
    return "blocked";
  }

  return "todo";
}
