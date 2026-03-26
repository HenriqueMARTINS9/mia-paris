import {
  compactIdentifier,
  parseJsonObject,
  readArray,
  readBoolean,
  readNumber,
  readObject,
  readString,
} from "@/lib/record-helpers";
import {
  formatDetectedTypeLabel,
  mapRawEmailStatusToUiStatus,
  mapSuggestedPriority,
  normalizeConfidence,
} from "@/features/emails/metadata";
import type {
  EmailClassificationSummary,
  EmailListItem,
  EmailQualificationFields,
} from "@/features/emails/types";
import type {
  ClientRecord,
  EmailRecord,
  EmailThreadRecord,
  RequestOverview,
} from "@/types/crm";

interface MapEmailRecordArgs {
  clientRecordsById: Map<string, ClientRecord>;
  emailRecord: EmailRecord;
  requestRowsById: Map<string, RequestOverview>;
  threadRecordsById: Map<string, EmailThreadRecord>;
}

export function mapEmailRecordToListItem({
  clientRecordsById,
  emailRecord,
  requestRowsById,
  threadRecordsById,
}: Readonly<MapEmailRecordArgs>): EmailListItem {
  const threadId = readString(emailRecord, ["thread_id", "threadId"]);
  const threadRecord = threadId ? threadRecordsById.get(threadId) ?? null : null;
  const clientId = readString(emailRecord, ["client_id", "clientId"]);
  const clientRecord = clientId ? clientRecordsById.get(clientId) ?? null : null;
  const linkedRequestId =
    readString(emailRecord, ["request_id", "linked_request_id", "crm_request_id"]) ??
    null;
  const linkedRequestRow = linkedRequestId
    ? requestRowsById.get(linkedRequestId) ?? null
    : null;

  const classification =
    parseClassificationFromEmail(emailRecord) ??
    parseClassificationFromEmail(threadRecord);

  const fromEmail =
    readString(emailRecord, ["from_email", "sender_email", "email_from"]) ??
    extractEmailAddress(
      readString(emailRecord, ["sender", "from", "from_name"]) ?? null,
    ) ??
    "Expéditeur inconnu";

  const fromName =
    readString(emailRecord, ["from_name", "sender_name"]) ??
    extractSenderName(readString(emailRecord, ["sender", "from"]) ?? null) ??
    fromEmail;
  const subject =
    readString(emailRecord, ["subject", "thread_subject", "title"]) ??
    "Sans sujet";
  const receivedAt =
    readString(emailRecord, ["received_at", "sent_at", "created_at"]) ??
    new Date().toISOString();
  const previewText =
    readString(emailRecord, [
      "snippet",
      "preview_text",
      "body_preview",
      "text_preview",
      "summary",
    ]) ??
    readString(emailRecord, [
      "body_text",
      "text_content",
      "plain_text",
      "body",
      "content",
    ]) ??
    "Aucun aperçu disponible.";
  const bodyText =
    readString(emailRecord, [
      "body_text",
      "text_content",
      "plain_text",
      "body",
      "content",
      "html_text",
    ]) ?? null;
  const rawStatus =
    readString(emailRecord, ["processing_status", "status", "triage_status"]) ??
    "new";
  const confidence =
    normalizeConfidence(
      readNumber(emailRecord, [
        "ai_confidence",
        "classification_confidence",
        "confidence",
      ]),
    ) ??
    classification.confidence;
  const clientName =
    classification.suggestedFields.clientName ??
    readString(emailRecord, ["client_name", "detected_client_name"]) ??
    readString(clientRecord, ["name", "client_name"]) ??
    "Client non détecté";
  const detectedType =
    classification.suggestedFields.requestType ??
    formatDetectedTypeLabel(
      readString(emailRecord, ["detected_type", "request_type", "email_type"]),
    ) ??
    null;
  const summary =
    classification.suggestedFields.summary ??
    readString(emailRecord, ["ai_summary", "summary"]) ??
    null;
  const threadLabel =
    readString(threadRecord, ["subject", "title"]) ??
    readString(emailRecord, ["thread_subject"]) ??
    (threadId ? `Thread ${compactIdentifier(threadId, 6)}` : "Thread isolé");

  return {
    id: emailRecord.id,
    threadId,
    threadLabel,
    fromEmail,
    fromName,
    subject,
    receivedAt,
    previewText,
    bodyText,
    status: mapRawEmailStatusToUiStatus(rawStatus),
    rawStatus,
    clientId,
    clientName,
    detectedType,
    linkedRequestId,
    linkedRequestLabel: linkedRequestRow
      ? `${linkedRequestRow.client_name ?? "Client"} · ${linkedRequestRow.title}`
      : null,
    summary,
    confidence,
    classification: {
      ...classification,
      confidence,
      suggestedFields: {
        ...classification.suggestedFields,
        clientName,
        requestType: detectedType,
        summary,
      },
    },
    isUnread:
      readBoolean(emailRecord, ["is_unread", "unread"]) ??
      mapRawEmailStatusToUiStatus(rawStatus) === "new",
  };
}

