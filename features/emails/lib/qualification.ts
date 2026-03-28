import type {
  EmailQualificationDraft,
  EmailQualificationRequestType,
} from "@/features/emails/types";
import type { RequestPriority } from "@/features/requests/types";

const requestTypeRules: Array<{
  action: string;
  keywords: string[];
  requestType: EmailQualificationRequestType;
}> = [
  {
    action: "Vérifier la demande de prix et préparer une réponse client.",
    keywords: ["prix", "cost", "cout", "coût", "target price", "quotation", "quote"],
    requestType: "price_request",
  },
  {
    action: "Confirmer le délai attendu et aligner les équipes métier.",
    keywords: ["deadline", "delai", "délai", "avant", "urgent", "today", "tomorrow", "asap"],
    requestType: "deadline_request",
  },
  {
    action: "Préparer l’envoi de la fiche technique ou du tech pack.",
    keywords: ["tds", "tech pack", "fiche technique", "technical datasheet"],
    requestType: "tds_request",
  },
  {
    action: "Préparer les swatches ou tirelles demandés.",
    keywords: ["swatch", "tirelle", "swatches", "color card"],
    requestType: "swatch_request",
  },
  {
    action: "Suivre la validation trim ou les corrections proto.",
    keywords: ["validation", "corriger", "proto", "trim", "approve"],
    requestType: "trim_validation",
  },
  {
    action: "Faire un point sur le suivi de production et les blocages.",
    keywords: ["production", "bloque", "bloqué", "usine", "factory"],
    requestType: "production_followup",
  },
  {
    action: "Vérifier les éléments logistiques, livraison ou export.",
    keywords: ["logistique", "livraison", "export", "shipping", "transport"],
    requestType: "logistics",
  },
  {
    action: "Lancer une revue interne développement produit.",
    keywords: ["development", "developpement", "développement", "develop", "sample development"],
    requestType: "development",
  },
  {
    action: "Contrôler les points conformité, composition ou étiquetage.",
    keywords: ["conformite", "conformité", "etiquette", "étiquette", "composition", "compliance", "care label"],
    requestType: "compliance",
  },
];

export function buildEmailQualificationDraft(input: {
  bodyText: string | null;
  fromName?: string | null;
  previewText: string | null;
  subject: string | null;
}): EmailQualificationDraft {
  const title = buildTitle(input.subject, input.fromName);
  const searchableText = normalizeText(
    [input.subject, input.previewText, input.bodyText].filter(Boolean).join(" "),
  );
  const requestTypeMatch = inferRequestType(searchableText);
  const priority = inferPriority(searchableText);
  const dueAt = inferDueAt(searchableText, priority);
  const aiConfidence = buildRuleConfidence(requestTypeMatch.score, priority, dueAt);

  return {
    aiConfidence,
    assignedUserId: null,
    assignedUserName: null,
    clientId: null,
    clientName: null,
    contactId: null,
    contactName: input.fromName?.trim() || null,
    dueAt,
    modelId: null,
    modelName: null,
    priority,
    productDepartmentId: null,
    productDepartmentName: null,
    requestType: requestTypeMatch.requestType,
    requestedAction:
      requestTypeMatch.action ?? "Qualifier le besoin et préparer la réponse métier.",
    requiresHumanValidation:
      requestTypeMatch.requestType === null || requestTypeMatch.score < 2,
    summary: buildSummary(input.bodyText, input.previewText, title),
    title,
  };
}

export function mergeEmailQualificationDraft(
  base: EmailQualificationDraft,
  overrides: Partial<EmailQualificationDraft>,
): EmailQualificationDraft {
  return {
    ...base,
    ...overrides,
    aiConfidence:
      typeof overrides.aiConfidence === "number" || overrides.aiConfidence === null
        ? overrides.aiConfidence
        : base.aiConfidence,
    dueAt: normalizeDateInput(overrides.dueAt ?? base.dueAt),
    title: (overrides.title ?? base.title).trim() || base.title,
  };
}

