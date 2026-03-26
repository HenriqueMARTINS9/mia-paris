import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/crm/placeholder-page";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <PlaceholderPage
      eyebrow="Étape 7 · Dashboard"
      title="Dashboard"
      description="Le cockpit de pilotage consolidera les demandes, les productions, les urgences et les validations pour offrir une lecture business en temps réel."
      focus={[
        "KPIs business par client, saison et statut de transformation.",
        "Vue synthèse email entrant, charge équipe et points bloquants.",
        "Sections dédiées aux productions sensibles et validations IA en attente.",
      ]}
    />
  );
}
