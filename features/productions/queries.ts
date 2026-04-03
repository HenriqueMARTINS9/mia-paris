import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { getDocumentsByRelatedIds } from "@/features/documents/queries";
import { getRequestLinkOptions } from "@/features/requests/queries";
import {
  buildProductionDetailItem,
  buildProductionHistory,
  getProductionRelatedIds,
  mapProductionLinkedDeadlineItem,
  mapProductionLinkedDocumentItem,
  mapProductionLinkedRequestItem,
  mapProductionLinkedTaskItem,
  mapProductionRecordToListItem,
} from "@/features/productions/mappers";
import type {
  ProductionDetailItem,
  ProductionFormOptions,
  ProductionsPageData,
} from "@/features/productions/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { compactIdentifier, readString, uniqueStrings } from "@/lib/record-helpers";
import type {
  ActivityLogRecord,
  ClientRecord,
  DeadlineRecord,
  ModelRecord,
  OrderRecord,
  ProductionRecord,
  RequestOverview,
  TaskRecord,
} from "@/types/crm";

const getProductionsPageDataInternal = async (): Promise<ProductionsPageData> => {
  noStore();

  const emptyOptions: ProductionFormOptions = {
    clients: [],
    models: [],
    orders: [],
    requests: [],
  };

  if (!hasSupabaseEnv) {
    return {
      detailsById: {},
      formOptions: emptyOptions,
      formOptionsError: null,
      productions: [],
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        detailsById: {},
        formOptions: emptyOptions,
        formOptionsError: null,
        productions: [],
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux productions.",
      };
    }

    const [productionsResult, formOptionsResult] = await Promise.all([
      supabaseRestSelectList<ProductionRecord>("productions", {
        select: "*",
      }),
      getProductionFormOptions(),
    ]);

    if (productionsResult.error) {
      return {
        detailsById: {},
        formOptions: formOptionsResult.options,
        formOptionsError: formOptionsResult.error,
        productions: [],
        error: `Impossible de charger les productions: ${productionsResult.error}`,
      };
    }

    const productionRows = productionsResult.data ?? [];
    const relatedIds = productionRows.map(getProductionRelatedIds);
    const orderIds = uniqueStrings(relatedIds.map((item) => item.orderId));
    const modelIds = uniqueStrings(relatedIds.map((item) => item.modelId));
    const clientIds = uniqueStrings(relatedIds.map((item) => item.clientId));
    const requestIds = uniqueStrings(relatedIds.map((item) => item.requestId));

    const [
      orders,
      models,
      clients,
      requests,
      tasks,
      deadlines,
      documents,
      activityLogs,
    ] = await Promise.all([
      getOrdersByIds(orderIds),
      getModelsByIds(modelIds),
      getClientsByIds(clientIds),
      getRequestsByIds(requestIds),
      getTasksByRequestIds(requestIds),
      getDeadlinesByRequestIds(requestIds),
      getDocumentsByRelatedIds({
        modelIds,
        orderIds,
        productionIds: productionRows.map((production) => production.id),
        requestIds,
      }),
      getActivityLogs({
        productionIds: productionRows.map((production) => production.id),
        requestIds,
      }),
    ]);

    const ordersById = new Map(orders.map((order) => [order.id, order] as const));
    const modelsById = new Map(models.map((model) => [model.id, model] as const));
    const clientsById = new Map(clients.map((client) => [client.id, client] as const));
    const requestsById = new Map(requests.map((request) => [request.id, request] as const));

    const productions = productionRows
      .map((productionRecord) =>
        mapProductionRecordToListItem({
          clientRecordsById: clientsById,
          modelRecordsById: modelsById,
          orderRecordsById: ordersById,
          productionRecord,
          requestRowsById: requestsById,
        }),
      )
      .sort(sortProductions);

    const tasksByRequestId = groupByForeignKey(tasks, ["request_id"]);
    const deadlinesByRequestId = groupByForeignKey(deadlines, ["request_id"]);
    const documentsByProductionId = groupByForeignKey(documents, ["production_id"]);
    const documentsByOrderId = groupByForeignKey(documents, ["order_id"]);
    const documentsByRequestId = groupByForeignKey(documents, ["request_id"]);
    const documentsByModelId = groupByForeignKey(documents, ["model_id"]);
    const logsByEntityId = groupByForeignKey(activityLogs, ["entity_id"]);
    const logsByRequestId = groupByForeignKey(activityLogs, ["request_id"]);

    const detailsById = Object.fromEntries(
      productions.map((production) => {
        const linkedRequestIds = uniqueStrings([
          production.requestId,
          readString(ordersById.get(production.orderId ?? ""), ["request_id", "requestId"]),
        ]);
        const linkedRequests = linkedRequestIds
          .map((requestId) => requestsById.get(requestId))
          .filter((request): request is RequestOverview => Boolean(request))
          .map(mapProductionLinkedRequestItem);
        const linkedTasks = linkedRequestIds
          .flatMap((requestId) => tasksByRequestId.get(requestId) ?? [])
          .map(mapProductionLinkedTaskItem);
        const linkedDeadlines = linkedRequestIds
          .flatMap((requestId) => deadlinesByRequestId.get(requestId) ?? [])
          .map(mapProductionLinkedDeadlineItem);
        const linkedDocuments = dedupeById(
          [
            ...(documentsByProductionId.get(production.id) ?? []),
            ...(production.orderId ? documentsByOrderId.get(production.orderId) ?? [] : []),
            ...(production.requestId
              ? documentsByRequestId.get(production.requestId) ?? []
              : []),
            ...(production.modelId ? documentsByModelId.get(production.modelId) ?? [] : []),
          ].map(mapProductionLinkedDocumentItem),
        );
        const linkedLogs = dedupeById([
          ...(logsByEntityId.get(production.id) ?? []),
          ...linkedRequestIds.flatMap((requestId) => logsByRequestId.get(requestId) ?? []),
        ]);
        const history = buildProductionHistory({
          deadlines: linkedDeadlines,
          documents: linkedDocuments,
          logs: linkedLogs,
          production,
          requests: linkedRequests,
          tasks: linkedTasks,
        });

        const detail: ProductionDetailItem = buildProductionDetailItem({
          deadlines: linkedDeadlines,
          documents: linkedDocuments,
          history,
          production,
          requests: linkedRequests,
          tasks: linkedTasks,
        });

        return [production.id, detail] as const;
      }),
    );

    return {
      detailsById,
      formOptions: formOptionsResult.options,
      formOptionsError: formOptionsResult.error,
      productions,
      error: null,
    };
  } catch (error) {
    return {
      detailsById: {},
      formOptions: emptyOptions,
      formOptionsError: null,
      productions: [],
      error:
        error instanceof Error
          ? `Impossible de charger les productions: ${error.message}`
          : "Impossible de charger les productions.",
    };
  }
};

