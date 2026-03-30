import Link from "next/link";
import { Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import { formatDateTime } from "@/lib/utils";

export function TodayEmailsPanel({
  emails,
}: Readonly<{
  emails: EmailListItem[];
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Emails à trier</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.length > 0 ? (
          emails.map((email) => (
            <Link
              key={email.id}
              href={`/emails?email=${email.id}`}
              className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {email.fromName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {email.subject}
                  </p>
                </div>
                <ProcessingStatusBadge status={email.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDateTime(email.receivedAt)}</span>
                {email.clientName ? (
                  <Badge variant="outline" className="bg-white">
                    {email.clientName}
                  </Badge>
                ) : null}
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucun email à trier pour l’instant.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
