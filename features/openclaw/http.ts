import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { AssistantActionCode, AssistantActionKind } from "@/features/assistant-actions/types";
import {
  executeOpenClawAction,
  openClawReadActionNames,
  openClawSafeWriteActionNames,
  type OpenClawExposedActionName,
  type OpenClawReadActionName,
  type OpenClawSafeWriteActionName,
} from "@/features/openclaw/integration";
import { logOperationalError, recordAuditEvent } from "@/lib/action-runtime";
import { getOpenClawEnv, hasOpenClawCrmToken } from "@/lib/openclaw/env";
import type { AppUserRole } from "@/types/crm";

const openClawServiceRole: AppUserRole = "admin";

const openClawExternalReadActionSet = new Set<OpenClawReadActionName>(
  openClawReadActionNames,
);
const openClawPlannedSafeActionSet = new Set<OpenClawSafeWriteActionName>(
  openClawSafeWriteActionNames,
);
const openClawExternalSafeWriteActionSet = new Set<OpenClawSafeWriteActionName>([
  "createTask",
]);
const openClawExternalActionSet = new Set<OpenClawExposedActionName>([
  ...openClawReadActionNames,
  ...openClawExternalSafeWriteActionSet,
]);

export const openClawHttpReadActions = [...openClawReadActionNames];
export const openClawHttpPlannedSafeActions = [...openClawSafeWriteActionNames];

export type OpenClawHttpActionName =
  | OpenClawReadActionName
  | OpenClawSafeWriteActionName;

export type OpenClawHttpResponseCode = AssistantActionCode | "unauthorized";

export interface OpenClawHttpRequestBody {
  action: OpenClawHttpActionName;
  payload?: unknown;
}

export interface OpenClawHttpResponse<TData = unknown> {
  action: OpenClawHttpActionName | null;
  auditScope: string | null;
  code: OpenClawHttpResponseCode;
  data: TData | null;
  kind: AssistantActionKind | null;
  message: string;
  ok: boolean;
}

export async function handleOpenClawHttpRequest(request: Request) {
  if (!hasOpenClawCrmToken) {
    await recordOpenClawHttpFailure({
      action: null,
      code: "error",
      message: "OPENCLAW_CRM_TOKEN n'est pas configuré côté serveur.",
    });

    return {
      status: 500,
      body: createErrorResponse({
        action: null,
        code: "error",
        message: "Configuration OpenClaw manquante côté serveur.",
      }),
    };
  }

  const tokenCheck = verifyOpenClawAuthorizationHeader(
    request.headers.get("authorization"),
  );

  if (!tokenCheck.ok) {
    await recordOpenClawHttpFailure({
      action: null,
      code: "unauthorized",
      message: tokenCheck.message,
    });

    return {
      status: 401,
      body: createErrorResponse({
        action: null,
        code: "unauthorized",
        message: tokenCheck.message,
      }),
    };
  }

  const rawBody = await request.json().catch(() => null);
  const bodyValidation = validateOpenClawHttpBody(rawBody);

  if (!bodyValidation.ok) {
    await recordOpenClawHttpFailure({
      action: bodyValidation.action,
      code: bodyValidation.code,
      message: bodyValidation.message,
    });

    return {
      status: 400,
      body: createErrorResponse({
        action: bodyValidation.action,
        code: bodyValidation.code,
        message: bodyValidation.message,
      }),
    };
  }

  try {
    const result = await executeOpenClawAction(
      {
        action: bodyValidation.value.action as OpenClawExposedActionName,
        input: bodyValidation.value.payload,
      },
      {
        allowedActions: openClawExternalActionSet,
        auditActorType: "assistant",
        auditSource: "assistant",
        authorizationOverride: {
          actorId: null,
          actorType: "assistant",
          role: openClawServiceRole,
          source: "assistant",
        },
      },
    );

    return {
      status: mapOpenClawResultToStatus(result.code, result.ok),
      body: {
        action: result.action,
        auditScope: result.auditScope,
        code: result.code,
        data: result.data,
        kind: result.kind,
        message: result.message,
        ok: result.ok,
      } satisfies OpenClawHttpResponse,
    };
  } catch (error) {
    await logOperationalError({
      actorId: null,
      entityId: bodyValidation.value.action,
      entityType: "openclaw_action",
      error,
      message: "Traitement de la requête OpenClaw impossible.",
      payload: {
        action: bodyValidation.value.action,
      },
      requestId: null,
      scope: "openclaw.http",
      source: "assistant",
    });

    return {
      status: 500,
      body: createErrorResponse({
        action: bodyValidation.value.action,
        code: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erreur interne OpenClaw.",
      }),
    };
  }
}

