import "server-only";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import {
  addNoteToProduction,
  addNoteToRequest,
  createTask,
  getBlockedProductions,
  getHighRiskProductions,
  getRequestsWithoutAssignee,
  getTodayUrgencies,
  getUnprocessedEmails,
  prepareReplyDraft,
  searchClientHistory,
  searchModelHistory,
} from "@/features/assistant-actions/commands";
import { assistantActionCatalog } from "@/features/assistant-actions/catalog";
import type {
  AssistantActionKind,
  AssistantActionResult,
  AssistantAddProductionNoteInput,
  AssistantAddRequestNoteInput,
  AssistantCreateTaskInput,
  AssistantPrepareReplyDraftInput,
} from "@/features/assistant-actions/types";
import type { ServerPermissionOverride } from "@/features/auth/server-authorization";
import { getCurrentUserContext } from "@/features/auth/queries";
import { recordAuditEvent } from "@/lib/action-runtime";

export type OpenClawReadActionName =
  | "getBlockedProductions"
  | "getHighRiskProductions"
  | "getRequestsWithoutAssignee"
  | "getTodayUrgencies"
  | "getUnprocessedEmails"
  | "searchClientHistory"
  | "searchModelHistory";

export type OpenClawSafeWriteActionName =
  | "addNoteToProduction"
  | "addNoteToRequest"
  | "createTask"
  | "prepareReplyDraft";

export type OpenClawExposedActionName =
  | OpenClawReadActionName
  | OpenClawSafeWriteActionName;

export type OpenClawFutureSensitiveActionName = "createDeadline";

export interface OpenClawActionDescriptor {
  action: OpenClawExposedActionName | OpenClawFutureSensitiveActionName;
  description: string;
  enabled: boolean;
  example: string;
  kind: AssistantActionKind;
  label: string;
  permission?: string;
  sampleInput: Record<string, unknown> | null;
}

export interface OpenClawActionEnvelope {
  action: OpenClawExposedActionName;
  input?: unknown;
}

export interface OpenClawActionExecutionResult<TData = unknown>
  extends AssistantActionResult<TData> {
  action: OpenClawExposedActionName;
  auditScope: string;
  kind: AssistantActionKind;
}

export interface OpenClawExecutionOptions {
  allowedActions?: ReadonlySet<OpenClawExposedActionName>;
  auditActorId?: string | null;
  auditActorType?: string | null;
  auditSource?: "assistant" | "system" | "ui";
  authorizationOverride?: ServerPermissionOverride | null;
  mutationContext?: AssistantMutationExecutionContext | null;
}

export const openClawReadActionNames: OpenClawReadActionName[] = [
  "getTodayUrgencies",
  "getUnprocessedEmails",
  "getRequestsWithoutAssignee",
  "getBlockedProductions",
  "getHighRiskProductions",
  "searchClientHistory",
  "searchModelHistory",
];

export const openClawSafeWriteActionNames: OpenClawSafeWriteActionName[] = [
  "prepareReplyDraft",
  "createTask",
  "addNoteToRequest",
  "addNoteToProduction",
];

const openClawReadActionSet = new Set<OpenClawReadActionName>(openClawReadActionNames);

const openClawSafeWriteActionSet = new Set<OpenClawSafeWriteActionName>(
  openClawSafeWriteActionNames,
);

const openClawFutureSensitiveActions: OpenClawFutureSensitiveActionName[] = [
  "createDeadline",
];

const openClawActionSamples: Record<
  OpenClawExposedActionName | OpenClawFutureSensitiveActionName,
  Record<string, unknown> | null
> = {
  addNoteToProduction: {
    notes: "Blocage confirmé côté atelier. Repoint à 16h.",
    productionId: "production-uuid",
  },
  addNoteToRequest: {
    note: "Le client attend un retour sur le prix avant demain 11h.",
    requestId: "request-uuid",
  },
  createDeadline: {
    deadlineAt: "2026-04-02",
    label: "Valider le dossier avant expédition",
    priority: "high",
    requestId: "request-uuid",
  },
  createTask: {
    dueAt: "2026-04-02",
    priority: "high",
    requestId: "request-uuid",
    taskType: "internal_review",
    title: "Contrôler les derniers éléments client",
  },
  getBlockedProductions: null,
  getHighRiskProductions: null,
  getRequestsWithoutAssignee: null,
  getTodayUrgencies: null,
  getUnprocessedEmails: null,
  prepareReplyDraft: {
    context: {
      clientName: "Etam",
      dueAt: null,
      recipientEmail: "contact@etam.com",
      recipientName: "Camille",
      requestId: "request-uuid",
      requestPriority: "high",
      requestStatus: "qualification",
      requestType: "price_request",
      requestedAction: "Envoyer le chiffrage",
      sourceId: "email-uuid",
      sourceType: "email",
      subject: "Besoin de prix mis à jour",
      summary: "Le client demande une révision rapide du target price.",
    },
    replyType: "acknowledgement",
  },
  searchClientHistory: {
    clientName: "Etam",
  },
  searchModelHistory: {
    modelName: "Mia Bandana Dress",
  },
};

