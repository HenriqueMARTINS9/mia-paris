"use server";

import { revalidatePath } from "next/cache";

import { insertActivityLogViaRest } from "@/lib/activity-logs";
import { authorizeServerAction } from "@/features/auth/server-authorization";
import { notifyBlockedProduction } from "@/features/notifications/lib/operational-notifications";
import {
  mapUiProductionRiskToDatabaseValues,
  mapUiProductionStatusToDatabaseValues,
} from "@/features/productions/metadata";
import type {
  ProductionMutationResult,
  ProductionRisk,
  ProductionStatus,
} from "@/features/productions/types";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  supabaseRestSelectMaybeSingle,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";
import { readString } from "@/lib/record-helpers";
import type { OrderRecord, RequestRecord } from "@/types/crm";

interface CreateProductionInput {
  blockingReason: string | null;
  clientId: string | null;
  modelId: string | null;
  newOrderNumber: string | null;
  notes: string | null;
  orderId: string | null;
  plannedEndAt: string | null;
  plannedStartAt: string | null;
  productionMode: string | null;
  requestId: string | null;
  risk: ProductionRisk;
  status: ProductionStatus;
}

export async function createProductionAction(
  input: CreateProductionInput,
): Promise<ProductionMutationResult> {
  const authorization = await authorizeServerAction("productions.create");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "create",
      message: authorization.message,
    };
  }

  if (
    !input.orderId &&
    !input.newOrderNumber?.trim() &&
    !input.requestId &&
    !input.clientId &&
    !input.modelId
  ) {
    return {
      ok: false,
      field: "create",
      message:
        "Renseigne au moins une demande, un client, un modèle ou un numéro de commande.",
    };
  }

  const requestResult = input.requestId
    ? await supabaseRestSelectMaybeSingle<RequestRecord>("requests", {
        id: `eq.${input.requestId}`,
        select: "*",
      })
    : null;

  const existingOrderResult = input.orderId
    ? await supabaseRestSelectMaybeSingle<OrderRecord>("orders", {
        id: `eq.${input.orderId}`,
        select: "*",
      })
    : null;

  const resolvedRequestId = input.requestId ?? null;
  const resolvedModelId =
    input.modelId ??
    readString(existingOrderResult?.data ?? null, ["model_id", "modelId"]) ??
    readString(requestResult?.data ?? null, ["model_id", "modelId"]) ??
    null;
  const resolvedClientId =
    input.clientId ??
    readString(existingOrderResult?.data ?? null, ["client_id", "clientId"]) ??
    readString(requestResult?.data ?? null, ["client_id"]) ??
    null;

  let orderId = input.orderId ?? null;

  if (!orderId && input.newOrderNumber?.trim()) {
    const orderInsertResult = await insertWithMissingColumnFallback("orders", {
      client_id: resolvedClientId,
      created_at: new Date().toISOString(),
      model_id: resolvedModelId,
      order_number: input.newOrderNumber.trim(),
      request_id: resolvedRequestId,
      status: "open",
      updated_at: new Date().toISOString(),
    });

    if (orderInsertResult.error) {
      return {
        ok: false,
        field: "create",
        message: `Création de commande impossible: ${orderInsertResult.error}`,
      };
    }

    orderId = readString(orderInsertResult.data?.[0] ?? null, ["id"]);
  }

  const productionInsertResult = await insertWithPayloadVariants(
    buildProductionPayloadVariants({
      blockingReason: input.blockingReason,
      clientId: resolvedClientId,
      modelId: resolvedModelId,
      notes: input.notes,
      orderId,
      plannedEndAt: input.plannedEndAt,
      plannedStartAt: input.plannedStartAt,
      productionMode: input.productionMode,
      requestId: resolvedRequestId,
      risk: input.risk,
      status: input.status,
    }),
  );

  if (productionInsertResult.error) {
    return {
      ok: false,
      field: "create",
      message: `Création de production impossible: ${productionInsertResult.error}`,
    };
  }

  const productionId = readString(productionInsertResult.data?.[0] ?? null, ["id"]);

  await insertActivityLogViaRest({
    action: "production_created",
    actorId: authorization.currentUser.appUser?.id ?? null,
    actorType: "user",
    description: "Production créée manuellement depuis le cockpit.",
    entityId: productionId,
    entityType: "production",
    payload: {
      blockingReason: input.blockingReason,
      clientId: resolvedClientId,
      modelId: resolvedModelId,
      orderId,
      requestId: resolvedRequestId,
      risk: input.risk,
      status: input.status,
    },
    requestId: resolvedRequestId,
  });

  revalidatePath("/productions");
  revalidatePath("/aujourdhui");
  if (resolvedRequestId) {
    revalidatePath(`/requests/${resolvedRequestId}`);
  }
  revalidatePath("/", "layout");

  if (input.status === "blocked" || Boolean(input.blockingReason?.trim())) {
    await notifyBlockedProduction({
      blockingReason: input.blockingReason?.trim() ?? null,
      productionId,
      title: input.newOrderNumber?.trim() || "Production bloquée",
    });
  }

  return {
    ok: true,
    field: "create",
    message: "Production créée avec succès.",
  };
}

