import {
  compactIdentifier,
  readArray,
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
import {
  buildEmailQualificationDraft,
  mergeEmailQualificationDraft,
  normalizeDateInput,
} from "@/features/emails/lib/qualification";
import { resolveEmailInboxTriage } from "@/features/emails/lib/inbox-triage";
import type {
  EmailAssistantReply,
  EmailClassificationResult,
  EmailAttachmentListItem,
  EmailListItem,
  EmailQualificationDraft,
  EmailQualificationOption,
} from "@/features/emails/types";
import type {
  ClientRecord,
  EmailAttachmentRecord,
  EmailRecord,
  EmailThreadRecord,
  RequestOverview,
} from "@/types/crm";

interface MapEmailRecordArgs {
  attachmentRecordsByEmailId: Map<string, EmailAttachmentRecord[]>;
  clientRecordsById: Map<string, ClientRecord>;
  emailRecord: EmailRecord;
  requestRowsById: Map<string, RequestOverview>;
  threadRecordsById: Map<string, EmailThreadRecord>;
}

export function mapEmailRecordToListItem({
  attachmentRecordsByEmailId,
  clientRecordsById,
  emailRecord,
  requestRowsById,
  threadRecordsById,
}: Readonly<MapEmailRecordArgs>): EmailListItem {
  const rawClassification = readStoredClassification(emailRecord);
  const threadId = readString(emailRecord, ["thread_id", "threadId"]);
  const threadRecord = threadId ? threadRecordsById.get(threadId) ?? null : null;
  const clientId =
    readString(emailRecord, ["client_id", "clientId"]) ??
    readString(rawClassification, ["client_id"]) ??
    null;
  const clientRecord = clientId ? clientRecordsById.get(clientId) ?? null : null;
  const linkedRequestId =
    readString(emailRecord, ["request_id", "linked_request_id", "crm_request_id"]) ??
    readString(rawClassification, ["linkedRequestId", "linked_request_id", "request_id"]) ??
    null;
  const linkedRequestRow = linkedRequestId
    ? requestRowsById.get(linkedRequestId) ?? null
    : null;
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
  const attachments = (attachmentRecordsByEmailId.get(emailRecord.id) ?? [])
    .map(mapAttachmentRecordToListItem)
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
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
  const bodyHtml =
    readString(emailRecord, ["body_html", "html_content", "html_body"]) ?? null;
  const classification = parseClassificationFromRecord({
    existingClassification: rawClassification,
    emailRecord,
    fromEmail,
    fromName,
    previewText,
    subject,
    threadRecord,
    bodyText,
  });
  const rawStatus = resolveEmailDisplayStatus(emailRecord);
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
  const detectedType = formatDetectedTypeLabel(
    classification.suggestedFields.requestType,
  );
  const summary =
    classification.suggestedFields.summary ??
    readString(emailRecord, ["ai_summary", "summary"]) ??
    null;
  const threadLabel =
    readString(threadRecord, ["subject", "title"]) ??
    readString(emailRecord, ["thread_subject"]) ??
    (threadId ? `Thread ${compactIdentifier(threadId, 6)}` : "Thread isolé");
  const triage = resolveEmailInboxTriage({
    attachmentCount: attachments.length,
    classification: classification.raw,
    clientId,
    detectedType,
    emailRecord,
    fromEmail,
    fromName,
    linkedRequestId,
    previewText,
    subject,
    suggestedFields: classification.suggestedFields,
  });
  const assistantReply = readAssistantReply(emailRecord, classification.raw);

  return {
    attachments,
    assistantReply,
    bodyHtml,
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
      suggestedFields: mergeEmailQualificationDraft(
        classification.suggestedFields,
        {
          aiConfidence: confidence ?? classification.suggestedFields.aiConfidence,
          clientId:
            classification.suggestedFields.clientId ??
            clientId ??
            null,
          clientName,
          contactName:
            classification.suggestedFields.contactName ?? fromName ?? null,
          requestType:
            classification.suggestedFields.requestType ??
            null,
          summary,
          title: classification.suggestedFields.title || subject,
        },
      ),
    },
    triage,
    isUnread:
      readBoolean(emailRecord, ["is_unread", "unread"]) ??
      mapRawEmailStatusToUiStatus(rawStatus) === "new",
  };
}