export function getEmailRelatedIds(emailRecord: EmailRecord) {
  return {
    clientId: readString(emailRecord, ["client_id", "clientId"]),
    requestId: readString(emailRecord, [
      "request_id",
      "linked_request_id",
      "crm_request_id",
    ]),
    threadId: readString(emailRecord, ["thread_id", "threadId"]),
  };
}

function parseClassificationFromEmail(
  record: Record<string, unknown> | null | undefined,
): EmailClassificationSummary {
  const classification =
    parseJsonObject(
      readObject(record, [
        "classification",
        "classification_json",
        "ai_classification",
        "detected_payload",
        "analysis",
      ]),
    ) ??
    parseJsonObject(
      readString(record, [
        "classification",
        "classification_json",
        "ai_classification",
        "detected_payload",
        "analysis",
      ]),
    );
  const suggestedFields = buildSuggestedFields(record, classification);

  return {
    confidence: normalizeConfidence(
      readNumber(record, [
        "ai_confidence",
        "classification_confidence",
        "confidence",
      ]) ?? readNumber(classification, ["confidence", "score"]),
    ),
    raw: classification,
    simplifiedJson: buildSimplifiedJson(classification, suggestedFields),
    suggestedFields,
  };
}

function buildSuggestedFields(
  record: Record<string, unknown> | null | undefined,
  classification: Record<string, unknown> | null,
): EmailQualificationFields {
  return {
    actionExpected:
      readString(classification, ["action_expected", "next_action", "action"]) ??
      readString(record, ["action_expected", "expected_action"]) ??
      null,
    clientName:
      readString(classification, ["client_name", "client", "brand"]) ??
      readString(record, ["detected_client_name", "client_name"]) ??
      null,
    deadline:
      readString(classification, ["deadline", "due_at", "target_date"]) ??
      readString(record, ["detected_deadline", "deadline"]) ??
      null,
    department:
      readString(classification, ["department", "department_name"]) ??
      readString(record, ["detected_department", "department_name"]) ??
      null,
    priority: mapSuggestedPriority(
      readString(classification, ["priority", "priority_level"]) ??
        readString(record, ["detected_priority", "priority"]),
    ),
    requestType:
      formatDetectedTypeLabel(
        readString(classification, ["request_type", "type", "email_type"]) ??
          readString(record, ["detected_type", "request_type", "email_type"]),
      ) ?? null,
    summary:
      readString(classification, ["summary", "short_summary"]) ??
      readString(record, ["ai_summary", "summary"]) ??
      null,
  };
}

function buildSimplifiedJson(
  classification: Record<string, unknown> | null,
  suggestedFields: EmailQualificationFields,
) {
  if (!classification) {
    return {
      client: suggestedFields.clientName,
      department: suggestedFields.department,
      requestType: suggestedFields.requestType,
      priority: suggestedFields.priority,
      deadline: suggestedFields.deadline,
      summary: suggestedFields.summary,
      actionExpected: suggestedFields.actionExpected,
    };
  }

  const attachments = readArray(classification, ["attachments"]);

  return {
    client: suggestedFields.clientName,
    department: suggestedFields.department,
    requestType: suggestedFields.requestType,
    priority: suggestedFields.priority,
    deadline: suggestedFields.deadline,
    summary: suggestedFields.summary,
    actionExpected: suggestedFields.actionExpected,
    attachmentsCount: attachments?.length ?? 0,
  };
}

function extractSenderName(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(.*?)\s*<.+>$/);
  const candidate = match?.[1]?.trim();

  return candidate && candidate.length > 0 ? candidate : null;
}

function extractEmailAddress(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/<([^>]+)>/);

  return match?.[1]?.trim() ?? null;
}