function buildProductionPayloadVariants(input: {
  blockingReason: string | null;
  clientId: string | null;
  modelId: string | null;
  notes: string | null;
  orderId: string | null;
  plannedEndAt: string | null;
  plannedStartAt: string | null;
  productionMode: string | null;
  requestId: string | null;
  risk: ProductionRisk;
  status: ProductionStatus;
}) {
  const shared = {
    blocking_reason: input.blockingReason?.trim() || null,
    client_id: input.clientId,
    created_at: new Date().toISOString(),
    model_id: input.modelId,
    notes: input.notes?.trim() || null,
    order_id: input.orderId,
    production_mode: input.productionMode?.trim() || null,
    request_id: input.requestId,
    risk_level: mapUiProductionRiskToDatabaseValues(input.risk)[0] ?? input.risk,
    status: mapUiProductionStatusToDatabaseValues(input.status)[0] ?? input.status,
    updated_at: new Date().toISOString(),
  } satisfies Record<string, unknown>;

  const startValue = toIsoDate(input.plannedStartAt);
  const endValue = toIsoDate(input.plannedEndAt);

  return [
    {
      ...shared,
      planned_end_at: endValue,
      planned_start_at: startValue,
    },
    {
      ...shared,
      planned_end_date: endValue,
      planned_start_date: startValue,
    },
    {
      ...shared,
      end_at: endValue,
      start_at: startValue,
    },
    {
      ...shared,
      production_end_at: endValue,
      production_start_at: startValue,
    },
  ];
}

async function insertWithPayloadVariants(
  payloads: Array<Record<string, unknown>>,
) {
  let latestResult: Awaited<ReturnType<typeof insertWithMissingColumnFallback>> | null =
    null;

  for (const payload of payloads) {
    const result = await insertWithMissingColumnFallback("productions", payload);
    latestResult = result;

    if (!result.error) {
      return result;
    }
  }

  return (
    latestResult ?? {
      data: null,
      error: "Insertion impossible sur productions.",
      rawError: null,
      status: 500,
    }
  );
}

async function insertWithMissingColumnFallback(
  resource: string,
  payload: Record<string, unknown>,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      {
        select: "id,request_id",
      },
    );

    if (!result.error) {
      return result;
    }

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.rawError);

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function extractMissingColumnName(error: SupabaseRestErrorPayload | null) {
  if (!error) {
    return null;
  }

  const haystack = [error.message, error.details, error.error, error.hint]
    .filter(Boolean)
    .join(" ");
  const match = haystack.match(/column ["']?([a-zA-Z0-9_]+)["']?/i);

  return match?.[1] ?? null;
}

function toIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T09:00:00`).toISOString();
}
