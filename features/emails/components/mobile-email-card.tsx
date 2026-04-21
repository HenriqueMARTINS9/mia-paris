"use client";

import type { MouseEvent } from "react";
import { ChevronRight, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailInboxBucketBadge } from "@/features/emails/components/email-inbox-bucket-badge";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import { cn, formatDateTime } from "@/lib/utils";

interface MobileEmailCardProps {
  email: EmailListItem;
  isSelected?: boolean;
  onOpen: () => void;
}

export function MobileEmailCard({
  email,
  isSelected = false,
  onOpen,
}: Readonly<MobileEmailCardProps>) {
  function handleOpen(event?: MouseEvent<HTMLElement>) {
    event?.stopPropagation();
    onOpen();
  }

  return (
    <button
      type="button"
      onClick={() => onOpen()}
      className={cn(
        "w-full rounded-[1.35rem] border border-black/[0.06] bg-white px-4 py-4 text-left shadow-[0_14px_28px_rgba(18,27,34,0.04)] transition hover:bg-[#faf7f1]",
        isSelected && "border-primary/20 bg-primary/[0.04]",
        email.status === "review" && "border-destructive/20 bg-destructive/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {email.fromName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {email.fromEmail}
          </p>
        </div>
        <p className="mt-0.5 shrink-0 text-right text-[11px] leading-4 text-muted-foreground">
          {formatDateTime(email.receivedAt)}
        </p>
      </div>

      <p className="mt-3 line-clamp-2 break-words text-[0.98rem] font-semibold tracking-tight text-foreground">
        {email.subject}
      </p>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {email.previewText}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EmailInboxBucketBadge bucket={email.triage.bucket} />
        <ProcessingStatusBadge status={email.status} />
        {email.clientName !== "Client non détecté" ? (
          <Badge variant="outline" className="normal-case tracking-normal">
            {email.clientName}
          </Badge>
        ) : null}
        {email.attachments.length > 0 ? (
          <Badge variant="outline" className="gap-1 normal-case tracking-normal">
            <Paperclip className="h-3.5 w-3.5" />
            {email.attachments.length}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          <p className="line-clamp-2">
            {email.linkedRequestId
              ? "Déjà relié à une demande"
              : email.status === "processed"
                ? "Déjà traité côté CRM"
                : "À vérifier rapidement"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-2.5"
          onClick={handleOpen}
        >
          Ouvrir
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </button>
  );
}
