import { AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GmailSyncControls } from "@/features/emails/components/gmail-sync-controls";
import type { GmailInboxStatus } from "@/features/emails/types";
import type { GmailSyncSummary } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils";

interface MobileSyncStatusCardProps {
  gmailInbox: GmailInboxStatus;
  latestSyncs: GmailSyncSummary[];
}

export function MobileSyncStatusCard({
  gmailInbox,
  latestSyncs,
}: Readonly<MobileSyncStatusCardProps>) {
  const latestSync = latestSyncs[0] ?? null;

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Sync Gmail</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <GmailSyncControls gmailInbox={gmailInbox} />

        {latestSync ? (
          <div className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 p-3.5">
            <div className="flex items-center gap-2">
              {latestSync.ok ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              <p className="font-semibold">
                {latestSync.ok ? "Dernière sync OK" : "Dernière sync en erreur"}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateTime(latestSync.createdAt)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {latestSync.importedMessages} emails · {latestSync.ignoredMessages} ignorés
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
