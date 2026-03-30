import {
  CircleCheck,
  Clock3,
  FileText,
  Fingerprint,
  Mail,
  Package,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

import { RequestMutationControls } from "@/features/requests/components/request-mutation-controls";
import type {
  RequestAssigneeOption,
  RequestOverviewListItem,
} from "@/features/requests/types";
import {
  ProductionStageBadge,
  RequestPriorityBadge,
  RequestStatusBadge,
} from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface RequestDetailPanelProps {
  request: RequestOverviewListItem | null;
  assignees?: RequestAssigneeOption[];
  assigneesError?: string | null;
  mode?: "desktop" | "sheet";
}

const milestoneTone = {
  done: "bg-[rgba(55,106,79,0.12)] text-[var(--success)]",
  next: "bg-primary/10 text-primary",
  risk: "bg-destructive/10 text-destructive",
} as const;

const timelineTone = {
  email: "bg-primary/10 text-primary",
  task: "bg-[rgba(58,88,122,0.12)] text-[#42566b]",
  deadline: "bg-destructive/10 text-destructive",
  validation: "bg-[rgba(95,78,145,0.12)] text-[#5f4e91]",
  production: "bg-[rgba(18,92,120,0.12)] text-[#125c78]",
} as const;

export function RequestDetailPanel({
  request,
  assignees = [],
  assigneesError = null,
  mode = "desktop",
}: Readonly<RequestDetailPanelProps>) {
  if (!request) {
    return (
      <Card className={cn(mode === "desktop" && "sticky top-24")}>
        <CardContent className="flex min-h-[28rem] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/[0.08] text-primary">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold">Sélectionne une demande</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Le panneau de droite affichera le contexte client, les échéances
              et les informations récupérées depuis Supabase.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(mode === "desktop" && "sticky top-24")}>
      <CardHeader className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <RequestStatusBadge status={request.status} />
          <RequestPriorityBadge priority={request.priority} />
          <ProductionStageBadge stage={request.productionStage} />
        </div>
        <div>
          <CardTitle className="break-words text-xl sm:text-[1.35rem]">
            {request.reference}
          </CardTitle>
          <CardDescription className="mt-2 break-words">
            {request.sourceSubject}
          </CardDescription>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link href={`/requests/${request.id}`}>Ouvrir le dossier complet</Link>
          </Button>
        </div>
        <RequestMutationControls
          key={`${request.id}:${request.status}:${request.priority}:${request.owner}:${request.assignedUserId ?? "none"}`}
          request={request}
          assignees={assignees}
          assigneesError={assigneesError}
        />
      </CardHeader>

      <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Client / dossier
            </p>
            <p className="mt-3 text-base font-semibold">{request.clientName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.department}
            </p>
            <p className="mt-3 text-sm text-foreground/80">
              {request.requestTypeLabel} · {request.reference}
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Deadline principale
            </p>
            <p className="mt-3 text-base font-semibold">
              {getDeadlineLabel(request.dueAt)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(request.dueAt)}
            </p>
            <p className="mt-3 text-sm text-foreground/80">
              Score urgence {request.urgencyScore}/100 · statut source{" "}
              {request.rawStatus}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Flux entrant / contexte</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.emailFrom} · {formatDateTime(request.lastInboundAt)}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">
                {request.emailPreview}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">Paramètres dossier</p>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <DetailMetaRow
                label="Réf interne"
                value={request.internalRef ?? "Non renseignée"}
              />
              <DetailMetaRow
                label="Réf client"
                value={request.clientRef ?? "Non renseignée"}
              />
              <DetailMetaRow label="Type" value={request.requestTypeLabel} />
              <DetailMetaRow
                label="Confiance IA"
                value={
                  request.aiConfidence !== null
                    ? `${Math.round(request.aiConfidence * 100)}%`
                    : "n/a"
                }
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">Contacts clés</p>
            </div>
            <div className="mt-4 space-y-3">
              {request.contacts.map((contact) => (
                <div
                  key={`${contact.name}-${contact.role}`}
                  className="rounded-2xl border border-white/70 bg-white/70 p-3"
                >
                    <p className="break-words font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contact.role} · {contact.company}
                  </p>
                  <p className="mt-1 break-words text-sm text-foreground/80">
                    {contact.email}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">Prochaines actions</p>
            <Badge variant="outline">{request.owner}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {request.nextActions.map((action) => (
              <div
                key={action}
                className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-3"
              >
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-sm leading-6 text-foreground/80">{action}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Jalons</p>
          </div>
          <div className="mt-4 space-y-3">
            {request.milestones.map((milestone) => (
              <div
                key={`${milestone.label}-${milestone.date}`}
                className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      milestoneTone[milestone.tone],
                    )}
                  />
                  <div className="min-w-0">
                    <p className="break-words font-medium">{milestone.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(milestone.date)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit normal-case tracking-normal"
                >
                  {formatDate(milestone.date)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">Documents</p>
            </div>
            <div className="mt-4 space-y-2">
              {request.documents.length > 0 ? (
                request.documents.map((document) => (
                  <div
                    key={`${document.name}-${document.updatedAt}`}
                    className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3"
                  >
                    <p className="break-words font-medium">{document.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {document.type} · mis à jour {formatDate(document.updatedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun document exposé par cette vue pour le moment.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold">Tags / contexte</p>
              <Badge
                variant="secondary"
                className="w-fit normal-case tracking-normal"
              >
                {request.requestTypeLabel}
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {request.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="normal-case tracking-normal"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>
                Confiance IA:{" "}
                {request.aiConfidence !== null
                  ? `${Math.round(request.aiConfidence * 100)}%`
                  : "n/a"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {request.notes}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <p className="font-semibold">Timeline</p>
          <div className="mt-4 space-y-3">
            {request.timeline.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-3"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold uppercase tracking-[0.12em]",
                    timelineTone[event.category],
                  )}
                >
                  {event.category.slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(event.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DetailMetaRowProps {
  label: string;
  value: string;
}

function DetailMetaRow({ label, value }: Readonly<DetailMetaRowProps>) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium sm:text-right">{value}</span>
    </div>
  );
}
