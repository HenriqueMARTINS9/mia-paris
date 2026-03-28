import { AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GmailSyncControls } from "@/features/emails/components/gmail-sync-controls";
import type { GmailInboxStatus } from "@/features/emails/types";
import type { GmailSyncSummary } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils";

interface GmailSyncStatusCardProps {
  emailRequestCreationFailures: number;
  emailRequestsCreated: number;
  gmailInbox: GmailInboxStatus;
  latestSyncs: GmailSyncSummary[];
  syncError?: string | null;
}

export function GmailSyncStatusCard({
  emailRequestCreationFailures,
  emailRequestsCreated,
  gmailInbox,
  latestSyncs,
  syncError = null,
}: Readonly<GmailSyncStatusCardProps>) {
  const latestSync = latestSyncs[0] ?? null;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Dernières sync Gmail</CardTitle>
        </div>
        <CardDescription>
          Observabilité minimale sur la connexion Gmail et le pipeline email vers demande.
        </CardDescription>
        <GmailSyncControls gmailInbox={gmailInbox} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatBox
            label="Requests créées"
            value={String(emailRequestsCreated)}
            tone="success"
          />
          <StatBox
            label="Échecs création"
            value={String(emailRequestCreationFailures)}
            tone={emailRequestCreationFailures > 0 ? "danger" : "neutral"}
          />
        </div>

        {latestSync ? (
          <div className="rounded-3xl border border-white/70 bg-white/65 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {latestSync.ok ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              <p className="font-semibold">
                {latestSync.ok ? "Dernière sync réussie" : "Dernière sync en erreur"}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateTime(latestSync.createdAt)}
              {latestSync.connectedInboxEmail ? ` · ${latestSync.connectedInboxEmail}` : ""}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Threads" value={String(latestSync.importedThreads)} />
              <MiniMetric label="Emails" value={String(latestSync.importedMessages)} />
              <MiniMetric label="Ignorés" value={String(latestSync.ignoredMessages)} />
            </div>
            {latestSync.errorMessage ? (
              <p className="mt-4 text-sm leading-6 text-destructive">
                {latestSync.errorMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucun log de sync Gmail n’est encore disponible.
          </div>
        )}

        {syncError ? (
          <p className="text-sm text-muted-foreground">{syncError}</p>
        ) : null}

        {latestSyncs.length > 1 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Historique récent
            </p>
            {latestSyncs.slice(1, 4).map((sync) => (
              <div
                key={sync.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {sync.ok ? "Sync réussie" : "Sync en erreur"}
                  </p>
                  <p className="text-muted-foreground">{formatDateTime(sync.createdAt)}</p>
                </div>
                <div className="text-right text-muted-foreground">
                  <p>{sync.importedMessages} emails</p>
                  <p>{sync.ignoredMessages} ignorés</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatBox({
  label,
  tone,
  value,
}: Readonly<{
  label: string;
  tone: "danger" | "neutral" | "success";
  value: string;
}>) {
  const toneClass =
    tone === "success"
      ? "bg-[rgba(55,106,79,0.08)] text-[var(--success)]"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : "bg-white/70 text-foreground";

  return (
    <div className={`rounded-2xl border border-white/70 px-4 py-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
