import type {
  ProductionRecord,
  OrderRecord,
  ClientRecord,
  ModelRecord,
  RequestOverview,
} from "@/types/crm";
import {
  compactIdentifier,
  readString,
  type UnknownRecord,
} from "@/lib/record-helpers";
import {
  formatProductionModeLabel,
  mapRawProductionRiskToUiRisk,
  mapRawProductionStatusToUiStatus,
} from "@/features/productions/metadata";
import type { ProductionListItem } from "@/features/productions/types";

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
