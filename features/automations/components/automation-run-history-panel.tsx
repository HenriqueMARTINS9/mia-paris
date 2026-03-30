import { Bot, CheckCircle2, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutomationRunItem } from "@/features/automations/types";
import { formatDateTime } from "@/lib/utils";

export function AutomationRunHistoryPanel({
  runs,
}: Readonly<{ runs: AutomationRunItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Historique des évaluations</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {runs.length > 0 ? (
          runs.map((run) => (
            <div
              key={run.id}
              className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={run.ok ? "outline" : "destructive"}>
                  {run.ok ? (
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <CircleAlert className="mr-1 h-3.5 w-3.5" />
                  )}
                  {run.ok ? "OK" : "Erreur"}
                </Badge>
                <Badge variant="outline">{formatDateTime(run.createdAt)}</Badge>
              </div>
              <p className="mt-3 font-semibold">
                {run.totalOpen} alertes ouvertes · {run.processOpen} à traiter ·{" "}
                {run.decideOpen} à décider
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {run.message ?? "Évaluation métier exécutée."}
              </p>
              {run.createdCount > 0 || run.resolvedCount > 0 ? (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  +{run.createdCount} nouvelles · {run.resolvedCount} résolues
                </p>
              ) : null}
              {run.errorMessage ? (
                <p className="mt-2 text-sm text-destructive">{run.errorMessage}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-3xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            Aucune évaluation d’automations n’a encore été enregistrée.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
