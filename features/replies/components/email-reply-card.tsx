"use client";

import { Copy, MailCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EmailListItem } from "@/features/emails/types";
import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";
import { formatDateTime } from "@/lib/utils";

export function EmailReplyCard({
  email,
}: Readonly<{
  email: EmailListItem;
}>) {
  const assistantReply = email.assistantReply;

  async function handleCopy() {
    if (!assistantReply) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${assistantReply.subject}\n\n${assistantReply.body}`,
      );
      toast.success("Réponse Claw copiée dans le presse-papiers.");
    } catch {
      toast.error("Impossible de copier la réponse proposée.");
    }
  }

  if (!assistantReply) {
    return (
      <Card className="rounded-[1.35rem] border border-dashed border-black/[0.08] bg-[#fbf8f2]/70 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
            <MailCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Pas encore de réponse proposée
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Claw n’a pas encore préparé de brouillon pour cet email, ou préfère laisser la main humaine avant de proposer une réponse.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-[#fbf8f2]">
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Proposée par Claw
        </Badge>
        <Badge variant="outline" className="bg-white">
          {replyTypeMeta[assistantReply.type].label}
        </Badge>
        {assistantReply.generatedAt ? (
          <Badge variant="outline" className="bg-white">
            {formatDateTime(assistantReply.generatedAt)}
          </Badge>
        ) : null}
      </div>

      <Card className="rounded-[1.35rem] border border-primary/10 bg-primary/[0.04] shadow-none">
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Objet proposé
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {assistantReply.subject}
            </p>
          </div>

          {assistantReply.suggestedRecipients.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Destinataires suggérés
              </p>
              <p className="mt-2 text-sm text-foreground/85">
                {assistantReply.suggestedRecipients.join(", ")}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Réponse proposée
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">
              {assistantReply.body}
            </p>
          </div>

          {assistantReply.disclaimer ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {assistantReply.disclaimer}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copier la réponse
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
