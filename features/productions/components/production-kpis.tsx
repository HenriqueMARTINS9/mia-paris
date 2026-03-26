import {
  AlertTriangle,
  Factory,
  ShieldAlert,
  TimerReset,
} from "lucide-react";

import { MetricCard } from "@/components/crm/metric-card";
import type { ProductionListItem } from "@/features/productions/types";
import { getDaysUntil } from "@/lib/utils";

interface ProductionKpisProps {
  productions: ProductionListItem[];
}

export function ProductionKpis({
  productions,
}: Readonly<ProductionKpisProps>) {
  const blockedCount = productions.filter((production) => production.isBlocked).length;
  const criticalRiskCount = productions.filter(
    (production) => production.risk === "critical" || production.risk === "high",
  ).length;
  const activeCount = productions.filter(
    (production) => production.status === "in_progress",
  ).length;
  const endingSoonCount = productions.filter((production) => {
    if (!production.plannedEndAt) {
      return false;
    }

    const days = getDaysUntil(production.plannedEndAt);
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Actives"
        value={String(activeCount)}
        hint="Productions actuellement en atelier ou en suivi actif."
        icon={Factory}
      />
      <MetricCard
        label="Bloquées"
        value={String(blockedCount)}
        hint="Productions bloquées ou avec motif de blocage renseigné."
        icon={AlertTriangle}
        accent="danger"
      />
      <MetricCard
        label="Risque élevé"
        value={String(criticalRiskCount)}
        hint="Dossiers à arbitrer rapidement côté produit, qualité ou fournisseur."
        icon={ShieldAlert}
        accent="accent"
      />
      <MetricCard
        label="Fin sous 7j"
        value={String(endingSoonCount)}
        hint="Productions à sécuriser avant la date de fin prévue."
        icon={TimerReset}
      />
    </div>
  );
}