export function computeUrgencyScore(
  priority: RequestPriority,
  dueAt: string | null,
): number {
  const baseScore =
    priority === "critical" ? 95 : priority === "high" ? 78 : 54;

  if (!dueAt) {
    return baseScore;
  }

  const deltaDays = Math.ceil(
    (new Date(`${dueAt}T12:00:00`).getTime() - Date.now()) / 86_400_000,
  );

  if (deltaDays <= 0) {
    return 100;
  }

  if (deltaDays <= 1) {
    return Math.min(100, baseScore + 14);
  }

  if (deltaDays <= 2) {
    return Math.min(100, baseScore + 8);
  }

  return baseScore;
}

export function buildRawSourceExcerpt(
  bodyText: string | null,
  previewText: string | null,
  maxLength = 480,
) {
  const source = (bodyText ?? previewText ?? "").replace(/\s+/g, " ").trim();

  if (source.length <= maxLength) {
    return source || null;
  }

  return `${source.slice(0, maxLength - 1).trim()}…`;
}

export function normalizeDateInput(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function inferRequestType(text: string) {
  let bestMatch: {
    action: string | null;
    requestType: EmailQualificationRequestType | null;
    score: number;
  } = {
    action: null,
    requestType: null,
    score: 0,
  };

  for (const rule of requestTypeRules) {
    const score = rule.keywords.reduce((total, keyword) => {
      return total + (text.includes(normalizeText(keyword)) ? 1 : 0);
    }, 0);

    if (score > bestMatch.score) {
      bestMatch = {
        action: rule.action,
        requestType: rule.requestType,
        score,
      };
    }
  }

  return bestMatch;
}

function inferPriority(text: string): RequestPriority {
  if (
    /(urgent|asap|today|ce soir|avant\s+\d{1,2}h|avant\s+\d{1,2}:\d{2})/.test(text)
  ) {
    return "critical";
  }

  if (/(tomorrow|demain|avant|48h|48 h|this week|cette semaine)/.test(text)) {
    return "high";
  }

  return "normal";
}

function inferDueAt(text: string, priority: RequestPriority) {
  const today = new Date();

  if (/(today|ce soir|avant\s+\d{1,2}h|avant\s+\d{1,2}:\d{2})/.test(text)) {
    return shiftDate(today, 0);
  }

  if (/(tomorrow|demain)/.test(text)) {
    return shiftDate(today, 1);
  }

  if (/(48h|48 h|2 jours|2 days)/.test(text)) {
    return shiftDate(today, 2);
  }

  if (priority === "critical") {
    return shiftDate(today, 0);
  }

  if (priority === "high" && /(deadline|delai|délai|avant)/.test(text)) {
    return shiftDate(today, 2);
  }

  return null;
}

function buildRuleConfidence(
  requestTypeScore: number,
  priority: RequestPriority,
  dueAt: string | null,
) {
  const base = requestTypeScore >= 2 ? 0.72 : requestTypeScore === 1 ? 0.58 : 0.34;
  const priorityBonus = priority === "critical" ? 0.08 : priority === "high" ? 0.04 : 0;
  const dueBonus = dueAt ? 0.04 : 0;

  return Math.min(0.92, Number((base + priorityBonus + dueBonus).toFixed(2)));
}

function buildSummary(
  bodyText: string | null,
  previewText: string | null,
  fallback: string,
) {
  const source = (bodyText ?? previewText ?? fallback).replace(/\s+/g, " ").trim();

  if (source.length <= 240) {
    return source;
  }

  return `${source.slice(0, 237).trim()}…`;
}

function buildTitle(subject: string | null, fromName: string | null | undefined) {
  const trimmedSubject = subject?.trim();

  if (trimmedSubject && trimmedSubject.length > 0) {
    return trimmedSubject;
  }

  if (fromName && fromName.trim().length > 0) {
    return `Email de ${fromName.trim()}`;
  }

  return "Email entrant à qualifier";
}

function shiftDate(baseDate: Date, days: number) {
  const next = new Date(baseDate);
  next.setDate(baseDate.getDate() + days);

  return next.toISOString().slice(0, 10);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
