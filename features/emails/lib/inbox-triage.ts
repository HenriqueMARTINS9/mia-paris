import type {
  EmailInboxBucket,
  EmailInboxTriage,
} from "@/features/emails/types";
import type { EmailQualificationDraft } from "@/features/emails/types";
import { normalizeConfidence } from "@/features/emails/metadata";
import { readNumber, readString } from "@/lib/record-helpers";

const PROMOTIONAL_SENDER_PATTERNS = [
  "noreply",
  "no-reply",
  "newsletter",
  "mailchimp",
  "brevo",
  "sendinblue",
  "hubspot",
  "notification",
  "notifications@",
  "marketing",
  "promo",
  "eventbrite",
];

const PROMOTIONAL_SUBJECT_PATTERNS = [
  "unsubscribe",
  "désinscrire",
  "newsletter",
  "promotion",
  "promo",
  "sale",
  "soldes",
  "offre",
  "webinar",
  "event",
  "événement",
  "invitation",
  "new collection",
  "nouvelle collection",
  "lookbook",
];

const BUCKET_SYNONYMS: Record<EmailInboxBucket, string[]> = {
  important: ["important", "priority", "prioritaire", "actionable", "business"],
  promotional: ["promotional", "promotion", "promo", "marketing", "newsletter", "noise"],
  to_review: ["to_review", "review", "uncertain", "check", "verify", "a_verifier"],
};

export function resolveEmailInboxTriage(input: {
  attachmentCount: number;
  classification: Record<string, unknown> | null;
  clientId: string | null;
  detectedType: string | null;
  emailRecord: Record<string, unknown> | null;
  fromEmail: string;
  fromName: string;
  linkedRequestId: string | null;
  previewText: string;
  subject: string;
  suggestedFields: Pick<
    EmailQualificationDraft,
    "aiConfidence" | "dueAt" | "priority" | "requestType"
  >;
}): EmailInboxTriage {
  const storedBucket =
    normalizeEmailInboxBucket(
      readString(input.classification, [
        "assistant_bucket",
        "assistantBucket",
        "inbox_bucket",
        "inboxBucket",
        "email_bucket",
        "emailBucket",
        "bucket",
      ]) ??
        readString(input.emailRecord, [
          "assistant_bucket",
          "assistantBucket",
          "inbox_bucket",
          "inboxBucket",
          "email_bucket",
          "emailBucket",
          "bucket",
        ]),
    ) ?? null;

  if (storedBucket) {
    return {
      bucket: storedBucket,
      confidence:
        normalizeConfidence(
          readNumber(input.classification, [
            "assistant_bucket_confidence",
            "assistantBucketConfidence",
            "triage_confidence",
            "bucket_confidence",
          ]) ??
            readNumber(input.emailRecord, [
              "assistant_bucket_confidence",
              "assistantBucketConfidence",
              "triage_confidence",
              "bucket_confidence",
            ]),
        ) ?? input.suggestedFields.aiConfidence,
      reason:
        readString(input.classification, [
          "assistant_bucket_reason",
          "assistantBucketReason",
          "triage_reason",
          "bucket_reason",
        ]) ??
        readString(input.emailRecord, [
          "assistant_bucket_reason",
          "assistantBucketReason",
          "triage_reason",
          "bucket_reason",
        ]) ??
        "Tri stocké par l’assistant.",
      source: "stored",
    };
  }

  return inferEmailInboxTriage(input);
}

export function normalizeEmailInboxBucket(
  value: string | null | undefined,
): EmailInboxBucket | null {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, "_");

  for (const bucket of ["important", "promotional", "to_review"] as const) {
    if (BUCKET_SYNONYMS[bucket].includes(normalized)) {
      return bucket;
    }
  }

  return null;
}

function inferEmailInboxTriage(input: {
  attachmentCount: number;
  clientId: string | null;
  detectedType: string | null;
  fromEmail: string;
  fromName: string;
  linkedRequestId: string | null;
  previewText: string;
  subject: string;
  suggestedFields: Pick<
    EmailQualificationDraft,
    "aiConfidence" | "dueAt" | "priority" | "requestType"
  >;
}): EmailInboxTriage {
  const subject = input.subject.toLowerCase();
  const previewText = input.previewText.toLowerCase();
  const sender = `${input.fromEmail} ${input.fromName}`.toLowerCase();
  const combinedText = `${subject} ${previewText}`;
  const hasRequestSignal = Boolean(
    input.linkedRequestId ||
      input.clientId ||
      input.detectedType ||
      input.suggestedFields.requestType ||
      input.suggestedFields.dueAt ||
      input.attachmentCount > 0 ||
      input.suggestedFields.priority === "high" ||
      input.suggestedFields.priority === "critical",
  );
  const promotionalSender = PROMOTIONAL_SENDER_PATTERNS.some((pattern) =>
    sender.includes(pattern),
  );
  const promotionalSubject = PROMOTIONAL_SUBJECT_PATTERNS.some((pattern) =>
    combinedText.includes(pattern),
  );

  if (hasRequestSignal) {
    return {
      bucket: "important",
      confidence:
        input.suggestedFields.aiConfidence ??
        (input.linkedRequestId || input.suggestedFields.requestType ? 0.92 : 0.78),
      reason:
        input.linkedRequestId
          ? "Email déjà relié à une demande CRM."
          : "Signal métier détecté sur ce mail client.",
      source: "rules_v1",
    };
  }

  if (promotionalSender || promotionalSubject) {
    return {
      bucket: "promotional",
      confidence: promotionalSender && promotionalSubject ? 0.94 : 0.82,
      reason: "Signal newsletter, promotion ou communication marketing détecté.",
      source: "rules_v1",
    };
  }

  return {
    bucket: "to_review",
    confidence: input.suggestedFields.aiConfidence ?? 0.42,
    reason: "Le message ne porte pas assez de signaux métier nets pour être classé automatiquement.",
    source: "rules_v1",
  };
}
