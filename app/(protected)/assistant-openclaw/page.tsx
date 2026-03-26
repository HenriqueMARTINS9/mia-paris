import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/crm/placeholder-page";

export const metadata: Metadata = {
  title: "Assistant OpenClaw",
};

export default function AssistantOpenclawPage() {
  return (
    <PlaceholderPage
      eyebrow="Étape 10 · Assistant OpenClaw"
      title="Assistant OpenClaw"
      description="La préparation de l'intégration OpenClaw prendra place ici pour orchestrer les actions, copiloter la qualification et proposer les prochains gestes métier."
      focus={[
        "Zone de préparation des prompts, outils et permissions agentiques.",
        "Vue sur les entités métier exposées à l'assistant textile.",
        "Mécanismes de tests et de garde-fous avant automatisation complète.",
      ]}
    />
  );
}
