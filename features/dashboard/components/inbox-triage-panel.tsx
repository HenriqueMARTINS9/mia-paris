import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import { formatDateTime } from "@/lib/utils";

export function InboxTriagePanel({
  emails,
}: Readonly<{ emails: EmailListItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Derniers emails entrants</CardTitle>
        </div>
        <CardDescription>
          Derniers messages synchronisés à absorber dans le CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.length > 0 ? (
          emails.map((email) => (
            <div
              key={email.id}
              className="rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{email.subject}</p>
                    <ProcessingStatusBadge status={email.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {email.fromName} · {email.fromEmail}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground/80">
                    {email.previewText}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{formatDateTime(email.receivedAt)}</p>
                  <Link
                    href="/emails"
                    className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
                  >
                    Ouvrir l’inbox
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun email entrant visible pour le moment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