export function getOpenClawActionDescriptors(): OpenClawActionDescriptor[] {
  const exposedDescriptors = assistantActionCatalog
    .filter(
      (action) =>
        action.safeForOpenClaw &&
        (openClawReadActionSet.has(action.command as OpenClawReadActionName) ||
          openClawSafeWriteActionSet.has(action.command as OpenClawSafeWriteActionName)),
    )
    .map((action) => ({
      action: action.command as OpenClawExposedActionName,
      description: action.description,
      enabled: true,
      example: action.example,
      kind: action.kind,
      label: action.label,
      permission: action.permission,
      sampleInput: openClawActionSamples[action.command] ?? null,
    }));

  const futureDescriptors = openClawFutureSensitiveActions.map((actionName) => {
    const catalogEntry = assistantActionCatalog.find((item) => item.command === actionName);

    return {
      action: actionName,
      description:
        catalogEntry?.description ??
        "Action sensible préparée, mais pas encore exposée à OpenClaw.",
      enabled: false,
      example: catalogEntry?.example ?? "À ouvrir plus tard sous contrôle renforcé.",
      kind: catalogEntry?.kind ?? "write",
      label: catalogEntry?.label ?? actionName,
      permission: catalogEntry?.permission,
      sampleInput: openClawActionSamples[actionName] ?? null,
    } satisfies OpenClawActionDescriptor;
  });

  return [...exposedDescriptors, ...futureDescriptors];
}

