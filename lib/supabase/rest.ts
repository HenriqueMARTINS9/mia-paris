import "server-only";

import { cache } from "react";

import {
  getSupabaseAdminEnv,
  getSupabaseEnv,
  hasSupabaseAdminEnv,
} from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface SupabaseRestOptions {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH";
  params?: Record<
    string,
    string | number | boolean | null | undefined
  >;
  prefer?: string;
  resource: string;
}

export interface SupabaseRestExecutionContext {
  authMode?: "service_role" | "session";
}

export interface SupabaseRestErrorPayload {
  code?: string;
  details?: string;
  error?: string;
  hint?: string;
  message?: string;
}

export interface SupabaseRestResponse<T> {
  data: T | null;
  error: string | null;
  rawError: SupabaseRestErrorPayload | null;
  status: number;
}

export async function supabaseRestSelectList<T>(
  resource: string,
  params?: SupabaseRestOptions["params"],
  context?: SupabaseRestExecutionContext,
) {
  return executeSupabaseRestRequest<T[]>({
    context,
    resource,
    params,
  });
}

export async function supabaseRestSelectMaybeSingle<T>(
  resource: string,
  params?: SupabaseRestOptions["params"],
  context?: SupabaseRestExecutionContext,
): Promise<SupabaseRestResponse<T>> {
  const response = await executeSupabaseRestRequest<T[]>({
    context,
    resource,
    params,
  });

  if (response.error || !response.data) {
    return {
      data: null,
      error: response.error,
      rawError: response.rawError,
      status: response.status,
    };
  }

  return {
    data: response.data[0] ?? null,
    error: null,
    rawError: null,
    status: response.status,
  };
}

export async function supabaseRestInsert<T>(
  resource: string,
  body: unknown,
  params?: SupabaseRestOptions["params"],
  context?: SupabaseRestExecutionContext,
) {
  return executeSupabaseRestRequest<T>({
    body,
    context,
    method: "POST",
    params,
    prefer: "return=representation",
    resource,
  });
}

export async function supabaseRestPatch<T>(
  resource: string,
  body: unknown,
  params?: SupabaseRestOptions["params"],
  context?: SupabaseRestExecutionContext,
) {
  return executeSupabaseRestRequest<T>({
    body,
    context,
    method: "PATCH",
    params,
    prefer: "return=representation",
    resource,
  });
}

export function isMissingSupabaseResourceError(
  error: SupabaseRestErrorPayload | null,
) {
  if (!error) {
    return false;
  }

  const message = [
    error.message,
    error.error,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return error.code === "42P01" || message.includes("does not exist");
}

export function isMissingSupabaseColumnError(
  error: SupabaseRestErrorPayload | null,
) {
  if (!error) {
    return false;
  }

  const message = [
    error.message,
    error.error,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return error.code === "42703" || message.includes("column");
}

async function executeSupabaseRestRequest<T>({
  body,
  context,
  method = "GET",
  params,
  prefer,
  resource,
}: SupabaseRestOptions & {
  context?: SupabaseRestExecutionContext;
}): Promise<SupabaseRestResponse<T>> {
  const authHeaders = await getSupabaseRestAuthHeaders(
    method !== "GET",
    context,
  );

  if (authHeaders.error) {
    return {
      data: null,
      error: authHeaders.error,
      rawError: null,
      status: 401,
    };
  }

  const response = await fetch(buildSupabaseRestUrl(resource, params), {
    method,
    headers: {
      ...authHeaders.headers,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text.length > 0 ? safeJsonParse(text) : null;

  if (!response.ok) {
    return {
      data: null,
      error: getSupabaseRestErrorMessage(payload) ?? response.statusText,
      rawError: isErrorPayload(payload) ? payload : null,
      status: response.status,
    };
  }

  return {
    data: (payload as T | null) ?? null,
    error: null,
    rawError: null,
    status: response.status,
  };
}

async function getSupabaseRestAuthHeaders(
  includeContentType: boolean,
  context?: SupabaseRestExecutionContext,
) {
  if (context?.authMode === "service_role") {
    const cachedResult = await getServiceRoleRestAuthHeaders();
    return {
      error: cachedResult.error,
      headers: cachedResult.headers
        ? {
            ...cachedResult.headers,
            ...(includeContentType ? { "Content-Type": "application/json" } : {}),
          }
        : null,
    };
  }

  const cachedResult = await getSessionRestAuthHeaders();

  return {
    error: cachedResult.error,
    headers: cachedResult.headers
      ? {
          ...cachedResult.headers,
          ...(includeContentType ? { "Content-Type": "application/json" } : {}),
        }
      : null,
  };
}

const getServiceRoleRestAuthHeaders = cache(async () => {
  if (!hasSupabaseAdminEnv) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY manquante. Impossible d'exécuter cette mutation serveur contrôlée.",
      headers: null,
    };
  }

  const { supabaseServiceRoleKey } = getSupabaseAdminEnv();

  return {
    error: null,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  };
});

const getSessionRestAuthHeaders = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error:
        "Session Supabase introuvable. Reconnecte-toi pour accéder à cette ressource.",
      headers: null,
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      error:
        "Session Supabase expirée. Reconnecte-toi pour continuer.",
      headers: null,
    };
  }

  const { supabasePublishableKey } = getSupabaseEnv();

  return {
    error: null,
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${session.access_token}`,
    },
  };
});

function buildSupabaseRestUrl(
  resource: string,
  params?: SupabaseRestOptions["params"],
) {
  const { supabaseUrl } = getSupabaseEnv();
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();

  return query.length > 0
    ? `${supabaseUrl}/rest/v1/${resource}?${query}`
    : `${supabaseUrl}/rest/v1/${resource}`;
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

function isErrorPayload(payload: unknown): payload is SupabaseRestErrorPayload {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload);
}

function getSupabaseRestErrorMessage(payload: unknown) {
  if (!isErrorPayload(payload)) {
    return null;
  }

  return (
    payload.message ?? payload.error ?? payload.details ?? payload.hint ?? null
  );
}
