import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import {
  getProductionRelatedIds,
  mapProductionRecordToListItem,
} from "@/features/productions/mappers";
import type { ProductionsPageData } from "@/features/productions/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type {
  ClientRecord,
  ModelRecord,
  OrderRecord,
  ProductionRecord,
  RequestOverview,
} from "@/types/crm";
import { uniqueStrings } from "@/lib/record-helpers";

export async function getProductionsPageData(): Promise<ProductionsPageData> {
  noStore();

  if (!hasSupabaseEnv) {
    return {
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
        productions: [],
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux productions.",
      };
    }

    const productionsResult = await supabaseRestSelectList<ProductionRecord>(
      "productions",
      {
        select: "*",
      },
    );

    if (productionsResult.error) {
      return {
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

    const [orders, models, clients, requests] = await Promise.all([
      getOrdersByIds(orderIds),
      getModelsByIds(modelIds),
      getClientsByIds(clientIds),
      getRequestsByIds(requestIds),
    ]);

    const productions = productionRows
      .map((productionRecord) =>
        mapProductionRecordToListItem({
          clientRecordsById: new Map(clients.map((client) => [client.id, client])),
          modelRecordsById: new Map(models.map((model) => [model.id, model])),
          orderRecordsById: new Map(orders.map((order) => [order.id, order])),
          productionRecord,
          requestRowsById: new Map(
            requests.map((request) => [request.id, request] as const),
          ),
        }),
      )
      .sort(sortProductions);

    return {
      productions,
      error: null,
    };
  } catch (error) {
    return {
      productions: [],
      error:
        error instanceof Error
          ? `Impossible de charger les productions: ${error.message}`
          : "Impossible de charger les productions.",
    };
  }
}

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

  const result = await supabaseRestSelectList<RequestOverview>(
    "v_requests_overview",
    {
      id: buildInFilter(requestIds),
      select: "*",
    },
  );

  if (result.error) {
    return [] as RequestOverview[];
  }

  return result.data ?? [];
}

function buildInFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

function sortProductions(a: { isBlocked: boolean; risk: string; plannedEndAt: string | null }, b: { isBlocked: boolean; risk: string; plannedEndAt: string | null }) {
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
