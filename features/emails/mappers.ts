import {
  compactIdentifier,
  parseJsonObject,
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
  EmailQualificationOption,
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
    parseClassificationFromRecord(emailRecord) ??
    parseClassificationFromRecord(threadRecord);

  const fromEmail =
    readString(emailRecord, ["from_email", "sender_email", "email_from"]) ??
    extractEmailAddress(readString(emailRecord, ["sender", "from"]) ?? null) ??
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
      ]) ?? readNumber(classification.raw, ["confidence", "score"]),
    ) ?? classification.suggestedFields.aiConfidence;
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
        aiConfidence:
          confidence ?? classification.suggestedFields.aiConfidence ?? null,
        clientId:
          classification.suggestedFields.clientId ??
          clientId ??
          null,
        clientName,
        contactName:
          classification.suggestedFields.contactName ?? fromName ?? null,
        requestType:
          classification.suggestedFields.requestType ?? detectedType ?? null,
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

export function hydrateEmailQualificationFields(
  email: EmailListItem,
  options: {
    clients: EmailQualificationOption[];
    contacts: EmailQualificationOption[];
    models: EmailQualificationOption[];
    productDepartments: EmailQualificationOption[];
  },
) {
  const fields = email.classification.suggestedFields;
  const matchedClient =
    findOptionByIdOrLabel(options.clients, fields.clientId, fields.clientName) ?? null;
  const matchedContact =
    findContactOption(options.contacts, {
      clientId: matchedClient?.id ?? fields.clientId ?? null,
      contactId: fields.contactId,
      contactName: fields.contactName,
      fromEmail: email.fromEmail,
    }) ?? null;
  const matchedDepartment =
    findOptionByIdOrLabel(
      options.productDepartments,
      fields.productDepartmentId,
      fields.productDepartmentName,
    ) ?? null;
  const matchedModel =
    findOptionByIdOrLabel(options.models, fields.modelId, fields.modelName) ?? null;

  return {
    ...email,
    clientId: matchedClient?.id ?? email.clientId,
    clientName: matchedClient?.label ?? email.clientName,
    classification: {
      ...email.classification,
      suggestedFields: {
        ...fields,
        clientId: matchedClient?.id ?? fields.clientId ?? email.clientId ?? null,
        clientName: matchedClient?.label ?? fields.clientName ?? email.clientName,
        contactId: matchedContact?.id ?? fields.contactId ?? null,
        contactName: matchedContact?.label ?? fields.contactName ?? email.fromName,
        modelId: matchedModel?.id ?? fields.modelId ?? null,
        modelName: matchedModel?.label ?? fields.modelName ?? null,
        productDepartmentId:
          matchedDepartment?.id ?? fields.productDepartmentId ?? null,
        productDepartmentName:
          matchedDepartment?.label ?? fields.productDepartmentName ?? null,
      },
    },
  };
}

function parseClassificationFromRecord(
  record: Record<string, unknown> | null | undefined,
): EmailClassificationSummary {
  const rawClassification =
    readObject(record, [
      "ai_classification",
      "classification",
      "classification_json",
      "ai_classification_json",
      "detected_payload",
      "analysis",
    ]) ??
    parseJsonObject(
      readString(record, [
        "ai_classification",
        "classification",
        "classification_json",
        "ai_classification_json",
        "detected_payload",
        "analysis",
      ]),
    );
  const suggestedFields = buildSuggestedFields(record, rawClassification);

  return {
    confidence:
      suggestedFields.aiConfidence ??
      normalizeConfidence(readNumber(rawClassification, ["confidence", "score"])),
    raw: rawClassification,
    simplifiedJson: buildSimplifiedJson(rawClassification, suggestedFields),
    suggestedFields,
  };
}

