"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCcw, Settings2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { incrementalGmailSyncAction } from "@/features/emails/actions/sync-gmail";
import type { GmailInboxStatus } from "@/features/emails/types";
import { formatDateTime } from "@/lib/utils";

export function GmailSyncControls({
  gmailInbox,
}: Readonly<{ gmailInbox: GmailInboxStatus }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { can, isAdminExplicit } = useAuthorization();

  function handleSync() {
    startTransition(async () => {
      const result = await incrementalGmailSyncAction(50);

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      {gmailInbox.connected ? (
        <Badge
          variant="outline"
          className="whitespace-normal break-words px-3 py-1.5 text-left leading-5 sm:text-center"
        >
          Gmail partage connecte
          {gmailInbox.emailAddress ? ` · ${gmailInbox.emailAddress}` : ""}
          {gmailInbox.lastSyncedAt
            ? ` · sync ${formatDateTime(gmailInbox.lastSyncedAt)}`
            : ""}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="whitespace-normal break-words px-3 py-1.5 text-left leading-5 sm:text-center"
        >
          Boite Gmail partagee non connectee
        </Badge>
      )}

      {isAdminExplicit || can("emails.sync") ? (
        <>
          {isAdminExplicit ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/api/gmail/connect?redirectTo=/emails">
                <Settings2 className="h-4 w-4" />
                {gmailInbox.connected
                  ? "Reconnecter la boite Gmail partagee"
                  : "Connecter la boite Gmail partagee"}
              </Link>
            </Button>
          ) : null}

          {can("emails.sync") ? (
            <Button onClick={handleSync} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Synchronisation
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Relancer la sync
                </>
              )}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
