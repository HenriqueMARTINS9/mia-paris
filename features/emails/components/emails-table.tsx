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
        <Table className="min-w-[1460px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[240px] whitespace-nowrap">Expéditeur</TableHead>
              <TableHead className="min-w-[420px] whitespace-nowrap">Objet et aperçu</TableHead>
              <TableHead className="min-w-[170px] whitespace-nowrap">Reçu</TableHead>
              <TableHead className="min-w-[220px] whitespace-nowrap">Traitement</TableHead>
              <TableHead className="min-w-[170px] whitespace-nowrap">Type</TableHead>
              <TableHead className="min-w-[170px] whitespace-nowrap">Client</TableHead>
              <TableHead className="min-w-[170px] whitespace-nowrap">Thread</TableHead>
              <TableHead className="min-w-[190px] whitespace-nowrap">Demande liée</TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">Confiance</TableHead>
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
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold tracking-tight">{email.fromName}</p>
                          {email.isUnread ? <Badge>Non lu</Badge> : null}
                        </div>
                        <p className="mt-1 break-all text-sm text-muted-foreground">
                          {email.fromEmail}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="break-words font-semibold">
                      {email.subject}
                    </p>
                    <p className="mt-1 max-w-[460px] break-words text-sm text-muted-foreground">
                      {getEmailSnippet(email)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="whitespace-nowrap font-semibold">{formatDateTime(email.receivedAt)}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <EmailInboxBucketBadge bucket={email.triage.bucket} />
                      <ProcessingStatusBadge status={email.status} />
                    </div>
                  </TableCell>
                  <TableCell>
                    {email.detectedType ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        {email.detectedType}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Non détecté</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{email.clientName}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-muted-foreground">{email.threadLabel}</p>
                  </TableCell>
                  <TableCell>
                    {email.linkedRequestId ? (
                      <Link
                        href={`/requests/${email.linkedRequestId}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold hover:text-foreground"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {email.linkedRequestLabel ?? "Voir la demande"}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    {!email.linkedRequestId ? (
                      <p className="text-sm text-muted-foreground">Aucune</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {email.confidence !== null ? (
                      <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">
                        {Math.round(email.confidence * 100)}%
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
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

  if (rawSnippet.length <= 180) {
    return rawSnippet;
  }

  return `${rawSnippet.slice(0, 177).trimEnd()}...`;
}