export function validateOpenClawHttpBody(value: unknown):
  | {
      ok: true;
      value: OpenClawHttpRequestBody;
    }
  | {
      ok: false;
      action: OpenClawHttpActionName | null;
      code: "validation_error";
      message: string;
    } {
  if (!isRecord(value)) {
    return {
      ok: false,
      action: null,
      code: "validation_error",
      message: "Body JSON invalide. Format attendu: { action, payload }.",
    };
  }

  if (typeof value.action !== "string" || value.action.trim().length === 0) {
    return {
      ok: false,
      action: null,
      code: "validation_error",
      message: "Le champ action est requis.",
    };
  }

  const action = value.action.trim() as OpenClawHttpActionName;

  if (
    !openClawExternalReadActionSet.has(action as OpenClawReadActionName) &&
    !openClawPlannedSafeActionSet.has(action as OpenClawSafeWriteActionName)
  ) {
    return {
      ok: false,
      action: null,
      code: "validation_error",
      message: [
        `Action OpenClaw inconnue: ${value.action}.`,
        `Actions lecture actuellement ouvertes: ${openClawHttpReadActions.join(", ")}.`,
      ].join(" "),
    };
  }

  return {
    ok: true,
    value: {
      action,
      payload: "payload" in value ? value.payload : undefined,
    },
  };
}

function verifyOpenClawAuthorizationHeader(header: string | null) {
  const prefix = "Bearer ";

  if (!header || !header.startsWith(prefix)) {
    return {
      ok: false as const,
      message: "Authorization Bearer manquant pour la route OpenClaw.",
    };
  }

  const providedToken = header.slice(prefix.length).trim();

  if (!providedToken) {
    return {
      ok: false as const,
      message: "Token OpenClaw vide.",
    };
  }

  const expectedToken = getOpenClawEnv().openClawCrmToken;
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) {
    return {
      ok: false as const,
      message: "Token OpenClaw invalide.",
    };
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return {
      ok: false as const,
      message: "Token OpenClaw invalide.",
    };
  }

  return {
    ok: true as const,
  };
}

async function recordOpenClawHttpFailure(input: {
  action: OpenClawHttpActionName | null;
  code: OpenClawHttpResponseCode;
  message: string;
}) {
  await recordAuditEvent({
    action: "openclaw_http_request",
    actorId: null,
    actorType: "assistant",
    description: input.message,
    entityId: input.action,
    entityType: "openclaw_http",
    payload: {
      action: input.action,
      code: input.code,
    },
    requestId: null,
    scope: "openclaw.http",
    source: "assistant",
    status: "failure",
  });
}

function createErrorResponse(input: {
  action: OpenClawHttpActionName | null;
  code: OpenClawHttpResponseCode;
  message: string;
}): OpenClawHttpResponse {
  return {
    action: input.action,
    auditScope: input.action ? `openclaw.${input.action}` : "openclaw.http",
    code: input.code,
    data: null,
    kind: input.action
      ? openClawExternalReadActionSet.has(input.action as OpenClawReadActionName)
        ? "read"
        : "write"
      : null,
    message: input.message,
    ok: false,
  };
}

function mapOpenClawResultToStatus(
  code: AssistantActionCode,
  ok: boolean,
) {
  if (ok) {
    return 200;
  }

  if (code === "forbidden") {
    return 403;
  }

  if (code === "validation_error" || code === "not_found") {
    return 422;
  }

  return 500;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