export const getProductionsPageData = cache(getProductionsPageDataInternal);

const getProductionFormOptionsInternal = async (limit = 120): Promise<{
  error: string | null;
  options: ProductionFormOptions;
}> => {
  const [requestsResult, clientsResult, modelsResult, ordersResult] =
    await Promise.all([
      getRequestLinkOptions(limit),
      supabaseRestSelectList<ClientRecord>("clients", {
        order: "name.asc.nullslast",
        select: "*",
      }),
      supabaseRestSelectList<ModelRecord>("models", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
      supabaseRestSelectList<OrderRecord>("orders", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
    ]);

  const clientsById = new Map(
    (clientsResult.data ?? []).map((client) => [
      client.id,
      readString(client, ["name", "client_name", "account_name"]) ?? client.id,
    ]),
  );
  const modelsById = new Map((modelsResult.data ?? []).map((model) => [model.id, model] as const));

  const options: ProductionFormOptions = {
    clients: (clientsResult.data ?? []).slice(0, limit).map((client) => ({
      id: client.id,
      label: readString(client, ["name", "client_name", "account_name"]) ?? client.id,
      secondary: readString(client, ["code", "client_code"]),
      clientId: client.id,
    })),
    models: (modelsResult.data ?? []).slice(0, limit).map((model) => ({
      id: model.id,
      label:
        readString(model, ["name", "label", "reference", "internal_ref"]) ??
        compactIdentifier(model.id) ??
        "Modele",
      secondary: [
        clientsById.get(readString(model, ["client_id", "clientId"]) ?? ""),
        readString(model, ["reference", "internal_ref", "client_ref"]),
      ]
        .filter(Boolean)
        .join(" · ") || null,
      clientId: readString(model, ["client_id", "clientId"]),
      modelId: model.id,
    })),
    orders: (ordersResult.data ?? []).slice(0, limit).map((order) => {
      const clientId = readString(order, ["client_id", "clientId"]);
      const modelId = readString(order, ["model_id", "modelId"]);
      const model = modelId ? modelsById.get(modelId) ?? null : null;

      return {
        id: order.id,
        label:
          readString(order, ["order_number", "number", "reference", "po_number"]) ??
          compactIdentifier(order.id) ??
          "Commande",
        secondary:
          [
            clientId ? clientsById.get(clientId) : null,
            readString(model, ["name", "reference", "internal_ref"]),
          ]
            .filter(Boolean)
            .join(" · ") || null,
        clientId,
        modelId,
        orderId: order.id,
        requestId: readString(order, ["request_id", "requestId"]),
      };
    }),
    requests: requestsResult.options.map((request) => ({
      id: request.id,
      label: request.label,
      secondary: request.clientName,
      requestId: request.id,
    })),
  };

  const errors = [
    requestsResult.error ? "demandes" : null,
    getOptionalError("clients", clientsResult.error, clientsResult.rawError),
    getOptionalError("models", modelsResult.error, modelsResult.rawError),
    getOptionalError("orders", ordersResult.error, ordersResult.rawError),
  ].filter((value): value is string => Boolean(value));

  return {
    error:
      errors.length > 0
        ? `Certaines options de production sont indisponibles: ${errors.join(", ")}.`
        : null,
    options,
  };
};

export const getProductionFormOptions = cache(getProductionFormOptionsInternal);

async function getOrdersByIds(orderIds: string[]) {
  if (orderIds.length === 0) {
    return [] as OrderRecord[];
  }

  const result = await supabaseRestSelectList<OrderRecord>("orders", {
    id: buildInFilter(orderIds),
    select: "*",
  });

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as OrderRecord[];
  }

  return result.data ?? [];
}

async function getModelsByIds(modelIds: string[]) {
  if (modelIds.length === 0) {
    return [] as ModelRecord[];
  }

  const result = await supabaseRestSelectList<ModelRecord>("models", {
    id: buildInFilter(modelIds),
    select: "*",
  });

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as ModelRecord[];
  }

  return result.data ?? [];
}

