"use client";

import { ArrowUpRight, MailOpen, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <>
      <div className="divide-y divide-black/[0.06] md:hidden">
        {emails.map((email) => {
          const isSelected = email.id === selectedEmailId;

          return (
            <button
              key={email.id}
              type="button"
              className={cn(
                "block w-full px-4 py-4 text-left transition hover:bg-[#faf7f1]",
                isSelected && "bg-primary/[0.06]",
                email.status === "review" && "bg-destructive/[0.04]",
              )}
              onClick={() => onSelectEmail(email.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold tracking-tight">{email.fromName}</p>
                    {email.isUnread ? <Badge>Non lu</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{email.fromEmail}</p>
                </div>
                {email.confidence !== null ? (
                  <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-1.5 text-sm font-semibold">
                    {Math.round(email.confidence * 100)}%
                  </div>
                ) : null}
              </div>

              <p className="mt-3 line-clamp-2 break-words text-base font-semibold tracking-tight">
                {email.subject}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <EmailInboxBucketBadge bucket={email.triage.bucket} />
                <ProcessingStatusBadge status={email.status} />
                {email.detectedType ? (
                  <Badge variant="outline" className="gap-1 normal-case tracking-normal">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {email.detectedType}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-1 font-semibold">{formatDateTime(email.receivedAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Thread
                  </p>
                  <p className="mt-1 font-semibold">{email.threadLabel}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Client détecté
                  </p>
                  <p className="mt-1 font-semibold">{email.clientName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Demande liée
                  </p>
                  {email.linkedRequestId ? (
                    <Link
                      href={`/requests/${email.linkedRequestId}`}
                      className="mt-1 inline-flex items-center gap-1 font-semibold text-foreground hover:text-foreground"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Ouvrir la demande
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Aucun dossier lié</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[24%] min-w-[220px]">Expéditeur</TableHead>
              <TableHead className="w-[36%] min-w-[280px]">Message</TableHead>
              <TableHead className="w-[15%] min-w-[150px]">Reçu</TableHead>
              <TableHead className="w-[15%] min-w-[170px]">Inbox</TableHead>
              <TableHead className="w-[10%] min-w-[140px]">Client</TableHead>
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
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                        <MailOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold tracking-tight">{email.fromName}</p>
                          {email.isUnread ? <Badge>Non lu</Badge> : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {email.fromEmail}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-1 break-words font-semibold">
                      {email.subject}
                    </p>
                    <p className="mt-1 line-clamp-1 break-words text-sm text-muted-foreground">
                      {getEmailSnippet(email)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {email.detectedType ? (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          {email.detectedType}
                        </span>
                      ) : (
                        <span className="truncate">{email.threadLabel}</span>
                      )}
                      {email.linkedRequestId ? (
                        <Link
                          href={`/requests/${email.linkedRequestId}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Voir demande
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{formatDateTime(email.receivedAt)}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <EmailInboxBucketBadge bucket={email.triage.bucket} />
                      <ProcessingStatusBadge status={email.status} />
                      {email.confidence !== null ? (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {Math.round(email.confidence * 100)}%
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate font-semibold">{email.clientName}</p>
                    {email.detectedType ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {email.detectedType}
                      </p>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
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
