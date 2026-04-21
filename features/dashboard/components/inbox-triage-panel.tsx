import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import { formatDateTime } from "@/lib/utils";

export function InboxTriagePanel({
  description = "Derniers messages synchronisés à absorber dans le CRM.",
  emptyMessage = "Aucun email entrant visible pour le moment.",
  emails,
  href = "/emails",
  title = "Derniers emails entrants",
}: Readonly<{
  description?: string;
  emptyMessage?: string;
  emails: EmailListItem[];
  href?: string;
  title?: string;
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-[#fbf8f2]">
            {emails.length}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.length > 0 ? (
          emails.map((email) => (
            <div
              key={email.id}
              className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
            >
              <div className="space-y-3">
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span>{formatDateTime(email.receivedAt)}</span>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
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
            {emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
