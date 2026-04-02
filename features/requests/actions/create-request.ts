"use server";

import { revalidatePath } from "next/cache";

import type {
  CreateRequestInput,
  RequestMutationResult,
} from "@/features/requests/types";
import {
  mapUiPriorityToDatabasePriority,
  mapUiStatusToDatabaseStatus,
} from "@/features/requests/metadata";
import { authorizeServerAction } from "@/features/auth/server-authorization";
import { insertActivityLogViaRest } from "@/lib/activity-logs";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";

export async function createRequestAction(
  input: CreateRequestInput,
): Promise<RequestMutationResult & { requestId?: string | null }> {
  const authorization = await authorizeServerAction("requests.create");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "status",
      message: authorization.message,
      requestId: null,
    };
  }

  if (input.title.trim().length < 3) {
    return {
      ok: false,
      field: "status",
      message: "Renseigne un titre de demande plus explicite.",
      requestId: null,
    };
  }

  if (!input.requestType.trim()) {
    return {
      ok: false,
      field: "status",
      message: "Sélectionne un type de demande.",
      requestId: null,
    };
  }

  const payload: Record<string, unknown> = {
    assigned_user_id: input.assignedUserId,
    client_id: input.clientId,
    contact_id: input.contactId,
    due_at: toIsoDate(input.dueAt),
    model_id: input.modelId,
    priority: mapUiPriorityToDatabasePriority(input.priority),
    product_department_id: input.productDepartmentId,
    request_type: input.requestType.trim(),
    requested_action: input.requestedAction?.trim() || null,
    source_type: "manual",
    status: mapUiStatusToDatabaseStatus(input.status, input.requestType),
    summary: input.summary?.trim() || null,
    title: input.title.trim(),
    updated_at: new Date().toISOString(),
  };

  const result = await insertWithMissingColumnFallback("requests", payload);

  if (result.error || !result.data || result.data.length === 0) {
    return {
      ok: false,
      field: "status",
      message: `Création de demande impossible: ${result.error ?? "aucune ligne insérée."}`,
      requestId: null,
    };
  }

  const requestId =
    typeof result.data[0]?.id === "string" ? result.data[0].id : null;

  await insertActivityLogViaRest({
    action: "request_created_manually",
    actorId: authorization.actorId,
    actorType: "user",
    description: "Demande créée manuellement depuis le cockpit.",
    entityId: requestId,
    entityType: "request",
    payload,
    requestId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/demandes");
  if (requestId) {
    revalidatePath(`/requests/${requestId}`);
  }
  revalidatePath("/", "layout");

  return {
    ok: true,
    field: "status",
    message: "Demande créée avec succès.",
    requestId,
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

function toIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T09:00:00`).toISOString();
}
