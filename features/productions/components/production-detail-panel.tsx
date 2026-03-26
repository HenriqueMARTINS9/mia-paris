import Link from "next/link";
import {
  AlertTriangle,
  CalendarRange,
  Factory,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductionMutationControls } from "@/features/productions/components/production-mutation-controls";
import {
  ProductionStatusBadge,
  RiskBadge,
} from "@/features/productions/components/production-badges";
import type { ProductionListItem } from "@/features/productions/types";
import { cn, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface ProductionDetailPanelProps {
  mode?: "desktop" | "sheet";
  production: ProductionListItem | null;
}

export function ProductionDetailPanel({
  mode = "desktop",
  production,
}: Readonly<ProductionDetailPanelProps>) {
  if (!production) {
    return (
      <Card className={cn(mode === "desktop" && "sticky top-24")}>
        <CardContent className="flex min-h-[24rem] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/[0.08] text-primary">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold">Sélectionne une production</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Le panneau affichera le planning, le niveau de risque et les actions rapides.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(mode === "desktop" && "sticky top-24")}>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProductionStatusBadge status={production.status} />
          <RiskBadge risk={production.risk} />
        </div>
        <div>
          <CardTitle className="text-[1.35rem]">{production.orderNumber}</CardTitle>
          <CardDescription className="mt-2">
            {production.clientName} · {production.modelName}
          </CardDescription>
        </div>
        {production.requestId ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/requests/${production.requestId}`}>Voir la demande</Link>
            </Button>
          </div>
        ) : null}
        <ProductionMutationControls
          key={`${production.id}:${production.status}:${production.risk}:${production.blockingReason ?? "none"}`}
          production={production}
        />
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard
            icon={CalendarRange}
            title="Planning"
            lines={[
              production.plannedStartAt
                ? `Début ${formatDateTime(production.plannedStartAt)}`
                : "Début non planifié",
              production.plannedEndAt
                ? `${getDeadlineLabel(production.plannedEndAt)} · ${formatDateTime(production.plannedEndAt)}`
                : "Fin non planifiée",
              production.productionModeLabel,
            ]}
          />
          <InfoCard
            icon={ShieldAlert}
            title="Risque"
            lines={[
              `Niveau ${production.risk}`,
              `Statut source ${production.rawStatus}`,
              `Risque source ${production.rawRisk}`,
            ]}
          />
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <p className="font-semibold">Contexte production</p>
          <div className="mt-4 space-y-3 text-sm">
            <MetaRow label="Client" value={production.clientName} />
            <MetaRow label="Modèle" value={production.modelName} />
            <MetaRow label="Mode" value={production.productionModeLabel} />
            <MetaRow label="Demande liée" value={production.requestTitle ?? "Aucune"} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Blocage éventuel</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-foreground/80">
            {production.blockingReason ??
              "Aucun blocage explicite renseigné pour cette production."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCard({
  icon: Icon,
  lines,
  title,
}: Readonly<{
  icon: typeof CalendarRange | typeof ShieldAlert;
  lines: string[];
  title: string;
}>) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="font-semibold">{title}</p>
      </div>
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm text-foreground/80">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