async function getClientsByIds(clientIds: string[]) {
  if (clientIds.length === 0) {
    return [] as ClientRecord[];
  }

  const result = await supabaseRestSelectList<ClientRecord>("clients", {
    id: buildInFilter(clientIds),
    select: "*",
  });

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as ClientRecord[];
  }

  return result.data ?? [];
}

async function getRequestsByIds(requestIds: string[]) {
  if (requestIds.length === 0) {
    return [] as RequestOverview[];
  }

  const result = await supabaseRestSelectList<RequestOverview>("v_requests_overview", {
    id: buildInFilter(requestIds),
    select: "*",
  });

  if (result.error) {
    return [] as RequestOverview[];
  }

  return result.data ?? [];
}

async function getTasksByRequestIds(requestIds: string[]) {
  if (requestIds.length === 0) {
    return [] as TaskRecord[];
  }

  const result = await supabaseRestSelectList<TaskRecord>("tasks", {
    request_id: buildInFilter(requestIds),
    select: "*",
  });

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as TaskRecord[];
  }

  return result.data ?? [];
}

async function getDeadlinesByRequestIds(requestIds: string[]) {
  if (requestIds.length === 0) {
    return [] as DeadlineRecord[];
  }

  const result = await supabaseRestSelectList<DeadlineRecord>("deadlines", {
    request_id: buildInFilter(requestIds),
    select: "*",
  });

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as DeadlineRecord[];
  }

  return result.data ?? [];
}

async function getActivityLogs(input: {
  productionIds: string[];
  requestIds: string[];
}) {
  const logQueries: Array<Promise<Awaited<ReturnType<typeof supabaseRestSelectList<ActivityLogRecord>>>>> =
    [];

  if (input.productionIds.length > 0) {
    logQueries.push(
      supabaseRestSelectList<ActivityLogRecord>("activity_logs", {
        entity_id: buildInFilter(input.productionIds),
        select: "*",
      }),
    );
  }

  if (input.requestIds.length > 0) {
    logQueries.push(
      supabaseRestSelectList<ActivityLogRecord>("activity_logs", {
        request_id: buildInFilter(input.requestIds),
        select: "*",
      }),
    );
  }

  const results = await Promise.all(logQueries);

  const logsById = new Map<string, ActivityLogRecord>();

  for (const result of results) {
    if (result?.error && !isMissingSupabaseResourceError(result.rawError)) {
      continue;
    }

    for (const log of result?.data ?? []) {
      logsById.set(log.id, log);
    }
  }

  return Array.from(logsById.values());
}

function buildInFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

function sortProductions(
  a: { isBlocked: boolean; plannedEndAt: string | null; risk: string },
  b: { isBlocked: boolean; plannedEndAt: string | null; risk: string },
) {
  if (a.isBlocked !== b.isBlocked) {
    return a.isBlocked ? -1 : 1;
  }

  const riskScore = (value: string) => {
    if (value === "critical") {
      return 4;
    }

    if (value === "high") {
      return 3;
    }

    if (value === "normal") {
      return 2;
    }

    return 1;
  };

  if (riskScore(a.risk) !== riskScore(b.risk)) {
    return riskScore(b.risk) - riskScore(a.risk);
  }

  const aTime = a.plannedEndAt ? new Date(a.plannedEndAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.plannedEndAt ? new Date(b.plannedEndAt).getTime() : Number.MAX_SAFE_INTEGER;

  return aTime - bTime;
}

function groupByForeignKey<T extends Record<string, unknown>>(
  rows: T[],
  keys: string[],
) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = readString(row, keys);

    if (!key) {
      continue;
    }

    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
  }

  return map;
}

function dedupeById<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function getOptionalError(
  label: string,
  error: string | null,
  rawError: unknown,
) {
  if (!error) {
    return null;
  }

  if (
    typeof rawError === "object" &&
    rawError !== null &&
    isMissingSupabaseResourceError(rawError as never)
  ) {
    return null;
  }

  return label;
}
