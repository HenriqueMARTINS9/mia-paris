"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runAutomationEvaluationAction } from "@/features/automations/actions/run-automations";
import type { AutomationOverviewData } from "@/features/automations/types";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { formatDateTime } from "@/lib/utils";

export function AutomationSummaryCard({
  compact = false,
  overview,
}: Readonly<{
  compact?: boolean;
  overview: Pick<AutomationOverviewData, "latestRun" | "summary" | "warning">;
}>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => {
      const result = await runAutomationEvaluationAction();

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Automations métier</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-[#fbf8f2]">
                {overview.summary.totalOpen} alertes ouvertes
              </Badge>
              <Badge variant="outline" className="bg-white">
                {overview.summary.processOpen} à traiter
              </Badge>
              <Badge variant="outline" className="bg-white">
                {overview.summary.decideOpen} à décider
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/a-traiter">
                <Sparkles className="h-4 w-4" />
                Ouvrir le centre
              </Link>
            </Button>
            {can("automations.run") ? (
              <Button size="sm" onClick={handleRun} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Évaluation
                  </>
                ) : (
                  "Relancer les règles"
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "space-y-3 p-4" : "space-y-4 p-5"}>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricPill label="Critiques" value={overview.summary.criticalCount} />
          <MetricPill label="Haute priorité" value={overview.summary.highCount} />
          <MetricPill
            label="Dernière évaluation"
            value={
              overview.summary.lastRunAt
                ? formatDateTime(overview.summary.lastRunAt)
                : "Jamais"
            }
          />
        </div>
        {overview.warning ? (
          <p className="text-sm leading-6 text-muted-foreground">{overview.warning}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricPill({
  label,
  value,
}: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="rounded-[1.05rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
