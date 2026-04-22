import type { ReactNode } from "react";
import { MailCheck, MessageSquareText, Paperclip, Sparkles } from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailActionsBar } from "@/features/emails/components/email-actions-bar";
import { EmailAttachmentsCard } from "@/features/emails/components/email-attachments-card";
import { EmailInboxBucketBadge } from "@/features/emails/components/email-inbox-bucket-badge";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import { EmailReplyCard } from "@/features/replies/components/email-reply-card";
import type { EmailListItem } from "@/features/emails/types";
import type { RequestLinkOption } from "@/features/requests/types";
import { cn, formatDateTime } from "@/lib/utils";

interface EmailPreviewPanelProps {
  email: EmailListItem | null;
  mode?: "desktop" | "sheet";
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
}

export function EmailPreviewPanel({
  email,
  mode = "desktop",
  requestOptions,
  requestOptionsError = null,
}: Readonly<EmailPreviewPanelProps>) {
  if (!email) {
    return (
      <Card className={cn(mode === "desktop" && "sticky top-24")}>
        <CardContent className="flex min-h-[24rem] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/[0.08] text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold">Sélectionne un email</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Le panneau affichera uniquement l’essentiel pour décider vite, puis les blocs secondaires au besoin.
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
          <EmailInboxBucketBadge bucket={email.triage.bucket} />
          <ProcessingStatusBadge status={email.status} />
          {email.detectedType ? <Badge variant="outline">{email.detectedType}</Badge> : null}
          <RequestPriorityBadge
            priority={email.classification.suggestedFields.priority}
            className="normal-case tracking-normal"
          />
          {email.attachments.length > 0 ? (
            <Badge variant="outline">
              <Paperclip className="mr-1 h-3.5 w-3.5" />
              {email.attachments.length}
            </Badge>
          ) : null}
        </div>

        <div>
          <CardTitle className="break-words text-xl sm:text-[1.35rem]">
            {email.subject}
          </CardTitle>
          <CardDescription className="mt-2 break-words">
            {email.fromName} · {email.fromEmail} · {formatDateTime(email.receivedAt)}
          </CardDescription>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetaPill label="Client détecté" value={email.clientName} />
          <MetaPill label="Type détecté" value={email.detectedType ?? "À confirmer"} />
          <MetaPill label="Priorité" value={getPriorityLabel(email)} />
          <MetaPill label="État CRM" value={getCrmStateLabel(email)} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
        <Card className="rounded-[1.35rem] border border-primary/10 bg-primary/[0.04] shadow-none">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Résumé métier
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/85">
                {email.summary ?? "Aucun résumé métier disponible pour cet email."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetaPill label="Action recommandée" value={getRecommendedAction(email)} />
              <MetaPill
                label="Demande liée"
                value={email.linkedRequestLabel ?? "Aucune demande liée"}
              />
            </div>
          </CardContent>
        </Card>

        <EmailActionsBar
          key={`${email.id}:${email.linkedRequestId ?? "none"}`}
          email={email}
          requestOptions={requestOptions}
          requestOptionsError={requestOptionsError}
        />

        {email.attachments.length > 0 ? (
          <EmailAttachmentsCard attachments={email.attachments} />
        ) : null}

        <CollapsibleCard
          title="Voir la conversation complète"
          description="Le fil complet reste masqué tant qu’il n’est pas utile à la décision."
          icon={MessageSquareText}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
            {email.bodyText ?? email.previewText}
          </p>
        </CollapsibleCard>

        <CollapsibleCard
          title="Réponse assistée"
          description="Le brouillon de réponse reste disponible si tu dois reprendre la main ou confirmer la réponse proposée."
          icon={Sparkles}
        >
          <EmailReplyCard email={email} />
        </CollapsibleCard>
      </CardContent>
    </Card>
  );
}

function MetaPill({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/75 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CollapsibleCard({
  children,
  description,
  icon: Icon,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  icon: typeof Sparkles;
  title: string;
}>) {
  return (
    <details className="group rounded-[1.35rem] border border-black/[0.06] bg-white">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </summary>
      <div className="border-t border-black/[0.06] px-4 py-4">{children}</div>
    </details>
  );
}

function getPriorityLabel(email: EmailListItem) {
  const value = email.classification.suggestedFields.priority;

  if (value === "critical") {
    return "Critique";
  }

  if (value === "high") {
    return "Haute";
  }

  return "Normale";
}

function getCrmStateLabel(email: EmailListItem) {
  if (email.linkedRequestId) {
    return "Déjà relié";
  }

  if (email.status === "processed") {
    return "Traité";
  }

  if (email.status === "review") {
    return "À arbitrer";
  }

  return "À qualifier";
}

function getRecommendedAction(email: EmailListItem) {
  const requestedAction = email.classification.suggestedFields.requestedAction?.trim();

  if (requestedAction) {
    return requestedAction;
  }

  if (email.linkedRequestId) {
    return "Vérifier la demande liée et confirmer que le mail est bien absorbé.";
  }

  if (email.triage.bucket === "promotional") {
    return "Laisser dans l’onglet Pub sauf si un vrai signal métier apparaît.";
  }

  if (email.triage.bucket === "to_review") {
    return "Relire vite le contexte et confirmer le client ou le type demandé.";
  }

  if (email.status === "review") {
    return "Arbitrer la qualification avant de créer ou rattacher une demande.";
  }

  return "Valider le résumé puis créer ou rattacher la bonne demande CRM.";
}
