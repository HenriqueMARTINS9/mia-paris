import type {
  ProductionRecord,
  OrderRecord,
  ClientRecord,
  DocumentRecord,
  ModelRecord,
  RequestOverview,
  ActivityLogRecord,
  DeadlineRecord,
  TaskRecord,
} from "@/types/crm";
import {
  compactIdentifier,
  readString,
  type UnknownRecord,
  titleCaseFromSnake,
} from "@/lib/record-helpers";
import {
  formatProductionModeLabel,
  mapRawProductionRiskToUiRisk,
  mapRawProductionStatusToUiStatus,
} from "@/features/productions/metadata";
import type {
  ProductionActivityItem,
  ProductionDetailItem,
  ProductionLinkedDeadlineItem,
  ProductionLinkedDocumentItem,
  ProductionLinkedRequestItem,
  ProductionLinkedTaskItem,
  ProductionListItem,
} from "@/features/productions/types";

interface MapProductionRecordArgs {
  clientRecordsById: Map<string, ClientRecord>;
  modelRecordsById: Map<string, ModelRecord>;
  orderRecordsById: Map<string, OrderRecord>;
  productionRecord: ProductionRecord;
  requestRowsById: Map<string, RequestOverview>;
}

export function mapProductionRecordToListItem({
  clientRecordsById,
  modelRecordsById,
  orderRecordsById,
  productionRecord,
  requestRowsById,
}: Readonly<MapProductionRecordArgs>): ProductionListItem {
  const orderId = readString(productionRecord, ["order_id", "orderId"]);
  const orderRecord = orderId ? orderRecordsById.get(orderId) ?? null : null;

  const modelId =
    readString(productionRecord, ["model_id", "modelId"]) ??
    readString(orderRecord, ["model_id", "modelId"]);
  const modelRecord = modelId ? modelRecordsById.get(modelId) ?? null : null;

  const clientId =
    readString(productionRecord, ["client_id", "clientId"]) ??
    readString(orderRecord, ["client_id", "clientId"]) ??
    readString(modelRecord, ["client_id", "clientId"]);
  const clientRecord = clientId ? clientRecordsById.get(clientId) ?? null : null;

  const requestId =
    readString(productionRecord, ["request_id", "requestId"]) ??
    readString(orderRecord, ["request_id", "requestId"]);
  const requestRow = requestId ? requestRowsById.get(requestId) ?? null : null;

  const rawStatus =
    readString(productionRecord, ["status", "production_status"]) ??
    readString(orderRecord, ["status"]) ??
    "planned";
  const rawRisk =
    readString(productionRecord, [
      "risk_level",
      "risk",
      "risk_status",
      "severity",
    ]) ?? "normal";
  const blockingReason =
    readString(productionRecord, [
      "blocking_reason",
      "blocked_reason",
      "blocker_reason",
      "blocker",
      "issue",
    ]) ?? null;
  const productionMode =
    readString(productionRecord, [
      "production_mode",
      "mode",
      "manufacturing_mode",
      "production_type",
    ]) ?? null;
  const modelName =
    readString(productionRecord, ["model_name", "style_name", "reference"]) ??
    readString(modelRecord, ["name", "label", "reference", "style_name"]) ??
    "Modèle non renseigné";
  const clientName =
    readString(productionRecord, ["client_name", "brand_name"]) ??
    readString(clientRecord, ["name", "client_name", "account_name"]) ??
    requestRow?.client_name ??
    "Client non renseigné";
  const orderNumber =
    readString(productionRecord, [
      "order_number",
      "po_number",
      "production_number",
      "reference",
    ]) ??
    readString(orderRecord, ["order_number", "number", "reference", "po_number"]) ??
    compactIdentifier(orderId ?? productionRecord.id) ??
    "Sans commande";

  return {
    id: productionRecord.id,
    orderId,
    orderNumber,
    clientId,
    clientName,
    modelId,
    modelName,
    requestId,
    requestTitle: requestRow?.title ?? null,
    productionMode,
    productionModeLabel: formatProductionModeLabel(productionMode),
    status: mapRawProductionStatusToUiStatus(rawStatus),
    rawStatus,
    risk: mapRawProductionRiskToUiRisk(rawRisk),
    rawRisk,
    plannedStartAt: readString(productionRecord, [
      "planned_start_at",
      "planned_start_date",
      "start_at",
      "production_start_at",
      "start_date",
    ]),
    plannedEndAt: readString(productionRecord, [
      "planned_end_at",
      "planned_end_date",
      "end_at",
      "eta",
      "expected_end_at",
      "production_end_at",
      "end_date",
    ]),
    blockingReason,
    notes: readString(productionRecord, ["notes", "internal_notes"]),
    createdAt: readString(productionRecord, ["created_at"]),
    updatedAt: readString(productionRecord, ["updated_at"]),
    isBlocked:
      mapRawProductionStatusToUiStatus(rawStatus) === "blocked" ||
      Boolean(blockingReason),
  };
}