export async function executeOpenClawAction(
  envelope: OpenClawActionEnvelope,
  options?: OpenClawExecutionOptions,
): Promise<OpenClawActionExecutionResult> {
  const action = envelope.action;
  const input = envelope.input;
  const currentUser = options?.authorizationOverride
    ? options.authorizationOverride.currentUser ?? null
    : await getCurrentUserContext();
  const actorId =
    options?.auditActorId ??
    options?.authorizationOverride?.actorId ??
    currentUser?.appUser?.id ??
    null;
  const actorType =
    options?.auditActorType ??
    options?.authorizationOverride?.actorType ??
    (actorId ? "user" : "system");
  const auditSource = options?.auditSource ?? "assistant";

  try {
    const result =
      options?.allowedActions && !options.allowedActions.has(action)
        ? {
            code: "forbidden" as const,
            data: null,
            message:
              "Cette action n’est pas encore ouverte à OpenClaw sur la route HTTP externe.",
            ok: false,
          }
        : await dispatchOpenClawAction(action, input, options);

    await recordAuditEvent({
      action: "openclaw_action_invoked",
      actorId,
      actorType,
      description: result.ok
        ? `Action OpenClaw ${action} exécutée.`
        : `Action OpenClaw ${action} refusée ou en erreur.`,
      entityId: getAuditEntityId(action, input),
      entityType: getAuditEntityType(action),
      payload: {
        action,
        input: sanitizeAuditInput(action, input),
        message: result.message,
        resultCode: result.code,
      },
      requestId: getAuditRequestId(action, input),
      scope: `openclaw.${action}`,
      source: auditSource,
      status: result.ok ? "success" : "failure",
    });

    return {
      ...result,
      action,
      auditScope: `openclaw.${action}`,
      kind: getActionKind(action),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Exécution OpenClaw impossible.";

    await recordAuditEvent({
      action: "openclaw_action_invoked",
      actorId,
      actorType,
      description: `Action OpenClaw ${action} en erreur critique.`,
      entityId: getAuditEntityId(action, input),
      entityType: getAuditEntityType(action),
      payload: {
        action,
        errorMessage: message,
        input: sanitizeAuditInput(action, input),
      },
      requestId: getAuditRequestId(action, input),
      scope: `openclaw.${action}`,
      source: auditSource,
      status: "failure",
    });

    return {
      action,
      auditScope: `openclaw.${action}`,
      code: "error",
      data: null,
      kind: getActionKind(action),
      message,
      ok: false,
    };
  }
}

function getActionKind(action: OpenClawExposedActionName): AssistantActionKind {
  return openClawReadActionSet.has(action as OpenClawReadActionName) ? "read" : "write";
}

async function dispatchOpenClawAction(
  action: OpenClawExposedActionName,
  input: unknown,
  options?: OpenClawExecutionOptions,
): Promise<AssistantActionResult<unknown>> {
  switch (action) {
    case "getTodayUrgencies":
      return getTodayUrgencies({
        authorizationOverride: options?.authorizationOverride,
      });
    case "getUnprocessedEmails":
      return getUnprocessedEmails({
        authorizationOverride: options?.authorizationOverride,
      });
    case "getRequestsWithoutAssignee":
      return getRequestsWithoutAssignee({
        authorizationOverride: options?.authorizationOverride,
      });
    case "getBlockedProductions":
      return getBlockedProductions({
        authorizationOverride: options?.authorizationOverride,
      });
    case "getHighRiskProductions":
      return getHighRiskProductions({
        authorizationOverride: options?.authorizationOverride,
      });
    case "searchClientHistory": {
      const parsed = parseClientHistoryInput(input);
      return parsed.ok
        ? searchClientHistory(parsed.clientName, {
            authorizationOverride: options?.authorizationOverride,
          })
        : parsed.result;
    }
    case "searchModelHistory": {
      const parsed = parseModelHistoryInput(input);
      return parsed.ok
        ? searchModelHistory(parsed.modelName, {
            authorizationOverride: options?.authorizationOverride,
          })
        : parsed.result;
    }
    case "prepareReplyDraft": {
      const parsed = parsePrepareReplyDraftInput(input);
      return parsed.ok
        ? prepareReplyDraft({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
          })
        : parsed.result;
    }
    case "createTask": {
      const parsed = parseCreateTaskInput(input);
      return parsed.ok
        ? createTask({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "addNoteToRequest": {
      const parsed = parseAddNoteToRequestInput(input);
      return parsed.ok
        ? addNoteToRequest({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
          })
        : parsed.result;
    }
    case "addNoteToProduction": {
      const parsed = parseAddNoteToProductionInput(input);
      return parsed.ok
        ? addNoteToProduction({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
          })
        : parsed.result;
    }
  }
}

function parseClientHistoryInput(input: unknown) {
  if (!isRecord(input) || typeof input.clientName !== "string" || input.clientName.trim().length < 2) {
    return {
      ok: false as const,
      result: {
        code: "validation_error" as const,
        data: null,
        message: "Le paramètre clientName est requis pour searchClientHistory.",
        ok: false,
      },
    };
  }

  return {
    ok: true as const,
    clientName: input.clientName.trim(),
  };
}

function parseModelHistoryInput(input: unknown) {
  if (!isRecord(input) || typeof input.modelName !== "string" || input.modelName.trim().length < 2) {
    return {
      ok: false as const,
      result: {
        code: "validation_error" as const,
        data: null,
        message: "Le paramètre modelName est requis pour searchModelHistory.",
        ok: false,
      },
    };
  }

  return {
    ok: true as const,
    modelName: input.modelName.trim(),
  };
}

function parseCreateTaskInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour createTask.");
  }

  if (
    typeof input.title !== "string" ||
    typeof input.taskType !== "string" ||
    typeof input.priority !== "string"
  ) {
    return invalidPayloadResult(
      "Les champs title, taskType et priority sont requis pour createTask.",
    );
  }

  return {
    ok: true as const,
    value: {
      assignedUserId:
        typeof input.assignedUserId === "string" ? input.assignedUserId : null,
      dueAt: typeof input.dueAt === "string" ? input.dueAt : null,
      priority: input.priority as AssistantCreateTaskInput["priority"],
      requestId: typeof input.requestId === "string" ? input.requestId : null,
      taskType: input.taskType,
      title: input.title,
    } satisfies AssistantCreateTaskInput,
  };
}

function parseAddNoteToRequestInput(input: unknown) {
  if (
    !isRecord(input) ||
    typeof input.requestId !== "string" ||
    typeof input.note !== "string"
  ) {
    return invalidPayloadResult(
      "Les champs requestId et note sont requis pour addNoteToRequest.",
    );
  }

  return {
    ok: true as const,
    value: {
      note: input.note,
      requestId: input.requestId,
    } satisfies AssistantAddRequestNoteInput,
  };
}

function parseAddNoteToProductionInput(input: unknown) {
  if (
    !isRecord(input) ||
    typeof input.productionId !== "string" ||
    typeof input.notes !== "string"
  ) {
    return invalidPayloadResult(
      "Les champs productionId et notes sont requis pour addNoteToProduction.",
    );
  }

  return {
    ok: true as const,
    value: {
      notes: input.notes,
      productionId: input.productionId,
    } satisfies AssistantAddProductionNoteInput,
  };
}

function parsePrepareReplyDraftInput(input: unknown) {
  if (!isRecord(input) || !isRecord(input.context) || typeof input.replyType !== "string") {
    return invalidPayloadResult(
      "Les champs replyType et context sont requis pour prepareReplyDraft.",
    );
  }

  if (
    typeof input.context.sourceId !== "string" ||
    typeof input.context.sourceType !== "string" ||
    typeof input.context.subject !== "string"
  ) {
    return invalidPayloadResult(
      "Le contexte de prepareReplyDraft doit contenir sourceId, sourceType et subject.",
    );
  }

  return {
    ok: true as const,
    value: {
      context: input.context as unknown as AssistantPrepareReplyDraftInput["context"],
      replyType: input.replyType as AssistantPrepareReplyDraftInput["replyType"],
    } satisfies AssistantPrepareReplyDraftInput,
  };
}

function invalidPayloadResult(message: string) {
  return {
    ok: false as const,
    result: {
      code: "validation_error" as const,
      data: null,
      message,
      ok: false,
    },
  };
}

function sanitizeAuditInput(action: OpenClawExposedActionName, input: unknown) {
  if (!isRecord(input)) {
    return input ?? null;
  }

  switch (action) {
    case "addNoteToRequest":
      return {
        notePreview:
          typeof input.note === "string" ? input.note.slice(0, 180) : null,
        requestId: typeof input.requestId === "string" ? input.requestId : null,
      };
    case "addNoteToProduction":
      return {
        notesPreview:
          typeof input.notes === "string" ? input.notes.slice(0, 180) : null,
        productionId:
          typeof input.productionId === "string" ? input.productionId : null,
      };
    case "createTask":
      return {
        dueAt: typeof input.dueAt === "string" ? input.dueAt : null,
        priority: typeof input.priority === "string" ? input.priority : null,
        requestId: typeof input.requestId === "string" ? input.requestId : null,
        taskType: typeof input.taskType === "string" ? input.taskType : null,
        title: typeof input.title === "string" ? input.title.slice(0, 120) : null,
      };
    case "prepareReplyDraft":
      return isRecord(input.context)
        ? {
            replyType: typeof input.replyType === "string" ? input.replyType : null,
            sourceId:
              typeof input.context.sourceId === "string" ? input.context.sourceId : null,
            sourceType:
              typeof input.context.sourceType === "string"
                ? input.context.sourceType
                : null,
            subject:
              typeof input.context.subject === "string"
                ? input.context.subject.slice(0, 140)
                : null,
          }
        : null;
    default:
      return input;
  }
}

function getAuditEntityId(action: OpenClawExposedActionName, input: unknown) {
  if (!isRecord(input)) {
    return null;
  }

  switch (action) {
    case "searchClientHistory":
      return typeof input.clientName === "string" ? input.clientName : null;
    case "searchModelHistory":
      return typeof input.modelName === "string" ? input.modelName : null;
    case "createTask":
    case "addNoteToRequest":
      return typeof input.requestId === "string" ? input.requestId : null;
    case "addNoteToProduction":
      return typeof input.productionId === "string" ? input.productionId : null;
    case "prepareReplyDraft":
      return isRecord(input.context) &&
        typeof input.context.sourceId === "string" &&
        typeof input.context.sourceType === "string"
        ? `${input.context.sourceType}:${input.context.sourceId}`
        : null;
    default:
      return null;
  }
}

function getAuditEntityType(action: OpenClawExposedActionName) {
  switch (action) {
    case "createTask":
      return "task";
    case "addNoteToRequest":
    case "searchClientHistory":
      return "request";
    case "addNoteToProduction":
    case "getBlockedProductions":
    case "getHighRiskProductions":
      return "production";
    case "prepareReplyDraft":
      return "reply_draft";
    case "searchModelHistory":
      return "model";
    case "getTodayUrgencies":
      return "deadline";
    case "getUnprocessedEmails":
      return "email";
    case "getRequestsWithoutAssignee":
      return "request";
  }
}

function getAuditRequestId(action: OpenClawExposedActionName, input: unknown) {
  if (!isRecord(input)) {
    return null;
  }

  if (
    (action === "createTask" || action === "addNoteToRequest") &&
    typeof input.requestId === "string"
  ) {
    return input.requestId;
  }

  if (
    action === "prepareReplyDraft" &&
    isRecord(input.context) &&
    typeof input.context.requestId === "string"
  ) {
    return input.context.requestId;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
