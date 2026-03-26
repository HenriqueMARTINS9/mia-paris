import type {
  ProductionStage,
  RequestAssigneeOption,
  RequestPriority,
  RequestStatus,
} from "@/features/requests/types";

export const requestStatusMeta: Record<
  RequestStatus,
  { label: string; description: string }
> = {
  new: {
    label: "Nouvelle",
    description: "Demande récemment créée côté métier.",
  },
  qualification: {
    label: "Qualification",
    description: "Contexte et besoin en cours de cadrage.",
  },
  costing: {
    label: "Chiffrage",
    description: "Prix, délai ou faisabilité à verrouiller.",
  },
  awaiting_validation: {
    label: "Attente validation",
    description: "En attente d'un GO produit, client ou matière.",
  },
  approved: {
    label: "Validée",
    description: "Dossier prêt pour l'étape suivante.",
  },
  in_production: {
    label: "En production",
    description: "Suivi opérationnel atelier ou fabrication.",
  },
};

export const requestPriorityMeta: Record<RequestPriority, { label: string }> = {
  critical: { label: "Critique" },
  high: { label: "Haute" },
  normal: { label: "Normale" },
};

export const productionStageMeta: Record<ProductionStage, { label: string }> = {
  brief: { label: "Brief client" },
  sourcing: { label: "Sourcing" },
  sampling: { label: "Prototype" },
  approved: { label: "OK prod" },
  production: { label: "En atelier" },
};

export const requestPriorityOptions: RequestPriority[] = [
  "critical",
  "high",
  "normal",
];

export function getStatusOptionsForRequestType(
  requestType: string,
): RequestStatus[] {
  const normalized = requestType.toLowerCase();

  if (normalized.includes("price") || normalized.includes("cost")) {
    return ["new", "costing", "approved"];
  }

  if (normalized.includes("validation") || normalized.includes("trim")) {
    return ["new", "awaiting_validation", "approved"];
  }

  if (normalized.includes("production")) {
    return ["qualification", "in_production", "approved"];
  }

  return ["new", "qualification", "approved"];
}

export function mapRawRequestStatusToUiStatus(
  rawStatus: string | null,
  requestType: string,
): RequestStatus {
  const status = (rawStatus ?? "").toLowerCase();
  const type = requestType.toLowerCase();

  if (status === "new") {
    return "new";
  }

  if (status === "qualification") {
    return "qualification";
  }

  if (status === "costing") {
    return "costing";
  }

  if (status === "awaiting_validation") {
    return "awaiting_validation";
  }

  if (status === "approved" || status === "done") {
    return "approved";
  }

  if (status === "in_production") {
    return "in_production";
  }

  if (status === "qualified") {
    if (type.includes("price") || type.includes("cost")) {
      return "costing";
    }

    if (type.includes("validation") || type.includes("trim")) {
      return "awaiting_validation";
    }

    return "qualification";
  }

  if (status === "in_progress") {
    if (type.includes("production")) {
      return "in_production";
    }

    if (type.includes("validation") || type.includes("trim")) {
      return "awaiting_validation";
    }

    if (type.includes("price") || type.includes("cost")) {
      return "costing";
    }

    return "qualification";
  }

  return "qualification";
}

export function mapUiStatusToDatabaseStatus(
  status: RequestStatus,
  requestType: string,
) {
  if (status === "new") {
    return "new";
  }

  if (status === "approved") {
    return "done";
  }

  if (status === "in_production") {
    return "in_progress";
  }

  if (status === "qualification") {
    return "qualified";
  }

  if (status === "costing") {
    return requestType.toLowerCase().includes("price") ? "qualified" : "in_progress";
  }

  if (status === "awaiting_validation") {
    return "qualified";
  }

  return "qualified";
}

export function mapRawRequestPriorityToUiPriority(
  rawPriority: string | null,
): RequestPriority {
  const priority = (rawPriority ?? "").toLowerCase();

  if (priority.includes("crit")) {
    return "critical";
  }

  if (priority.includes("high")) {
    return "high";
  }

  return "normal";
}

export function mapUiPriorityToDatabasePriority(priority: RequestPriority) {
  if (priority === "normal") {
    return "medium";
  }

  return priority;
}

export function formatAssigneeLabel(assignee: RequestAssigneeOption) {
  return assignee.email
    ? `${assignee.fullName} · ${assignee.email}`
    : assignee.fullName;
}
