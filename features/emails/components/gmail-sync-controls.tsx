"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCcw, Settings2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { syncGmailInboxAction } from "@/features/emails/actions/sync-gmail";
import type { GmailInboxStatus } from "@/features/emails/types";
import { formatDateTime } from "@/lib/utils";

export function GmailSyncControls({
  gmailInbox,
}: Readonly<{ gmailInbox: GmailInboxStatus }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await syncGmailInboxAction(50);

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {gmailInbox.connected ? (
        <Badge variant="outline">
          Gmail connecté
          {gmailInbox.emailAddress ? ` · ${gmailInbox.emailAddress}` : ""}
          {gmailInbox.lastSyncedAt
            ? ` · sync ${formatDateTime(gmailInbox.lastSyncedAt)}`
            : ""}
        </Badge>
      ) : (
        <Badge variant="outline">Gmail non connecté</Badge>
      )}

      <Button asChild variant="outline">
        <Link href="/api/gmail/connect?redirectTo=/emails">
          <Settings2 className="h-4 w-4" />
          {gmailInbox.connected ? "Reconnecter Gmail" : "Connecter Gmail"}
        </Link>
      </Button>

      <Button onClick={handleSync} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Synchronisation
          </>
        ) : (
          <>
            <RefreshCcw className="h-4 w-4" />
            Synchroniser Gmail
          </>
        )}
      </Button>
    </div>
  );
}
