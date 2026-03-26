import type {
  ProductionRisk,
  ProductionStatus,
} from "@/features/productions/types";
import { titleCaseFromSnake } from "@/lib/record-helpers";

export const productionStatusMeta: Record<
  ProductionStatus,
  { label: string; description: string }
> = {
  planned: {
    label: "Planifiée",
    description: "Production calée mais pas encore démarrée.",
  },
  in_progress: {
    label: "En cours",
    description: "Production active côté atelier ou fournisseur.",
  },
  blocked: {
    label: "Bloquée",
    description: "Blocage à lever avant poursuite.",
  },
  completed: {
    label: "Terminée",
    description: "Production clôturée ou expédiée.",
  },
};

export const productionRiskMeta: Record<ProductionRisk, { label: string }> = {
  critical: { label: "Critique" },
  high: { label: "Haute" },
  normal: { label: "Normale" },
  low: { label: "Faible" },
};

export const productionStatusOptions: ProductionStatus[] = [
  "planned",
  "in_progress",
  "blocked",
  "completed",
];

export const productionRiskOptions: ProductionRisk[] = [
  "critical",
  "high",
  "normal",
  "low",
];

const statusSynonyms: Record<ProductionStatus, string[]> = {
  planned: ["planned", "planifiee", "queued", "open", "pending"],
  in_progress: ["in_progress", "active", "running", "started", "ongoing"],
  blocked: ["blocked", "on_hold", "hold", "issue", "delayed"],
  completed: ["completed", "done", "finished", "shipped", "closed"],
};

const riskSynonyms: Record<ProductionRisk, string[]> = {
  critical: ["critical", "critique", "severe", "severe_risk"],
  high: ["high", "haute", "elevated"],
  normal: ["normal", "medium", "moderate", "standard"],
  low: ["low", "faible", "minor"],
};

export function mapRawProductionStatusToUiStatus(
  rawStatus: string | null | undefined,
): ProductionStatus {
  const normalized = (rawStatus ?? "").trim().toLowerCase();

  for (const status of productionStatusOptions) {
    if (statusSynonyms[status].some((candidate) => normalized.includes(candidate))) {
      return status;
    }
  }

  return "planned";
}

export function mapRawProductionRiskToUiRisk(
  rawRisk: string | null | undefined,
): ProductionRisk {
  const normalized = (rawRisk ?? "").trim().toLowerCase();

  for (const risk of productionRiskOptions) {
    if (riskSynonyms[risk].some((candidate) => normalized.includes(candidate))) {
      return risk;
    }
  }

  return "normal";
}

export function mapUiProductionStatusToDatabaseValues(status: ProductionStatus) {
  return statusSynonyms[status];
}

export function mapUiProductionRiskToDatabaseValues(risk: ProductionRisk) {
  return risk === "normal" ? ["normal", "medium"] : riskSynonyms[risk];
}

export function formatProductionModeLabel(value: string | null | undefined) {
  return titleCaseFromSnake(value) ?? "Mode non renseigné";
}
