import { mapRequestOverviewRowToListItem } from "@/features/requests/mappers";
import type {
  RelatedDeadlineItem,
  RelatedDocumentItem,
  RelatedEmailItem,
  RelatedTaskItem,
  RelatedValidationItem,
  RequestActivityItem,
  RequestDetailItem,
  RequestNoteField,
  SupabaseRecord,
} from "@/features/requests/detail-types";
import type { RequestOverview } from "@/types/crm";

export const REQUEST_NOTE_FIELDS: RequestNoteField[] = [
  "notes",
  "internal_notes",
  "note",
];

export function mapRequestDetailItem(
  overviewRow: RequestOverview,
  requestRow: SupabaseRecord | null,
  clientRow: SupabaseRecord | null,
  modelRow: SupabaseRecord | null,
): RequestDetailItem {
  const baseItem = mapRequestOverviewRowToListItem(overviewRow);
  const noteField = detectRequestNoteField(requestRow);
  const persistedNote = noteField ? pickString(requestRow, noteField) : null;
  const clientDisplayName =
    pickString(clientRow, "name", "label", "title", "client_name") ??
    baseItem.clientName;
  const departmentDisplayName =
    pickString(
      requestRow,
      "department_name",
      "department_label",
      "department",
    ) ?? baseItem.department;
  const modelName =
    pickString(
      modelRow,
      "name",
      "label",
      "title",
      "model_name",
      "style_name",
    ) ??
    pickString(requestRow, "model_name", "style_name", "model_label");
  const modelReference =
    pickString(
      modelRow,
      "reference",
      "code",
      "internal_ref",
      "client_ref",
      "sku",
    ) ??
    pickString(requestRow, "model_ref", "model_reference", "style_ref");

  return {
    ...baseItem,
    assignedUserId: pickString(requestRow, "assigned_user_id") ?? baseItem.assignedUserId,
    clientId: pickString(requestRow, "client_id"),
    clientName: clientDisplayName,
    contactId: pickString(requestRow, "contact_id"),
    createdAt: pickString(requestRow, "created_at") ?? overviewRow.created_at,
    department: departmentDisplayName,
    modelId: pickString(requestRow, "model_id"),
    modelName,
    modelReference,
    noteField,
    persistedNote,
    requestSummary: buildRequestSummary(baseItem.notes, persistedNote),
    updatedAt: pickString(requestRow, "updated_at") ?? overviewRow.updated_at,
  };
}

export function mapRelatedTaskRow(
  row: SupabaseRecord,
  index: number,
): RelatedTaskItem {
  return {
    assigneeName:
      pickString(row, "assigned_user_name", "owner_name", "assignee_name") ??
      "Non assigné",
    createdAt: pickString(row, "created_at", "updated_at"),
    dueAt: pickString(row, "due_at", "deadline_at"),
    id: pickString(row, "id") ?? `task-${index}`,
    priority: humanizeValue(pickString(row, "priority") ?? "normal"),
    status: humanizeValue(pickString(row, "status") ?? "open"),
    taskType: humanizeValue(
      pickString(row, "task_type", "type", "category") ?? "task",
    ),
    title: pickString(row, "title", "label", "name") ?? "Tâche sans titre",
  };
}

export function mapRelatedDeadlineRow(
  row: SupabaseRecord,
  index: number,
): RelatedDeadlineItem {
  return {
    deadlineAt: pickString(row, "deadline_at", "due_at"),
    id: pickString(row, "id") ?? `deadline-${index}`,
    label: pickString(row, "label", "title", "name") ?? "Deadline",
    priority: humanizeValue(pickString(row, "priority") ?? "normal"),
    status: humanizeValue(pickString(row, "status") ?? "pending"),
  };
}

export function mapRelatedValidationRow(
  row: SupabaseRecord,
  index: number,
): RelatedValidationItem {
  return {
    decision: pickString(row, "decision", "result", "outcome"),
    id: pickString(row, "id") ?? `validation-${index}`,
    label:
      pickString(row, "label", "title", "name", "validation_type") ??
      "Validation",
    ownerName: pickString(
      row,
      "assigned_user_name",
      "validator_name",
      "owner_name",
    ),
    status: humanizeValue(pickString(row, "status") ?? "pending"),
    updatedAt: pickString(row, "updated_at", "created_at"),
  };
}

export function mapRelatedDocumentRow(
  row: SupabaseRecord,
  index: number,
): RelatedDocumentItem {
  return {
    id: pickString(row, "id") ?? `document-${index}`,
    name: pickString(row, "name", "title", "file_name") ?? "Document",
    status: pickString(row, "status"),
    type: humanizeValue(
      pickString(row, "document_type", "type", "mime_type") ?? "document",
    ),
    updatedAt: pickString(row, "updated_at", "created_at"),
    url: pickString(row, "url", "file_url", "public_url", "storage_path"),
  };
}

