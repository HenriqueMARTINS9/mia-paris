import { History } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GmailSyncSummary } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils";

export function GmailSyncHistoryPanel({
  latestSyncs,
}: Readonly<{
  latestSyncs: GmailSyncSummary[];
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Historique sync Gmail</CardTitle>
        </div>
        <CardDescription>
          Lecture rapide des dernières synchronisations manuelles et incrémentales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestSyncs.length > 0 ? (
          latestSyncs.slice(0, 6).map((sync) => (
            <div
              key={sync.id}
              className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {sync.ok ? "Sync réussie" : "Sync en erreur"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(sync.createdAt)}
                    {sync.syncMode ? ` · ${sync.syncMode}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{sync.importedMessages} emails importés</p>
                  <p>{sync.ignoredMessages} ignorés</p>
                </div>
              </div>
              {sync.queryUsed ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Query Gmail: {sync.queryUsed}
                </p>
              ) : null}
              {sync.errorMessage ? (
                <p className="mt-3 text-sm text-destructive">{sync.errorMessage}</p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucun historique de sync disponible pour l’instant.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
