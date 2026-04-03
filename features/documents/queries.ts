import "server-only";

import { cache } from "react";

import { getRequestLinkOptions } from "@/features/requests/queries";
import type {
  DocumentFormOptions,
} from "@/features/documents/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import {
  compactIdentifier,
  readString,
  uniqueStrings,
} from "@/lib/record-helpers";
import type {
  ClientRecord,
  DocumentRecord,
  ModelRecord,
  OrderRecord,
  ProductionRecord,
} from "@/types/crm";

const getDocumentFormOptionsInternal = async (limit = 120): Promise<{
  error: string | null;
  options: DocumentFormOptions;
}> => {
  const [requestsResult, modelsResult, ordersResult, productionsResult] =
    await Promise.all([
      getRequestLinkOptions(limit),
      supabaseRestSelectList<ModelRecord>("models", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
      supabaseRestSelectList<OrderRecord>("orders", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
      supabaseRestSelectList<ProductionRecord>("productions", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
    ]);

  const clientIds = uniqueStrings([
    ...(modelsResult.data ?? []).map((model) =>
      readString(model, ["client_id", "clientId"]),
    ),
    ...(ordersResult.data ?? []).map((order) =>
      readString(order, ["client_id", "clientId"]),
    ),
    ...(productionsResult.data ?? []).map((production) =>
      readString(production, ["client_id", "clientId"]),
    ),
  ]);

  const clientsResult =
    clientIds.length > 0
      ? await supabaseRestSelectList<ClientRecord>("clients", {
          id: buildInFilter(clientIds),
          select: "*",
        })
      : null;

  const clientMap = new Map(
    (clientsResult?.data ?? []).map((client) => [
      client.id,
      readString(client, ["name", "client_name", "account_name"]) ?? client.id,
    ]),
  );

  const modelMap = new Map(
    (modelsResult.data ?? []).map((model) => [model.id, model] as const),
  );
  const orderMap = new Map(
    (ordersResult.data ?? []).map((order) => [order.id, order] as const),
  );

  const options: DocumentFormOptions = {
    models: (modelsResult.data ?? []).slice(0, limit).map((model) => ({
      id: model.id,
      label:
        readString(model, ["name", "label", "reference", "internal_ref"]) ??
        compactIdentifier(model.id) ??
        "Modele",
      secondary: [
        clientMap.get(readString(model, ["client_id", "clientId"]) ?? ""),
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

      return {
        id: order.id,
        label:
          readString(order, ["order_number", "number", "reference", "po_number"]) ??
          compactIdentifier(order.id) ??
          "Commande",
        secondary:
          [
            clientId ? clientMap.get(clientId) : null,
            modelId
              ? readString(modelMap.get(modelId), ["name", "reference", "internal_ref"])
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        clientId,
        modelId,
        orderId: order.id,
        requestId: readString(order, ["request_id", "requestId"]),
      };
    }),
    productions: (productionsResult.data ?? []).slice(0, limit).map((production) => {
      const clientId = readString(production, ["client_id", "clientId"]);
      const modelId =
        readString(production, ["model_id", "modelId"]) ??
        readString(orderMap.get(readString(production, ["order_id", "orderId"]) ?? ""), [
          "model_id",
          "modelId",
        ]);
      const orderId = readString(production, ["order_id", "orderId"]);

      return {
        id: production.id,
        label:
          readString(production, ["order_number", "reference"]) ??
          readString(orderMap.get(orderId ?? ""), [
            "order_number",
            "number",
            "reference",
          ]) ??
          compactIdentifier(production.id) ??
          "Production",
        secondary:
          [
            clientId ? clientMap.get(clientId) : null,
            modelId
              ? readString(modelMap.get(modelId), ["name", "reference", "internal_ref"])
              : null,
            readString(production, ["status", "production_status"]),
          ]
            .filter(Boolean)
            .join(" · ") || null,
        clientId,
        modelId,
        orderId,
        productionId: production.id,
        requestId:
          readString(production, ["request_id", "requestId"]) ??
          readString(orderMap.get(orderId ?? ""), ["request_id", "requestId"]),
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
    getOptionalResourceError("models", modelsResult.error, modelsResult.rawError),
    getOptionalResourceError("orders", ordersResult.error, ordersResult.rawError),
    getOptionalResourceError(
      "productions",
      productionsResult.error,
      productionsResult.rawError,
    ),
    clientsResult
      ? getOptionalResourceError("clients", clientsResult.error, clientsResult.rawError)
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    error:
      errors.length > 0
        ? `Certaines options documentaires sont indisponibles: ${errors.join(", ")}.`
        : null,
    options: {
      models: options.models,
      orders: options.orders,
      productions: options.productions,
      requests: options.requests,
    },
  };
};

export const getDocumentFormOptions = cache(getDocumentFormOptionsInternal);

export async function getDocumentsByRelatedIds(input: {
  modelIds?: string[];
  orderIds?: string[];
  productionIds?: string[];
  requestIds?: string[];
}) {
  const querySets = [
    { column: "request_id", ids: input.requestIds ?? [] },
    { column: "production_id", ids: input.productionIds ?? [] },
    { column: "order_id", ids: input.orderIds ?? [] },
    { column: "model_id", ids: input.modelIds ?? [] },
  ].filter((item) => item.ids.length > 0);

  if (querySets.length === 0) {
    return [] as DocumentRecord[];
  }

  const results = await Promise.all(
    querySets.map(({ column, ids }) =>
      supabaseRestSelectList<DocumentRecord>("documents", {
        [column]: buildInFilter(ids),
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
    ),
  );

  const documentsById = new Map<string, DocumentRecord>();

  for (const result of results) {
    if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
      continue;
    }

    for (const row of result.data ?? []) {
      documentsById.set(row.id, row);
    }
  }

  return Array.from(documentsById.values());
}

function buildInFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

function getOptionalResourceError(
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