export function mapRelatedEmailRow(
  row: SupabaseRecord,
  index: number,
): RelatedEmailItem {
  const fromName = pickString(row, "from_name", "sender_name", "sender");
  const fromEmail = pickString(row, "from_email", "sender_email", "email");

  return {
    from: [fromName, fromEmail].filter(Boolean).join(" · ") || "Expéditeur inconnu",
    id: pickString(row, "id") ?? `email-${index}`,
    preview: pickString(row, "preview_text", "snippet", "summary", "ai_summary"),
    receivedAt: pickString(row, "received_at", "created_at", "updated_at"),
    status: humanizeValue(pickString(row, "processing_status", "status") ?? "new"),
    subject: pickString(row, "subject", "title", "label") ?? "Email sans objet",
  };
}

export function buildRequestActivityHistory(input: {
  deadlines: RelatedDeadlineItem[];
  documents: RelatedDocumentItem[];
  emails: SupabaseRecord[];
  request: RequestDetailItem;
  tasks: RelatedTaskItem[];
  validations: RelatedValidationItem[];
}): RequestActivityItem[] {
  const taskEvents: RequestActivityItem[] = input.tasks
    .filter(
      (task): task is RelatedTaskItem & { createdAt: string } =>
        typeof task.createdAt === "string",
    )
    .map((task) => ({
      category: "task",
      date: task.createdAt,
      description: `${task.status} · ${task.assigneeName}`,
      id: `task-${task.id}`,
      title: task.title,
    }));
  const deadlineEvents: RequestActivityItem[] = input.deadlines
    .filter(
      (deadline): deadline is RelatedDeadlineItem & { deadlineAt: string } =>
        typeof deadline.deadlineAt === "string",
    )
    .map((deadline) => ({
      category: "deadline",
      date: deadline.deadlineAt,
      description: `${deadline.status} · ${deadline.priority}`,
      id: `deadline-${deadline.id}`,
      title: deadline.label,
    }));
  const validationEvents: RequestActivityItem[] = input.validations
    .filter(
      (
        validation,
      ): validation is RelatedValidationItem & { updatedAt: string } =>
        typeof validation.updatedAt === "string",
    )
    .map((validation) => ({
      category: "validation",
      date: validation.updatedAt,
      description:
        validation.decision ?? validation.ownerName ?? "Validation liée",
      id: `validation-${validation.id}`,
      title: validation.label,
    }));
  const documentEvents: RequestActivityItem[] = input.documents
    .filter(
      (document): document is RelatedDocumentItem & { updatedAt: string } =>
        typeof document.updatedAt === "string",
    )
    .map((document) => ({
      category: "document",
      date: document.updatedAt,
      description: document.type,
      id: `document-${document.id}`,
      title: document.name,
    }));
  const emailEvents = input.emails.reduce<RequestActivityItem[]>(
    (events, email, index) => {
      const date = pickString(email, "received_at", "created_at", "updated_at");

      if (!date) {
        return events;
      }

      events.push({
        category: "email" as const,
        date,
        description: pickString(email, "from_email", "sender", "from_name"),
        id: pickString(email, "id") ?? `email-${index}`,
        title:
          pickString(email, "subject", "title", "label") ?? "Email associé",
      });

      return events;
    },
    [],
  );

  const events: RequestActivityItem[] = [
    {
      category: "request",
      date: input.request.createdAt,
      description: input.request.requestTypeLabel,
      id: `${input.request.id}-created`,
      title: "Demande créée",
    },
    {
      category: "request",
      date: input.request.updatedAt,
      description: `Statut ${input.request.rawStatus}`,
      id: `${input.request.id}-updated`,
      title: "Dernière mise à jour du dossier",
    },
    ...taskEvents,
    ...deadlineEvents,
    ...validationEvents,
    ...documentEvents,
    ...emailEvents,
  ];

  return events.sort(
    (left, right) =>
      new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export function detectRequestNoteField(requestRow: SupabaseRecord | null) {
  if (!requestRow) {
    return null;
  }

  return (
    REQUEST_NOTE_FIELDS.find((field) =>
      Object.prototype.hasOwnProperty.call(requestRow, field),
    ) ?? null
  );
}

export function pickString(
  row: SupabaseRecord | null,
  ...keys: string[]
): string | null {
  if (!row) {
    return null;
  }

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function buildRequestSummary(
  generatedSummary: string,
  persistedNote: string | null,
) {
  if (persistedNote) {
    return persistedNote;
  }

  return generatedSummary;
}

function humanizeValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
