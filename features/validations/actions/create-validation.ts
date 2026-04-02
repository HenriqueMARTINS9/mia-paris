"use server";

import { revalidatePath } from "next/cache";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import type { ValidationMutationResult } from "@/features/validations/types";
import { insertActivityLogViaRest } from "@/lib/activity-logs";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";

interface CreateValidationInput {
  modelId: string | null;
  notes: string | null;
  orderId: string | null;
  requestId: string | null;
  validationType: string;
  validatedByUserId: string | null;
}

export async function createValidationAction(
  input: CreateValidationInput,
): Promise<ValidationMutationResult> {
  const authorization = await authorizeServerAction("validations.create");

  if (!authorization.ok) {
    return {
      message: authorization.message,
      ok: false,
      validationId: null,
    };
  }

  if (input.validationType.trim().length < 2) {
    return {
      message: "Renseigne un type de validation exploitable.",
      ok: false,
      validationId: null,
    };
  }

  const payload: Record<string, unknown> = {
    model_id: input.modelId,
    notes: input.notes?.trim() || null,
    order_id: input.orderId,
    request_id: input.requestId,
    status: "pending",
    validation_type: input.validationType.trim(),
    validated_by_user_id: input.validatedByUserId,
    updated_at: new Date().toISOString(),
  };

  const result = await insertWithMissingColumnFallback("validations", payload);

  if (result.error || !result.data || result.data.length === 0) {
    return {
      message: `Création de validation impossible: ${result.error ?? "aucune ligne insérée."}`,
      ok: false,
      validationId: null,
    };
  }

  const validationId =
    typeof result.data[0]?.id === "string" ? result.data[0].id : null;

  await insertActivityLogViaRest({
    action: "validation_created_manually",
    actorId: authorization.actorId,
    actorType: "user",
    description: "Validation créée manuellement depuis le cockpit.",
    entityId: validationId,
    entityType: "validation",
    payload,
    requestId: input.requestId,
  });

  revalidatePath("/dashboard");
  if (input.requestId) {
    revalidatePath(`/requests/${input.requestId}`);
  }
  revalidatePath("/", "layout");

  return {
    message: "Validation créée avec succès.",
    ok: true,
    validationId,
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
