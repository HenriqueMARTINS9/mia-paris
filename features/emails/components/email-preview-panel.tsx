import { MailCheck, MessageSquareText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClassificationSummaryCard } from "@/features/emails/components/classification-summary-card";
import { EmailActionsBar } from "@/features/emails/components/email-actions-bar";
import { EmailQualificationPanel } from "@/features/emails/components/email-qualification-panel";
import type {
  EmailListItem,
  EmailQualificationOptions,
} from "@/features/emails/types";
import type { RequestLinkOption } from "@/features/requests/types";
import { cn, formatDateTime } from "@/lib/utils";

interface EmailPreviewPanelProps {
  email: EmailListItem | null;
  mode?: "desktop" | "sheet";
  qualificationOptions: EmailQualificationOptions;
  qualificationOptionsError?: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
}

export function EmailPreviewPanel({
  email,
  mode = "desktop",
  qualificationOptions,
  qualificationOptionsError = null,
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
              Le panneau affichera l’aperçu, la qualification IA et les actions de transformation CRM.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(mode === "desktop" && "sticky top-24")}>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{email.status}</Badge>
          {email.detectedType ? (
            <Badge variant="outline">{email.detectedType}</Badge>
          ) : null}
          {email.confidence !== null ? (
            <Badge variant="outline">{Math.round(email.confidence * 100)}%</Badge>
          ) : null}
        </div>
        <div>
          <CardTitle className="text-[1.35rem]">{email.subject}</CardTitle>
          <CardDescription className="mt-2">
            {email.fromName} · {email.fromEmail} · {formatDateTime(email.receivedAt)}
          </CardDescription>
        </div>
        <EmailActionsBar
          key={`${email.id}:${email.linkedRequestId ?? "none"}`}
          email={email}
          requestOptions={requestOptions}
          requestOptionsError={requestOptionsError}
        />
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Aperçu email</p>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/80">
            {email.bodyText ?? email.previewText}
          </p>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="font-semibold">Résumé IA</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-foreground/80">
            {email.summary ?? "Aucun résumé IA disponible pour cet email."}
          </p>
        </div>

        <ClassificationSummaryCard email={email} />
        <EmailQualificationPanel
          key={`${email.id}:${email.linkedRequestId ?? "none"}`}
          email={email}
          qualificationOptions={qualificationOptions}
          qualificationOptionsError={qualificationOptionsError}
        />
      </CardContent>
    </Card>
  );
}
