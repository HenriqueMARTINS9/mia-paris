import {
  AlertTriangle,
  Factory,
  FolderKanban,
  Inbox,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardKpis } from "@/features/dashboard/types";

export function DashboardKpiCards({
  kpis,
}: Readonly<{ kpis: DashboardKpis }>) {
  const primaryStats = [
    {
      label: "Urgences du jour",
      value: kpis.urgenciesToday,
      helper: "À arbitrer vite",
      icon: AlertTriangle,
      tone: "danger" as const,
    },
    {
      label: "Demandes non assignées",
      value: kpis.requestsWithoutOwner,
      helper: "Responsable manquant",
      icon: FolderKanban,
      tone: "primary" as const,
    },
    {
      label: "Emails importants",
      value: kpis.importantEmails,
      helper: "À vérifier",
      icon: Inbox,
      tone: "primary" as const,
    },
    {
      label: "Productions bloquées",
      value: kpis.productionsBlocked,
      helper: "Blocages atelier",
      icon: Factory,
      tone: "danger" as const,
    },
  ];

  const secondaryStats = [
    {
      label: "Productions à risque",
      value: kpis.productionsHighRisk,
      helper: "Sous surveillance",
      icon: ShieldAlert,
      tone: "primary" as const,
    },
  ];

  return (
    <Card>
      <CardHeader className="gap-3 border-b border-black/[0.06] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-[#fbf8f2]">
            Indicateurs du jour
          </Badge>
          <CardTitle>Vue synthétique</CardTitle>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Les quatre indicateurs les plus structurants, puis les compléments utiles de couverture métier.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {primaryStats.map((item) => (
            <PrimaryKpiTile key={item.label} {...item} />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {secondaryStats.map((item) => (
            <PrimaryKpiTile key={item.label} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PrimaryKpiTile({
  helper,
  icon: Icon,
  label,
  tone,
  value,
}: Readonly<{
  helper: string;
  icon: typeof Inbox;
  label: string;
  tone: "danger" | "primary";
  value: number;
}>) {
  const toneClasses =
    tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : "bg-primary/10 text-primary";

  return (
    <div className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}
