import { MailCheck, MessageSquareText, Paperclip, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocumentFormOptions } from "@/features/documents/types";
import { ClassificationSummaryCard } from "@/features/emails/components/classification-summary-card";
import { EmailActionsBar } from "@/features/emails/components/email-actions-bar";
import { EmailAttachmentsCard } from "@/features/emails/components/email-attachments-card";
import { EmailQualificationPanel } from "@/features/emails/components/email-qualification-panel";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import { EmailReplyCard } from "@/features/replies/components/email-reply-card";
import type {
  EmailListItem,
  EmailQualificationOptions,
} from "@/features/emails/types";
import type { RequestLinkOption } from "@/features/requests/types";
import { cn, formatDateTime } from "@/lib/utils";

interface EmailPreviewPanelProps {
  documentOptions: DocumentFormOptions;
  documentOptionsError?: string | null;
  email: EmailListItem | null;
  mode?: "desktop" | "sheet";
  qualificationOptions: EmailQualificationOptions;
  qualificationOptionsError?: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
}

export function EmailPreviewPanel({
  documentOptions,
  documentOptionsError = null,
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
      <CardHeader className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <ProcessingStatusBadge status={email.status} />
          {email.detectedType ? (
            <Badge variant="outline">{email.detectedType}</Badge>
          ) : null}
          {email.attachments.length > 0 ? (
            <Badge variant="outline">
              <Paperclip className="mr-1 h-3.5 w-3.5" />
              {email.attachments.length}
            </Badge>
          ) : null}
          {email.confidence !== null ? (
            <Badge variant="outline">{Math.round(email.confidence * 100)}%</Badge>
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
        <EmailActionsBar
          key={`${email.id}:${email.linkedRequestId ?? "none"}`}
          email={email}
          requestOptions={requestOptions}
          requestOptionsError={requestOptionsError}
        />
      </CardHeader>

      <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Aperçu email</p>
          </div>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
            {email.bodyText ?? email.previewText}
          </p>
        </div>

        <EmailAttachmentsCard
          attachments={email.attachments}
          defaultModelId={email.classification.suggestedFields.modelId}
          defaultRequestId={email.linkedRequestId}
          documentOptions={documentOptions}
          documentOptionsError={documentOptionsError}
        />

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
        <EmailReplyCard email={email} />
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
