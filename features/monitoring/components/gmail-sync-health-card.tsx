import { AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonitoringGmailHealth } from "@/features/monitoring/types";

export function GmailSyncHealthCard({
  health,
}: Readonly<{
  health: MonitoringGmailHealth;
}>) {
  const latestRun = health.latestRun;

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          Gmail Sync Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={health.connected ? "default" : "outline"}>
            {health.connected ? "Inbox connectée" : "Inbox non connectée"}
          </Badge>
          {health.latestFailureMessage ? (
            <Badge variant="outline" className="border-[rgba(202,142,85,0.3)] bg-[rgba(202,142,85,0.08)]">
              Dernier échec remonté
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1 text-sm leading-6 text-muted-foreground">
          <p>Boîte: {health.emailAddress ?? "Non renseignée"}</p>
          <p>Dernière sync: {health.lastSyncedAt ? new Date(health.lastSyncedAt).toLocaleString("fr-FR") : "Jamais"}</p>
          {health.syncError ? <p>Erreur de lecture: {health.syncError}</p> : null}
        </div>

        {latestRun ? (
          <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4">
            <div className="flex items-center gap-2">
              {latestRun.ok ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-[var(--accent)]" />
              )}
              <p className="font-medium text-foreground">
                {latestRun.ok ? "Dernière sync réussie" : "Dernière sync en erreur"}
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <p>Threads: {latestRun.importedThreads}</p>
              <p>Messages: {latestRun.importedMessages}</p>
              <p>Ignorés: {latestRun.ignoredMessages}</p>
            </div>
            {latestRun.queryUsed ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Query utilisée: {latestRun.queryUsed}
              </p>
            ) : null}
            {latestRun.errorMessage ? (
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                {latestRun.errorMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Historique récent
          </p>
          {health.recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune sync historisée pour l’instant.</p>
          ) : (
            <div className="space-y-2">
              {health.recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-[0.95rem] border border-black/[0.06] bg-white/80 px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {run.ok ? "Sync OK" : "Sync en erreur"}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {run.message ?? "Aucun détail supplémentaire"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString("fr-FR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
