import type { WorkspaceDefinition, WorkspaceKey } from "@/features/workspaces/types";

export const workspaceDefinitions: Record<WorkspaceKey, WorkspaceDefinition> = {
  development: {
    badge: "Produit",
    description:
      "Hub développement produit pour cadrer les croquis, prototypes, TDS, tirelles et validations trim sans rebalayer tout le CRM.",
    documentTypes: ["tech_pack", "proto_photo", "label_artwork", "other"],
    emailTypes: ["development", "tds_request", "swatch_request", "trim_validation"],
    eyebrow: "Pôle métier · Développement",
    primaryActionHref: "/demandes",
    primaryActionLabel: "Voir toutes les demandes",
    requestTypes: ["development", "tds_request", "swatch_request", "trim_validation"],
    secondaryActionHref: "/emails",
    secondaryActionLabel: "Ouvrir l’inbox",
    taskTypes: ["follow_up", "validation", "swatch_prepare", "tds_send", "validation_followup", "internal_review"],
    title: "Développement",
  },
  logistics: {
    badge: "Flux",
    description:
      "Pilotage logistique et conformité : délais, documents export, contrôles qualité et blocages production à sécuriser avant expédition.",
    documentTypes: ["packing_list", "lab_test", "inspection_report", "composition_label"],
    emailTypes: ["logistics", "compliance", "deadline_request", "production_followup"],
    eyebrow: "Pôle métier · Logistique",
    primaryActionHref: "/productions",
    primaryActionLabel: "Voir les productions",
    requestTypes: ["logistics", "compliance", "deadline_request", "production_followup"],
    secondaryActionHref: "/deadlines",
    secondaryActionLabel: "Voir les urgences",
    taskTypes: ["logistics_check", "production", "follow_up", "internal_review"],
    title: "Logistique",
  },
  billing: {
    badge: "Prix & Docs",
    description:
      "Vue dédiée aux demandes de prix, price sheets et factures pour suivre rapidement ce qui peut bloquer chiffrage, facturation ou validation client.",
    documentTypes: ["invoice", "price_sheet"],
    emailTypes: ["price_request"],
    eyebrow: "Pôle métier · Facturation",
    primaryActionHref: "/demandes",
    primaryActionLabel: "Voir les demandes prix",
    requestTypes: ["price_request"],
    secondaryActionHref: "/productions",
    secondaryActionLabel: "Voir les productions",
    taskTypes: ["price_check", "costing", "follow_up"],
    title: "Facturation",
  },
};