function resolveEmailDisplayStatus(emailRecord: EmailRecord) {
  const assistantBucket = readString(emailRecord, [
    "assistant_bucket",
    "assistantBucket",
    "bucket",
  ]);

  if (assistantBucket === "to_review") {
    return "to_review";
  }

  if (readBoolean(emailRecord, ["is_processed"]) === true) {
    return "processed";
  }

  return (
    readString(emailRecord, ["processing_status", "status", "triage_status"]) ??
    "new"
  );
}

function readAssistantReply(
  emailRecord: EmailRecord,
  classification: Record<string, unknown> | null,
): EmailAssistantReply | null {
  const nestedAssistantReply =
    readObject(classification, ["assistant_reply", "assistantReply"]) ?? null;
  const type =
    readString(emailRecord, ["assistant_reply_type"]) ??
    readString(nestedAssistantReply, ["type"]);
  const subject =
    readString(emailRecord, ["assistant_reply_subject"]) ??
    readString(nestedAssistantReply, ["subject"]);
  const body =
    readString(emailRecord, ["assistant_reply_body"]) ??
    readString(nestedAssistantReply, ["body"]);

  if (!type || !subject || !body) {
    return null;
  }

  const recipients =
    readArray(emailRecord, ["assistant_reply_recipients"]) ??
    readArray(nestedAssistantReply, ["suggestedRecipients", "recipients"]) ??
    [];

  return {
    body,
    disclaimer:
      readString(emailRecord, ["assistant_reply_disclaimer"]) ??
      readString(nestedAssistantReply, ["disclaimer"]),
    generatedAt:
      readString(emailRecord, ["assistant_reply_generated_at"]) ??
      readString(nestedAssistantReply, ["generatedAt"]),
    subject,
    suggestedRecipients: recipients.filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ),
    type: type as EmailAssistantReply["type"],
  };
}

function mapAttachmentRecordToListItem(
  attachmentRecord: EmailAttachmentRecord,
): EmailAttachmentListItem {
  return {
    id: attachmentRecord.id,
    fileName:
      readString(attachmentRecord, ["filename", "file_name", "name", "title"]) ??
      "Pièce jointe",
    mimeType:
      readString(attachmentRecord, ["mime_type", "content_type", "type"]) ?? null,
    sizeBytes:
      readNumber(attachmentRecord, ["size_bytes", "file_size", "size"]) ?? null,
    storagePath:
      readString(attachmentRecord, [
        "storage_path",
        "file_url",
        "public_url",
        "url",
      ]) ?? null,
  };
}

export function getEmailRelatedIds(emailRecord: EmailRecord) {
  const rawClassification = readStoredClassification(emailRecord);

  return {
    clientId:
      readString(emailRecord, ["client_id", "clientId"]) ??
      readString(rawClassification, ["client_id"]) ??
      null,
    requestId: readString(emailRecord, [
      "request_id",
      "linked_request_id",
      "crm_request_id",
    ]) ??
      readString(rawClassification, ["linkedRequestId", "linked_request_id", "request_id"]) ??
      null,
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
      suggestedFields: mergeEmailQualificationDraft(fields, {
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
      }),
    },
  };
}

function parseClassificationFromRecord(input: {
  bodyText: string | null;
  emailRecord: EmailRecord;
  existingClassification: Record<string, unknown> | null;
  fromEmail: string;
  fromName: string;
  previewText: string;
  subject: string;
  threadRecord: EmailThreadRecord | null;
}): EmailClassificationResult {
  const rawClassification =
    input.existingClassification ??
    readObject(input.threadRecord, [
      "ai_classification",
      "classification",
      "classification_json",
      "analysis",
    ]) ??
    parseJsonObject(
      readString(input.threadRecord, [
        "ai_classification",
        "classification",
        "classification_json",
        "analysis",
      ]),
    );

  const helperDraft = buildEmailQualificationDraft({
    bodyText: input.bodyText,
    fromName: input.fromName,
    previewText: input.previewText,
    subject: input.subject,
  });
  const suggestedFields = buildSuggestedFields(
    input.emailRecord,
    rawClassification,
    helperDraft,
  );

  return {
    confidence:
      suggestedFields.aiConfidence ??
      normalizeConfidence(readNumber(rawClassification, ["confidence", "score"])),
    raw: rawClassification,
    source: rawClassification ? "stored" : "rules_v1",
    simplifiedJson: buildSimplifiedJson(rawClassification, suggestedFields),
    suggestedFields,
  };
}

