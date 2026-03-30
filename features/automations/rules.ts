import type {
  AutomationRuleDefinition,
  AutomationRuleKey,
} from "@/features/automations/types";

export const automationRuleCatalog: Record<
  AutomationRuleKey,
  AutomationRuleDefinition
> = {
  deadline_critical: {
    key: "deadline_critical",
    label: "Deadline critique",
    description:
      "Remonte les deadlines déjà en retard ou attendues sous 24 heures.",
    lane: "process",
    nextAction: "Arbitrer la priorité et confirmer le prochain retour attendu.",
    priority: "critical",
    thresholdHours: 24,
  },
  email_unqualified_urgent: {
    key: "email_unqualified_urgent",
    label: "Email non qualifié",
    description:
      "Met en avant les emails métier encore non traités après un délai court.",
    lane: "process",
    nextAction: "Ouvrir l’email, qualifier la demande puis créer ou rattacher la request.",
    priority: "high",
    thresholdHours: 8,
  },
  production_blocked_too_long: {
    key: "production_blocked_too_long",
    label: "Production bloquée trop longtemps",
    description:
      "Escalade les productions bloquées ou avec motif de blocage persistant.",
    lane: "decide",
    nextAction: "Décider d’une relance atelier, d’un arbitrage client ou d’une escalade interne.",
    priority: "critical",
    thresholdHours: 24,
  },
  production_high_risk: {
    key: "production_high_risk",
    label: "Production à haut risque",
    description:
      "Place en arbitrage les productions marquées high ou critical.",
    lane: "decide",
    nextAction: "Vérifier le plan d’action et affecter un suivi rapproché.",
    priority: "high",
  },
  request_missing_documents: {
    key: "request_missing_documents",
    label: "Documents manquants",
    description:
      "Signale les dossiers actifs sans document métier réellement attaché.",
    lane: "decide",
    nextAction: "Créer ou rattacher le document manquant avant la prochaine étape.",
    priority: "high",
    thresholdHours: 24,
  },
  request_probable_duplicate: {
    key: "request_probable_duplicate",
    label: "Doublon probable",
    description:
      "Détecte des demandes très proches déjà ouvertes pour le même client.",
    lane: "decide",
    nextAction: "Comparer les demandes proches puis fusionner ou clarifier le dossier.",
    priority: "high",
  },
  request_stale: {
    key: "request_stale",
    label: "Demande sans mise à jour",
    description:
      "Repère les demandes actives sans évolution récente dans le pipeline.",
    lane: "process",
    nextAction: "Relancer le dossier ou créer une tâche de suivi immédiate.",
    priority: "high",
    thresholdHours: 48,
  },
  request_unassigned: {
    key: "request_unassigned",
    label: "Demande non assignée",
    description:
      "Liste les demandes encore sans owner clair dans le CRM.",
    lane: "process",
    nextAction: "Assigner un owner métier pour sécuriser la suite.",
    priority: "high",
    thresholdHours: 4,
  },
  task_overdue: {
    key: "task_overdue",
    label: "Tâche en retard",
    description:
      "Met en avant les tâches ouvertes ayant dépassé leur échéance.",
    lane: "process",
    nextAction: "Mettre à jour le statut, réassigner ou clore la tâche.",
    priority: "critical",
    thresholdHours: 1,
  },
  validation_pending_too_long: {
    key: "validation_pending_too_long",
    label: "Validation trop lente",
    description:
      "Escalade les validations pending depuis trop longtemps.",
    lane: "decide",
    nextAction: "Obtenir une décision, relancer le validateur ou arbitrer l’attente.",
    priority: "high",
    thresholdHours: 72,
  },
};

export const automationRuleList = Object.values(automationRuleCatalog);
