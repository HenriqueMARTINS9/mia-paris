import "server-only";

import {
  insertActivityLogViaAdmin,
  insertActivityLogViaRest,
  type ActivityLogInput,
} from "@/lib/activity-logs";

export function toActionErrorMessage(
  fallback: string,
  error: unknown,
) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
}

export async function logOperationalError(input: {
  actorId?: string | null;
  entityId?: string | null;
  entityType?: string;
  error: unknown;
  message: string;
  payload?: Record<string, unknown> | null;
  requestId?: string | null;
  scope: string;
  source?: "assistant" | "system" | "ui";
}) {
  const errorMessage =
    input.error instanceof Error ? input.error.message : String(input.error);

  console.error(`[${input.scope}]`, {
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? "system",
    error: errorMessage,
    payload: input.payload ?? null,
  });

  const logInput: ActivityLogInput = {
    action: `${input.scope}_error`,
    actorId: input.actorId ?? null,
    actorType: "system",
    description: `${input.message} ${errorMessage}`.trim(),
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? "system",
    payload: {
      ...(input.payload ?? {}),
      errorMessage,
      scope: input.scope,
    },
    requestId: input.requestId ?? null,
    scope: input.scope,
    source: input.source ?? "system",
    status: "failure",
  };

  const restResult = await insertActivityLogViaRest(logInput);

  if (!restResult.ok) {
    await insertActivityLogViaAdmin(logInput);
  }
}

export async function recordAuditEvent(input: ActivityLogInput) {
  const restResult = await insertActivityLogViaRest(input);

  if (!restResult.ok) {
    await insertActivityLogViaAdmin(input);
  }
}
