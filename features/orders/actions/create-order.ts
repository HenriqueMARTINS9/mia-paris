"use server";

import { revalidatePath } from "next/cache";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import type { OrderMutationResult } from "@/features/orders/types";
import { insertActivityLogViaRest } from "@/lib/activity-logs";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";

interface CreateOrderInput {
  clientId: string | null;
  modelId: string | null;
  orderNumber: string;
  requestId: string | null;
  status: string;
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<OrderMutationResult> {
  const authorization = await authorizeServerAction("orders.create");

  if (!authorization.ok) {
    return {
      message: authorization.message,
      ok: false,
      orderId: null,
    };
  }

  if (input.orderNumber.trim().length < 3) {
    return {
      message: "Renseigne un numéro de commande exploitable.",
      ok: false,
      orderId: null,
    };
  }

  const payload: Record<string, unknown> = {
    client_id: input.clientId,
    model_id: input.modelId,
    order_number: input.orderNumber.trim(),
    request_id: input.requestId,
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  const result = await insertWithMissingColumnFallback("orders", payload);

  if (result.error || !result.data || result.data.length === 0) {
    return {
      message: `Création de commande impossible: ${result.error ?? "aucune ligne insérée."}`,
      ok: false,
      orderId: null,
    };
  }

  const orderId =
    typeof result.data[0]?.id === "string" ? result.data[0].id : null;

  await insertActivityLogViaRest({
    action: "order_created_manually",
    actorId: authorization.actorId,
    actorType: "user",
    description: "Commande créée manuellement depuis le cockpit.",
    entityId: orderId,
    entityType: "order",
    payload,
    requestId: input.requestId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/productions");
  revalidatePath("/", "layout");

  return {
    message: "Commande créée avec succès.",
    ok: true,
    orderId,
  };
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
        select: "id",
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
