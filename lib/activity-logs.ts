import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";
import {
  isMissingSupabaseColumnError,
  isMissingSupabaseResourceError,
  supabaseRestInsert,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";

export interface ActivityLogInput {
  action: string;
  actorId?: string | null;
  actorType?: string | null;
  createdAt?: string;
  description: string;
  entityId?: string | null;
  entityType: string;
  payload?: Record<string, unknown> | null;
  requestId?: string | null;
}

export async function insertActivityLogViaRest(input: ActivityLogInput) {
  const payload = buildActivityLogPayload(input);
  const result = await insertWithMissingColumnsViaRest(payload);

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    error: null,
  };
}

export async function insertActivityLogViaAdmin(input: ActivityLogInput) {
  if (!hasSupabaseAdminEnv) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY manquante pour écrire le log d'activité.",
    };
  }

  const payload = buildActivityLogPayload(input);
  const admin = createSupabaseAdminClient();
  const currentPayload = { ...payload };

  while (true) {
    const { error } = await admin
      .from("activity_logs" as never)
      .insert(currentPayload as never);

    if (!error) {
      return {
        ok: true,
        error: null,
      };
    }

    if (!isMissingColumnPostgrestError(error)) {
      if (isMissingResourcePostgrestError(error)) {
        return {
          ok: true,
          error: null,
        };
      }

      return {
        ok: false,
        error: error.message,
      };
    }

    const missingColumn = extractMissingColumnName({
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return {
        ok: false,
        error: error.message,
      };
    }

    delete currentPayload[missingColumn];
  }
}

function buildActivityLogPayload(input: ActivityLogInput) {
  const payload = input.payload ?? null;

  return cleanPayload({
    action: input.action,
    action_type: input.action,
    actor_id: input.actorId ?? null,
    actor_type: input.actorType ?? "system",
    created_at: input.createdAt ?? new Date().toISOString(),
    description: input.description,
    entity_id: input.entityId ?? null,
    entity_type: input.entityType,
    metadata: payload,
    payload,
    request_id: input.requestId ?? null,
  });
}

async function insertWithMissingColumnsViaRest(payload: Record<string, unknown>) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      "activity_logs",
      currentPayload,
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

function isMissingColumnPostgrestError(error: PostgrestError) {
  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return error.code === "42703" || message.includes("column");
}

function isMissingResourcePostgrestError(error: PostgrestError) {
  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return error.code === "42P01" || message.includes("does not exist");
}
