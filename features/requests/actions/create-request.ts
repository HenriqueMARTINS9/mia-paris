"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import type {
  CreateRequestInput,
  RequestMutationResult,
} from "@/features/requests/types";
import {
  mapUiPriorityToDatabasePriority,
  mapUiStatusToDatabaseStatus,
} from "@/features/requests/metadata";
import {
  authorizeServerAction,
  authorizeServerPermissions,
} from "@/features/auth/server-authorization";
import { recordAuditEvent } from "@/lib/action-runtime";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  type SupabaseRestExecutionContext,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";

export async function createRequestAction(
  input: CreateRequestInput,
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult & { requestId?: string | null }> {
  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(["requests.create"], context.authorizationOverride)
    : await authorizeServerAction("requests.create");

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

  const result = await insertWithMissingColumnFallback(
    "requests",
    payload,
    context?.rest ?? undefined,
  );

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

  await recordAuditEvent({
    action: "request_created_manually",
    actorId: context?.actor?.actorUserId ?? authorization.actorId,
    actorType: context?.actor?.actorType ?? authorization.actorType,
    description:
      context?.actor?.source === "assistant"
        ? "Demande créée depuis OpenClaw."
        : "Demande créée manuellement depuis le cockpit.",
    entityId: requestId,
    entityType: "request",
    payload: {
      ...payload,
      actorEmail: context?.actor?.actorEmail ?? null,
      source: context?.actor?.source ?? authorization.source,
    },
    requestId,
    scope: "requests.create",
    source: context?.actor?.source ?? authorization.source,
    status: "success",
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
  restContext?: SupabaseRestExecutionContext,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      {
        select: "id",
      },
      restContext,
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