function buildSuggestedFields(
  record: Record<string, unknown> | null | undefined,
  rawClassification: Record<string, unknown> | null,
): EmailQualificationFields {
  const clientName =
    readString(rawClassification, ["client_name", "client", "brand"]) ??
    readString(record, ["detected_client_name", "client_name"]) ??
    null;
  const contactName =
    readString(rawClassification, ["contact_name", "contact"]) ??
    readString(record, ["contact_name"]) ??
    null;
  const productDepartmentName =
    readString(rawClassification, ["product_department", "department", "department_name"]) ??
    readString(record, ["department_name", "detected_department"]) ??
    null;
  const modelName =
    readString(rawClassification, ["model_name", "style_name", "reference"]) ??
    readString(record, ["model_name", "style_name", "reference"]) ??
    null;
  const dueAt = normalizeDateInput(
    readString(rawClassification, ["deadline", "due_at", "target_date"]) ??
      readString(record, ["detected_deadline", "deadline", "due_at"]),
  );
  const requestType = normalizeRequestTypeValue(
    readString(rawClassification, ["request_type", "type", "email_type"]) ??
      readString(record, ["detected_type", "request_type", "email_type"]),
  );

  return {
    aiConfidence:
      normalizeConfidence(
        readNumber(record, [
          "ai_confidence",
          "classification_confidence",
          "confidence",
        ]) ?? readNumber(rawClassification, ["confidence", "score"]),
      ) ?? null,
    clientId:
      readString(rawClassification, ["client_id"]) ??
      readString(record, ["client_id"]) ??
      null,
    clientName,
    contactId:
      readString(rawClassification, ["contact_id"]) ??
      readString(record, ["contact_id"]) ??
      null,
    contactName,
    dueAt,
    modelId:
      readString(rawClassification, ["model_id"]) ??
      readString(record, ["model_id"]) ??
      null,
    modelName,
    priority: mapSuggestedPriority(
      readString(rawClassification, ["priority", "priority_level"]) ??
        readString(record, ["detected_priority", "priority"]),
    ),
    productDepartmentId:
      readString(rawClassification, ["product_department_id", "department_id"]) ??
      readString(record, ["product_department_id"]) ??
      null,
    productDepartmentName,
    requestType,
    requestedAction:
      readString(rawClassification, ["requested_action", "action_expected", "next_action", "action"]) ??
      readString(record, ["requested_action", "action_expected", "expected_action"]) ??
      null,
    summary:
      readString(rawClassification, ["summary", "short_summary"]) ??
      readString(record, ["ai_summary", "summary"]) ??
      null,
  };
}

function buildSimplifiedJson(
  classification: Record<string, unknown> | null,
  suggestedFields: EmailQualificationFields,
) {
  return {
    client: suggestedFields.clientName,
    contact: suggestedFields.contactName,
    productDepartment: suggestedFields.productDepartmentName,
    model: suggestedFields.modelName,
    requestType: suggestedFields.requestType,
    priority: suggestedFields.priority,
    dueAt: suggestedFields.dueAt,
    summary: suggestedFields.summary,
    requestedAction: suggestedFields.requestedAction,
    aiConfidence: suggestedFields.aiConfidence,
    hasRawClassification: Boolean(classification),
  };
}

function findOptionByIdOrLabel(
  options: EmailQualificationOption[],
  id: string | null,
  label: string | null,
) {
  if (id) {
    const byId = options.find((option) => option.id === id);

    if (byId) {
      return byId;
    }
  }

  if (!label) {
    return null;
  }

  const normalized = normalizeText(label);
  return (
    options.find((option) => normalizeText(option.label) === normalized) ?? null
  );
}

function findContactOption(
  options: EmailQualificationOption[],
  input: {
    clientId: string | null;
    contactId: string | null;
    contactName: string | null;
    fromEmail: string;
  },
) {
  if (input.contactId) {
    const byId = options.find((option) => option.id === input.contactId);

    if (byId) {
      return byId;
    }
  }

  const scopedOptions = input.clientId
    ? options.filter((option) => option.clientId === input.clientId)
    : options;
  const byEmail =
    scopedOptions.find(
      (option) =>
        normalizeText(option.secondary ?? "") === normalizeText(input.fromEmail),
    ) ?? null;

  if (byEmail) {
    return byEmail;
  }

  if (!input.contactName) {
    return null;
  }

  const normalizedName = normalizeText(input.contactName);
  return (
    scopedOptions.find(
      (option) => normalizeText(option.label) === normalizedName,
    ) ?? null
  );
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDateInput(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeRequestTypeValue(value: string | null) {
  if (!value) {
    return null;
  }

  return value.toLowerCase().trim().replace(/\s+/g, "_");
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
