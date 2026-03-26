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
import { emailStatusMeta } from "@/features/emails/metadata";
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
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[220px]">Expéditeur</TableHead>
          <TableHead className="min-w-[300px]">Sujet</TableHead>
          <TableHead className="min-w-[170px]">Date</TableHead>
          <TableHead className="min-w-[180px]">Thread</TableHead>
          <TableHead className="min-w-[150px]">Statut</TableHead>
          <TableHead className="min-w-[180px]">Client détecté</TableHead>
          <TableHead className="min-w-[180px]">Type détecté</TableHead>
          <TableHead className="min-w-[170px] text-right">Confiance</TableHead>
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
                    <p className="mt-1 text-sm text-muted-foreground">
                      {email.fromEmail}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-semibold">{email.subject}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {email.previewText}
                </p>
              </TableCell>
              <TableCell>
                <p className="font-semibold">{formatDateTime(email.receivedAt)}</p>
              </TableCell>
              <TableCell>
                <p className="font-semibold">{email.threadLabel}</p>
                {email.linkedRequestId ? (
                  <Link
                    href={`/requests/${email.linkedRequestId}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Voir demande
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aucun dossier lié
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    email.status === "new" && "border-primary/[0.15] bg-primary/[0.08] text-primary",
                    email.status === "review" && "border-destructive/20 bg-destructive/10 text-destructive",
                    email.status === "processed" && "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.1)] text-[var(--success)]",
                  )}
                >
                  {emailStatusMeta[email.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <p className="font-semibold">{email.clientName}</p>
              </TableCell>
              <TableCell>
                <div className="inline-flex items-center gap-2">
                  {email.detectedType ? (
                    <>
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{email.detectedType}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Non détecté</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {email.confidence !== null ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold">
                    {Math.round(email.confidence * 100)}%
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">n/a</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