export function getProductionRelatedIds(
  productionRecord: ProductionRecord,
): {
  clientId: string | null;
  modelId: string | null;
  orderId: string | null;
  requestId: string | null;
} {
  return {
    clientId: readString(productionRecord, ["client_id", "clientId"]),
    modelId: readString(productionRecord, ["model_id", "modelId"]),
    orderId: readString(productionRecord, ["order_id", "orderId"]),
    requestId: readString(productionRecord, ["request_id", "requestId"]),
  };
}

export function getNestedForeignKey(
  record: UnknownRecord | null | undefined,
  keys: string[],
) {
  return readString(record, keys);
}

export function mapProductionLinkedRequestItem(request: RequestOverview): ProductionLinkedRequestItem {
  return {
    id: request.id,
    label: `${request.client_name ?? "Client"} · ${request.title}`,
    priority: request.priority,
    status: request.status,
  };
}

export function mapProductionLinkedTaskItem(row: TaskRecord): ProductionLinkedTaskItem {
  return {
    id: row.id,
    title: readString(row, ["title", "label", "name"]) ?? "Tâche",
    dueAt: readString(row, ["due_at", "deadline_at"]),
    ownerName: readString(row, ["assigned_user_name", "owner_name", "assignee_name"]),
    priority: readString(row, ["priority"]),
    status: readString(row, ["status"]),
  };
}

export function mapProductionLinkedDeadlineItem(
  row: DeadlineRecord,
): ProductionLinkedDeadlineItem {
  return {
    id: row.id,
    label: readString(row, ["label", "title", "name"]) ?? "Deadline",
    deadlineAt: readString(row, ["deadline_at", "due_at"]),
    priority: readString(row, ["priority"]),
    status: readString(row, ["status"]),
  };
}

export function mapProductionLinkedDocumentItem(
  row: DocumentRecord,
): ProductionLinkedDocumentItem {
  return {
    id: row.id,
    name: readString(row, ["title", "name", "file_name"]) ?? "Document",
    type:
      titleCaseFromSnake(
        readString(row, ["document_type", "type", "mime_type"]) ?? "document",
      ) ?? "Document",
    updatedAt: readString(row, ["updated_at", "created_at"]),
    url: readString(row, ["url", "file_url", "public_url", "storage_path"]),
  };
}

export function buildProductionHistory(input: {
  deadlines: ProductionLinkedDeadlineItem[];
  documents: ProductionLinkedDocumentItem[];
  logs: ActivityLogRecord[];
  production: ProductionListItem;
  requests: ProductionLinkedRequestItem[];
  tasks: ProductionLinkedTaskItem[];
}): ProductionActivityItem[] {
  const events: ProductionActivityItem[] = [];

  if (input.production.createdAt) {
    events.push({
      date: input.production.createdAt,
      description: input.production.productionModeLabel,
      id: `${input.production.id}-created`,
      title: "Production créée",
      type: "production",
    });
  }

  for (const request of input.requests) {
    events.push({
      date: input.production.updatedAt ?? input.production.createdAt ?? new Date().toISOString(),
      description: request.status,
      id: `request-${request.id}`,
      title: request.label,
      type: "request",
    });
  }

  for (const task of input.tasks) {
    if (!task.dueAt) {
      continue;
    }

    events.push({
      date: task.dueAt,
      description: [task.status, task.ownerName].filter(Boolean).join(" · ") || null,
      id: `task-${task.id}`,
      title: task.title,
      type: "task",
    });
  }

  for (const deadline of input.deadlines) {
    if (!deadline.deadlineAt) {
      continue;
    }

    events.push({
      date: deadline.deadlineAt,
      description: [deadline.status, deadline.priority].filter(Boolean).join(" · ") || null,
      id: `deadline-${deadline.id}`,
      title: deadline.label,
      type: "deadline",
    });
  }

  for (const document of input.documents) {
    if (!document.updatedAt) {
      continue;
    }

    events.push({
      date: document.updatedAt,
      description: document.type,
      id: `document-${document.id}`,
      title: document.name,
      type: "document",
    });
  }

  for (const log of input.logs) {
    const date = readString(log, ["created_at"]);

    if (!date) {
      continue;
    }

    events.push({
      date,
      description:
        readString(log, ["description", "action_type", "action"]) ??
        "Activité liée",
      id: `log-${log.id}`,
      title:
        titleCaseFromSnake(readString(log, ["action_type", "action"])) ?? "Activité",
      type: "log",
    });
  }

  return events.sort(
    (left, right) =>
      new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export function buildProductionDetailItem(input: {
  deadlines: ProductionLinkedDeadlineItem[];
  documents: ProductionLinkedDocumentItem[];
  history: ProductionActivityItem[];
  production: ProductionListItem;
  requests: ProductionLinkedRequestItem[];
  tasks: ProductionLinkedTaskItem[];
}): ProductionDetailItem {
  return {
    ...input.production,
    linkedDeadlines: input.deadlines,
    linkedDocuments: input.documents,
    linkedRequests: input.requests,
    linkedTasks: input.tasks,
    history: input.history,
  };
}
