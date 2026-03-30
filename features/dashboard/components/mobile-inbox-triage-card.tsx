import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import { formatDateTime } from "@/lib/utils";

export function MobileInboxTriageCard({
  emails,
}: Readonly<{ emails: EmailListItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Inbox du jour</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.slice(0, 3).map((email) => (
          <Link
            key={email.id}
            href="/emails"
            className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 p-3.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="line-clamp-1 flex-1 font-semibold">{email.subject}</p>
              <ProcessingStatusBadge status={email.status} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {email.fromName} · {formatDateTime(email.receivedAt)}
            </p>
          </Link>
        ))}

        <Link
          href="/emails"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Ouvrir l’inbox
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
