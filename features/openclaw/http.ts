import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { AssistantActionCode, AssistantActionKind } from "@/features/assistant-actions/types";
import {
  executeOpenClawAction,
  openClawFutureSensitiveActionNames,
  openClawReadActionNames,
  openClawSafeWriteActionNames,
  type OpenClawExposedActionName,
  type OpenClawFutureSensitiveActionName,
  type OpenClawReadActionName,
  type OpenClawSafeWriteActionName,
} from "@/features/openclaw/integration";
import { presentOpenClawData } from "@/features/openclaw/presenters";
import { getOpenClawAssistantExecutionContext } from "@/features/openclaw/server-context";
import type { OpenClawResponseMode } from "@/features/openclaw/types";
import { logOperationalError, recordAuditEvent } from "@/lib/action-runtime";
import { getOpenClawEnv, hasOpenClawCrmToken } from "@/lib/openclaw/env";

const OPENCLAW_DEFAULT_RESPONSE_MODE: OpenClawResponseMode = "compact";

const openClawExternalReadActionSet = new Set<OpenClawReadActionName>(
  openClawReadActionNames,
);
const openClawDeclaredSafeWriteActionSet = new Set<OpenClawSafeWriteActionName>(
  openClawSafeWriteActionNames,
);
const openClawSensitiveActionSet = new Set<OpenClawFutureSensitiveActionName>(
  openClawFutureSensitiveActionNames,
);
const openClawExternalActionSet = new Set<OpenClawExposedActionName>([
  ...openClawReadActionNames,
  ...openClawSafeWriteActionNames,
]);
const openClawKnownActionSet = new Set<OpenClawHttpActionName>([
  ...openClawReadActionNames,
  ...openClawSafeWriteActionNames,
  ...openClawFutureSensitiveActionNames,
]);

export const openClawHttpReadActions = [...openClawReadActionNames];
export const openClawHttpSafeWriteActions = [...openClawSafeWriteActionNames];
export const openClawHttpSensitiveActions = [...openClawFutureSensitiveActionNames];

const openClawSensitiveActionsLabel =
  openClawHttpSensitiveActions.length > 0
    ? openClawHttpSensitiveActions.join(", ")
    : "aucune actuellement";

export type OpenClawHttpActionName =
  | OpenClawExposedActionName
  | OpenClawFutureSensitiveActionName;

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

  if (!isHttpActionExposed(bodyValidation.value.action)) {
    const forbiddenMessage = getOpenClawExposureMessage(bodyValidation.value.action);

    await recordOpenClawHttpFailure({
      action: bodyValidation.value.action,
      code: "forbidden",
      message: forbiddenMessage,
    });

    return {
      status: 403,
      body: createErrorResponse({
        action: bodyValidation.value.action,
        code: "forbidden",
        message: forbiddenMessage,
      }),
    };
  }

  const payloadOptions = extractPayloadOptions(bodyValidation.value.payload);

  try {
    const openClawExecutionContext = getOpenClawAssistantExecutionContext();
    const result = await executeOpenClawAction(
      {
        action: bodyValidation.value.action,
        input: payloadOptions.actionPayload,
      },
      {
        allowedActions: openClawExternalActionSet,
        auditActorId: openClawExecutionContext.actor?.actorUserId ?? null,
        auditActorType: openClawExecutionContext.actor?.actorType ?? "assistant",
        auditSource: openClawExecutionContext.actor?.source ?? "assistant",
        authorizationOverride: openClawExecutionContext.authorizationOverride ?? null,
        mutationContext: openClawExecutionContext,
      },
    );

    return {
      status: mapOpenClawResultToStatus(result.code, result.ok),
      body: {
        action: result.action,
        auditScope: result.auditScope,
        code: result.code,
        data: result.ok
          ? presentOpenClawData({
              action: result.action,
              data: result.data,
              input: payloadOptions.actionPayload,
              mode: payloadOptions.responseMode,
            })
          : null,
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
      value: {
        action: OpenClawExposedActionName;
        payload?: unknown;
      } | {
        action: OpenClawFutureSensitiveActionName;
        payload?: unknown;
      };
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

  if (!openClawKnownActionSet.has(action)) {
    return {
      ok: false,
      action: null,
      code: "validation_error",
      message: [
        `Action OpenClaw inconnue: ${value.action}.`,
        `Actions lecture: ${openClawHttpReadActions.join(", ")}.`,
        `Actions safe write: ${openClawHttpSafeWriteActions.join(", ")}.`,
        `Actions sensibles fermées: ${openClawSensitiveActionsLabel}.`,
      ].join(" "),
    };
  }

  return {
    ok: true,
    value: {
      action,
      payload: "payload" in value ? value.payload : undefined,
    } as
      | {
          action: OpenClawExposedActionName;
          payload?: unknown;
        }
      | {
          action: OpenClawFutureSensitiveActionName;
          payload?: unknown;
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
    kind: input.action ? getHttpActionKind(input.action) : null,
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

function extractPayloadOptions(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      actionPayload: payload,
      responseMode: OPENCLAW_DEFAULT_RESPONSE_MODE,
    };
  }

  const { responseMode, ...rest } = payload;
  const resolvedMode =
    responseMode === "detailed" || responseMode === "compact"
      ? responseMode
      : OPENCLAW_DEFAULT_RESPONSE_MODE;

  return {
    actionPayload: rest,
    responseMode: resolvedMode,
  };
}

function getOpenClawExposureMessage(action: OpenClawHttpActionName) {
  if (openClawSensitiveActionSet.has(action as OpenClawFutureSensitiveActionName)) {
    return `L'action ${action} est classée sensible et reste fermée sur la route HTTP externe OpenClaw.`;
  }

  if (openClawDeclaredSafeWriteActionSet.has(action as OpenClawSafeWriteActionName)) {
    return `L'action ${action} est reconnue mais n'est pas encore ouverte sur la route HTTP externe OpenClaw.`;
  }

  return `L'action ${action} n'est pas exposée sur la route HTTP externe OpenClaw.`;
}

function getHttpActionKind(action: OpenClawHttpActionName): AssistantActionKind {
  return openClawExternalReadActionSet.has(action as OpenClawReadActionName) ? "read" : "write";
}

function isHttpActionExposed(
  action: OpenClawHttpActionName,
): action is OpenClawExposedActionName {
  return openClawExternalActionSet.has(action as OpenClawExposedActionName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
