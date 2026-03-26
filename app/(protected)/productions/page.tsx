import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/crm/placeholder-page";

export const metadata: Metadata = {
  title: "Productions",
};

export default function ProductionsPage() {
  return (
    <PlaceholderPage
      eyebrow="Étape 6 · Productions"
      title="Productions"
      description="La vue Productions suivra les lancements atelier, inspections, embarquements et points qualité avec une lecture adaptée au métier textile B2B."
      focus={[
        "Colonnes atelier, stade, inspection, ETA et documents techniques.",
        "Filtrage par client, saison, usine et niveau de risque.",
        "Connexion naturelle depuis une demande validée vers la production active.",
      ]}
    />
  );
}
