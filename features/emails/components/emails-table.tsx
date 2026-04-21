"use client";

import Link from "next/link";
import { ArrowUpRight, MailOpen, Paperclip, Sparkles } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmailInboxBucketBadge } from "@/features/emails/components/email-inbox-bucket-badge";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import { cn, formatDateTime } from "@/lib/utils";

interface EmailsTableProps {
  emails: EmailListItem[];
  onSelectEmail: (emailId: string) => void;
  selectedEmailId: string | null;
}

export function EmailsTable({
  emails,
  onSelectEmail,
  selectedEmailId,
}: Readonly<EmailsTableProps>) {
  if (emails.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/40 px-6 py-12 text-center">
        <p className="text-base font-semibold">Aucun email trouvé</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste les filtres ou attends les prochains emails entrants.
        </p>
      </div>
    );
  }

  return (
    <Table className="min-w-[1120px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[170px] whitespace-nowrap">File</TableHead>
          <TableHead className="min-w-[240px] whitespace-nowrap">Expéditeur</TableHead>
          <TableHead className="min-w-[380px] whitespace-nowrap">Objet</TableHead>
          <TableHead className="min-w-[220px] whitespace-nowrap">Client et type</TableHead>
          <TableHead className="min-w-[220px] whitespace-nowrap">État CRM</TableHead>
          <TableHead className="min-w-[180px] whitespace-nowrap">Reçu</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {emails.map((email) => {
          const isSelected = email.id === selectedEmailId;

          return (
            <TableRow
              key={email.id}
              className={cn(
                "cursor-pointer",
                isSelected && "bg-primary/[0.06]",
                email.status === "review" && "bg-destructive/[0.04]",
              )}
              onClick={() => onSelectEmail(email.id)}
            >
              <TableCell>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <EmailInboxBucketBadge bucket={email.triage.bucket} />
                    <ProcessingStatusBadge status={email.status} />
                  </div>
                  {email.isUnread ? (
                    <Badge variant="outline" className="w-fit normal-case tracking-normal">
                      Non lu
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                    <MailOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight">{email.fromName}</p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {email.fromEmail}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="line-clamp-2 break-words font-semibold">{email.subject}</p>
                <p className="mt-1 line-clamp-2 max-w-[440px] break-words text-sm text-muted-foreground">
                  {getEmailSnippet(email)}
                </p>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <p className="font-semibold">{email.clientName}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {email.detectedType ? (
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        {email.detectedType}
                      </span>
                    ) : (
                      <span>Type à confirmer</span>
                    )}
                    {email.attachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {email.attachments.length}
                      </span>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">{getEmailCrmState(email)}</p>
                  {email.linkedRequestId ? (
                    <Link
                      href={`/requests/${email.linkedRequestId}`}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {email.linkedRequestLabel ?? "Voir la demande"}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <p className="text-muted-foreground">{getEmailRecommendedAction(email)}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p className="whitespace-nowrap font-semibold">{formatDateTime(email.receivedAt)}</p>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function getEmailSnippet(email: EmailListItem) {
  const rawSnippet = (email.previewText || email.bodyText || "")
    .replace(/\s+/g, " ")
    .trim();

  if (rawSnippet.length <= 110) {
    return rawSnippet;
  }

  return `${rawSnippet.slice(0, 107).trimEnd()}...`;
}

function getEmailCrmState(email: EmailListItem) {
  if (email.linkedRequestId) {
    return "Déjà relié à une demande";
  }

  if (email.status === "processed") {
    return "Traité côté CRM";
  }

  if (email.status === "review") {
    return "En attente d’arbitrage";
  }

  return "À qualifier";
}

function getEmailRecommendedAction(email: EmailListItem) {
  if (email.triage.bucket === "promotional") {
    return "Laisser dans l’onglet Pub.";
  }

  if (email.triage.bucket === "to_review") {
    return "Vérifier rapidement le tri avant d’aller plus loin.";
  }

  return "Ouvrir pour valider le résumé et le rattachement.";
}
