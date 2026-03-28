import {
  AlertTriangle,
  Clock3,
  Factory,
  Inbox,
  ListTodo,
  MailWarning,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";

import { MetricCard } from "@/components/crm/metric-card";
import type { DashboardKpis } from "@/features/dashboard/types";

export function DashboardKpiCards({
  kpis,
}: Readonly<{ kpis: DashboardKpis }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Emails non traités"
        value={String(kpis.openEmails)}
        hint="Inbox à absorber ou à qualifier."
        icon={Inbox}
      />
      <MetricCard
        label="Demandes créées"
        value={String(kpis.requestsCreatedToday)}
        hint="Demandes ouvertes aujourd’hui."
        icon={MailWarning}
        accent="accent"
      />
      <MetricCard
        label="Urgences < 24h"
        value={String(kpis.urgencies24h)}
        hint="Deadlines à arbitrer dans la journée."
        icon={Clock3}
        accent="danger"
      />
      <MetricCard
        label="Tâches en retard"
        value={String(kpis.tasksOverdue)}
        hint="Actions déjà échues côté équipe."
        icon={ListTodo}
        accent="danger"
      />
      <MetricCard
        label="Productions bloquées"
        value={String(kpis.productionsBlocked)}
        hint="Dossiers atelier ou fournisseur à lever."
        icon={Factory}
        accent="danger"
      />
      <MetricCard
        label="Validations en attente"
        value={String(kpis.pendingValidations)}
        hint="Décisions produit ou qualité toujours ouvertes."
        icon={ShieldCheck}
        accent="accent"
      />
      <MetricCard
        label="Sans assignation"
        value={String(kpis.requestsWithoutOwner)}
        hint="Demandes sans owner métier défini."
        icon={UserRoundX}
      />
      <MetricCard
        label="Emails à revoir"
        value={String(kpis.emailsToReview)}
        hint="Emails marqués pour arbitrage humain."
        icon={AlertTriangle}
        accent="accent"
      />
    </div>
  );
}
