import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/crm/placeholder-page";

export const metadata: Metadata = {
  title: "Validation IA",
};

export default function ValidationsIaPage() {
  return (
    <PlaceholderPage
      eyebrow="Étape 9 · Validation IA"
      title="Validation IA"
      description="Cet écran accueillera les propositions de structuration générées par l'IA avant leur création dans Supabase et leur distribution aux équipes."
      focus={[
        "Comparaison entre email source et objets proposés par l'IA.",
        "Validation métier des champs sensibles: client, produit, deadline, quantité, usine.",
        "Workflow de confirmation avant insertion dans requests, tasks, deadlines et productions.",
      ]}
    />
  );
}