function buildSuggestedFields(
  record: Record<string, unknown> | null | undefined,
  rawClassification: Record<string, unknown> | null,
  helperDraft: EmailQualificationDraft,
): EmailQualificationDraft {
  return mergeEmailQualificationDraft(helperDraft, {
    aiConfidence:
      normalizeConfidence(
        readNumber(record, [
          "ai_confidence",
          "classification_confidence",
          "confidence",
        ]) ?? readNumber(rawClassification, ["confidence", "score"]),
      ) ?? helperDraft.aiConfidence,
    assignedUserId:
      readString(rawClassification, ["assigned_user_id"]) ??
      readString(record, ["assigned_user_id"]) ??
      helperDraft.assignedUserId,
    assignedUserName:
      readString(rawClassification, ["assigned_user_name"]) ??
      readString(record, ["assigned_user_name"]) ??
      helperDraft.assignedUserName,
    clientId:
      readString(rawClassification, ["client_id"]) ??
      readString(record, ["client_id"]) ??
      helperDraft.clientId,
    clientName:
      readString(rawClassification, ["client_name", "client", "brand"]) ??
      readString(record, ["detected_client_name", "client_name"]) ??
      helperDraft.clientName,
    contactId:
      readString(rawClassification, ["contact_id"]) ??
      readString(record, ["contact_id"]) ??
      helperDraft.contactId,
    contactName:
      readString(rawClassification, ["contact_name", "contact"]) ??
      readString(record, ["contact_name"]) ??
      helperDraft.contactName,
    dueAt: normalizeDateInput(
      readString(rawClassification, ["deadline", "due_at", "target_date"]) ??
        readString(record, ["detected_deadline", "deadline", "due_at"]) ??
        helperDraft.dueAt,
    ),
    modelId:
      readString(rawClassification, ["model_id"]) ??
      readString(record, ["model_id"]) ??
      helperDraft.modelId,
    modelName:
      readString(rawClassification, ["model_name", "style_name", "reference"]) ??
      readString(record, ["model_name", "style_name", "reference"]) ??
      helperDraft.modelName,
    priority: mapSuggestedPriority(
      readString(rawClassification, ["priority", "priority_level"]) ??
        readString(record, ["detected_priority", "priority"]) ??
        helperDraft.priority,
    ),
    productDepartmentId:
      readString(rawClassification, ["product_department_id", "department_id"]) ??
      readString(record, ["product_department_id"]) ??
      helperDraft.productDepartmentId,
    productDepartmentName:
      readString(rawClassification, ["product_department", "department", "department_name"]) ??
      readString(record, ["department_name", "detected_department"]) ??
      helperDraft.productDepartmentName,
    requestType:
      normalizeRequestTypeValue(
        readString(rawClassification, ["request_type", "type", "email_type"]) ??
          readString(record, ["detected_type", "request_type", "email_type"]),
      ) ?? helperDraft.requestType,
    requestedAction:
      readString(rawClassification, [
        "requested_action",
        "action_expected",
        "next_action",
        "action",
      ]) ??
      readString(record, ["requested_action", "action_expected", "expected_action"]) ??
      helperDraft.requestedAction,
    requiresHumanValidation:
      readBoolean(rawClassification, ["requires_human_validation"]) ??
      readBoolean(record, ["requires_human_validation"]) ??
      helperDraft.requiresHumanValidation,
    summary:
      readString(rawClassification, ["summary", "short_summary"]) ??
      readString(record, ["ai_summary", "summary"]) ??
      helperDraft.summary,
    title:
      readString(rawClassification, ["title"]) ??
      readString(record, ["request_title", "title"]) ??
      helperDraft.title,
  });
}

function buildSimplifiedJson(
  classification: Record<string, unknown> | null,
  suggestedFields: EmailQualificationDraft,
) {
  return {
    title: suggestedFields.title,
    client: suggestedFields.clientName,
    contact: suggestedFields.contactName,
    productDepartment: suggestedFields.productDepartmentName,
    model: suggestedFields.modelName,
    requestType: suggestedFields.requestType,
    priority: suggestedFields.priority,
    dueAt: suggestedFields.dueAt,
    summary: suggestedFields.summary,
    requestedAction: suggestedFields.requestedAction,
    assignedUserId: suggestedFields.assignedUserId,
    requiresHumanValidation: suggestedFields.requiresHumanValidation,
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

function normalizeRequestTypeValue(value: string | null) {
  if (!value) {
    return null;
  }

  return value.toLowerCase().trim().replace(/\s+/g, "_");
}

function readStoredClassification(
  record: Record<string, unknown> | null | undefined,
) {
  return (
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
    )
  );
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
