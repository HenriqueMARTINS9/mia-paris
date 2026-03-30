import { Activity, CheckCircle2, RefreshCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GmailSyncControls } from "@/features/emails/components/gmail-sync-controls";
import type { GmailInboxStatus } from "@/features/emails/types";
import type { GmailSyncSummary } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils";

export function TodaySyncStatusPanel({
  gmailInbox,
  latestSyncs,
}: Readonly<{
  gmailInbox: GmailInboxStatus;
  latestSyncs: GmailSyncSummary[];
}>) {
  const latestSync = latestSyncs[0] ?? null;

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Dernière sync Gmail</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <GmailSyncControls gmailInbox={gmailInbox} />

        {latestSync ? (
          <div className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 p-4">
            <div className="flex items-center gap-2">
              {latestSync.ok ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              ) : (
                <Activity className="h-4 w-4 text-destructive" />
              )}
              <p className="font-semibold">
                {latestSync.ok ? "Sync réussie" : "Sync en erreur"}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateTime(latestSync.createdAt)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {latestSync.importedMessages} emails importés · {latestSync.ignoredMessages} ignorés
            </p>
            {latestSync.errorMessage ? (
              <p className="mt-3 text-sm text-destructive">{latestSync.errorMessage}</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucun historique de sync Gmail disponible.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
