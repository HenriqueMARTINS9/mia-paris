import { mapRawRequestPriorityToUiPriority } from "@/features/requests/metadata";
import type {
  EmailProcessingStatus,
} from "@/features/emails/types";
import type { RequestPriority } from "@/features/requests/types";
import { titleCaseFromSnake } from "@/lib/record-helpers";

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

const emailStatusSynonyms: Record<EmailProcessingStatus, string[]> = {
  new: ["new", "open", "pending", "unread"],
  review: ["review", "to_review", "needs_review", "flagged"],
  processed: ["processed", "done", "qualified", "closed"],
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
  return titleCaseFromSnake(value);
}

export function mapSuggestedPriority(value: string | null | undefined): RequestPriority {
  return mapRawRequestPriorityToUiPriority(value ?? null);
}
