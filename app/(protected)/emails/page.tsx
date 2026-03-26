import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/crm/placeholder-page";

export const metadata: Metadata = {
  title: "Inbox emails",
};

export default function EmailsPage() {
  return (
    <PlaceholderPage
      eyebrow="Étape 8 · Inbox emails"
      title="Inbox emails"
      description="L'inbox métier sera conçue comme une file d'entrée intelligente pour absorber le volume email et le transformer rapidement en objets CRM exploitables."
      focus={[
        "Liste d'emails entrants avec extraction contexte client, deadline et produit.",
        "Actions rapides de qualification vers demande, tâche, validation ou document.",
        "Liens directs avec la validation IA avant création définitive dans le CRM.",
      ]}
    />
  );
}
