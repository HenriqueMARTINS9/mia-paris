import { mapRawRequestPriorityToUiPriority } from "@/features/requests/metadata";
import type {
  EmailInboxBucket,
  EmailQualificationRequestType,
  EmailProcessingStatus,
} from "@/features/emails/types";
import type { RequestPriority } from "@/features/requests/types";
import { titleCaseFromSnake } from "@/lib/record-helpers";

export const emailRequestTypeOptions = [
  "price_request",
  "deadline_request",
  "tds_request",
  "swatch_request",
  "trim_validation",
  "production_followup",
  "logistics",
  "development",
  "compliance",
] as const;

export const emailRequestTypeMeta: Record<
  EmailQualificationRequestType,
  { label: string }
> = {
  price_request: { label: "Demande de prix" },
  deadline_request: { label: "Demande de délai" },
  tds_request: { label: "Demande fiche technique" },
  swatch_request: { label: "Demande d’échantillon" },
  trim_validation: { label: "Validation trim" },
  production_followup: { label: "Suivi production" },
  logistics: { label: "Logistique" },
  development: { label: "Développement" },
  compliance: { label: "Conformité" },
};

export const emailStatusMeta: Record<
  EmailProcessingStatus,
  { label: string; description: string }
> = {
  new: {
    label: "Nouveau",
    description: "Email encore non traité dans la file métier.",
  },
  review: {
    label: "À revoir",
    description: "Email à requalifier ou arbitrer.",
  },
  processed: {
    label: "Traité",
    description: "Email absorbé dans le CRM ou clôturé.",
  },
};

export const emailInboxBucketMeta: Record<
  EmailInboxBucket,
  { description: string; label: string }
> = {
  important: {
    label: "Important",
    description: "Emails métier à traiter en priorité dans l’inbox principale.",
  },
  promotional: {
    label: "Pub",
    description: "Newsletters, promotions ou bruit commercial non prioritaire.",
  },
  to_review: {
    label: "À vérifier",
    description: "Emails incertains à relire avant de les classer.",
  },
};

const emailStatusSynonyms: Record<EmailProcessingStatus, string[]> = {
  new: ["pending", "new", "open", "unread"],
  review: ["review", "to_review", "needs_review", "flagged"],
  processed: ["processed", "done", "qualified", "classified", "closed"],
};

export function mapRawEmailStatusToUiStatus(
  rawStatus: string | null | undefined,
): EmailProcessingStatus {
  const normalized = (rawStatus ?? "").trim().toLowerCase();

  for (const status of ["new", "review", "processed"] as const) {
    if (emailStatusSynonyms[status].some((candidate) => normalized.includes(candidate))) {
      return status;
    }
  }

  return "new";
}

export function mapUiEmailStatusToDatabaseValues(status: EmailProcessingStatus) {
  return emailStatusSynonyms[status];
}

export function normalizeConfidence(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (value > 1) {
    return Math.min(value / 100, 1);
  }

  return Math.max(0, Math.min(value, 1));
}

export function formatDetectedTypeLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().trim() as EmailQualificationRequestType;

  if (normalized in emailRequestTypeMeta) {
    return emailRequestTypeMeta[normalized].label;
  }

  return titleCaseFromSnake(value);
}

export function mapSuggestedPriority(value: string | null | undefined): RequestPriority {
  return mapRawRequestPriorityToUiPriority(value ?? null);
}
