import "server-only";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import {
  addNoteToProduction,
  addNoteToRequest,
  assignClientToEmail,
  attachEmailToRequest,
  createClient,
  createDeadline,
  createRequest,
  createTask,
  getBlockedProductions,
  getHighRiskProductions,
  getRequestsWithoutAssignee,
  getTodayUrgencies,
  getUnprocessedEmails,
  prepareReplyDraft,
  runEmailOpsCycle,
  runGmailSync,
  setEmailInboxBucket,
  searchClientHistory,
  searchModelHistory,
  writeDailySummary,
  updateRequest,
  updateTask,
} from "@/features/assistant-actions/commands";
import { assistantActionCatalog } from "@/features/assistant-actions/catalog";
import type {
  AssistantActionKind,
  AssistantActionResult,
  AssistantAddProductionNoteInput,
  AssistantAddRequestNoteInput,
  AssistantAssignClientToEmailInput,
  AssistantAttachEmailToRequestInput,
  AssistantCreateClientInput,
  AssistantCreateDeadlineInput,
  AssistantCreateRequestInput,
  AssistantCreateTaskInput,
  AssistantPrepareReplyDraftInput,
  AssistantRunEmailOpsCycleInput,
  AssistantRunGmailSyncInput,
  AssistantSetEmailInboxBucketInput,
  AssistantUpdateRequestInput,
  AssistantUpdateTaskInput,
  AssistantWriteDailySummaryInput,
} from "@/features/assistant-actions/types";
import type { ServerPermissionOverride } from "@/features/auth/server-authorization";
import { getCurrentUserContext } from "@/features/auth/queries";
import { requestPriorityOptions, requestStatusMeta } from "@/features/requests/metadata";
import { replyTemplateOrder } from "@/features/replies/lib/reply-templates";
import {
  assistantTaskTypeValues,
  isAssistantTaskType,
} from "@/features/tasks/task-types";
import { taskStatusOptions } from "@/features/tasks/metadata";
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
  | "assignClientToEmail"
  | "attachEmailToRequest"
  | "createClient"
  | "createDeadline"
  | "createRequest"
  | "createTask"
  | "prepareReplyDraft"
  | "runEmailOpsCycle"
  | "runGmailSync"
  | "setEmailInboxBucket"
  | "updateRequest"
  | "updateTask"
  | "writeDailySummary";

export type OpenClawExposedActionName =
  | OpenClawReadActionName
  | OpenClawSafeWriteActionName;

export type OpenClawFutureSensitiveActionName = never;

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
  "runEmailOpsCycle",
  "runGmailSync",
  "setEmailInboxBucket",
  "writeDailySummary",
  "createClient",
  "assignClientToEmail",
  "attachEmailToRequest",
  "createDeadline",
  "createRequest",
  "createTask",
  "updateRequest",
  "updateTask",
  "addNoteToRequest",
  "addNoteToProduction",
];

const openClawReadActionSet = new Set<OpenClawReadActionName>(openClawReadActionNames);

const openClawSafeWriteActionSet = new Set<OpenClawSafeWriteActionName>(
  openClawSafeWriteActionNames,
);

export const openClawFutureSensitiveActionNames: OpenClawFutureSensitiveActionName[] = [];

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
  assignClientToEmail: {
    clientId: "client-uuid",
    emailId: "email-uuid",
  },
  attachEmailToRequest: {
    emailId: "email-uuid",
    requestId: "request-uuid",
  },
  createClient: {
    code: "ETAM",
    name: "Etam",
  },
  createDeadline: {
    deadlineAt: "2026-04-02",
    label: "Valider le dossier avant expédition",
    priority: "high",
    requestId: "request-uuid",
  },
  createRequest: {
    dueAt: "2026-04-22",
    emailIds: ["email-uuid"],
    priority: "high",
    requestType: "price_request",
    status: "qualification",
    summary: "Le client demande une mise à jour prix avec délai court.",
    title: "Mise à jour target price Etam",
  },
  createTask: {
    dueAt: "2026-04-02",
    priority: "high",
    requestId: "request-uuid",
    taskType: "internal_review",
    title: "Contrôler les derniers éléments client",
  },
  updateRequest: {
    assignedUserId: "user-uuid",
    priority: "high",
    requestId: "request-uuid",
    requestType: "price_request",
    status: "costing",
  },
  updateTask: {
    dueAt: "2026-04-27",
    priority: "critical",
    requestId: "request-uuid",
    status: "in_progress",
    taskId: "task-uuid",
  },
  setEmailInboxBucket: {
    bucket: "important",
    confidence: 0.92,
    emailId: "email-uuid",
    reason: "Demande client explicite sur prix et délai.",
  },
  writeDailySummary: {
    clientSummaries: [
      {
        clientName: "Etam",
        decisions: ["Attente validation prix avant lancement."],
        highlights: ["Demande de prix reçue et demande CRM créée."],
        nextActions: ["Relancer l’acheteuse demain matin si pas de retour."],
        risks: ["Délai court sur le retour prix."],
        summary: "Etam a demandé une mise à jour target price avec échéance courte.",
      },
    ],
    highlights: ["Claw a trié les emails et créé les demandes claires."],
    nextActions: ["Vérifier les emails à revoir."],
    overview: "Journée concentrée sur les demandes prix et les validations client.",
    risks: ["Plusieurs délais courts à surveiller."],
    summaryDate: "2026-04-26",
    summaryTime: "17:30",
    title: "Synthèse du 26 avril",
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
  runEmailOpsCycle: {
    attachToExistingRequests: true,
    createRequests: true,
    limit: 15,
    syncLimit: 50,
    updateRequests: true,
    updateTasks: true,
    writeSummary: true,
  },
  runGmailSync: {
    limit: 50,
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

  const futureDescriptors = openClawFutureSensitiveActionNames.map((actionName) => {
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
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "runEmailOpsCycle": {
      const parsed = parseRunEmailOpsCycleInput(input);
      return parsed.ok
        ? runEmailOpsCycle({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "createRequest": {
      const parsed = parseCreateRequestInput(input);
      return parsed.ok
        ? createRequest({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "createClient": {
      const parsed = parseCreateClientInput(input);
      return parsed.ok
        ? createClient({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "assignClientToEmail": {
      const parsed = parseAssignClientToEmailInput(input);
      return parsed.ok
        ? assignClientToEmail({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "attachEmailToRequest": {
      const parsed = parseAttachEmailToRequestInput(input);
      return parsed.ok
        ? attachEmailToRequest({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "createDeadline": {
      const parsed = parseCreateDeadlineInput(input);
      return parsed.ok
        ? createDeadline({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
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
    case "updateRequest": {
      const parsed = parseUpdateRequestInput(input);
      return parsed.ok
        ? updateRequest({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "updateTask": {
      const parsed = parseUpdateTaskInput(input);
      return parsed.ok
        ? updateTask({
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
            mutationContext: options?.mutationContext ?? null,
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
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "runGmailSync": {
      const parsed = parseRunGmailSyncInput(input);
      return parsed.ok
        ? runGmailSync({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
          })
        : parsed.result;
    }
    case "setEmailInboxBucket": {
      const parsed = parseSetEmailInboxBucketInput(input);
      return parsed.ok
        ? setEmailInboxBucket({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
        })
        : parsed.result;
    }
    case "writeDailySummary": {
      const parsed = parseWriteDailySummaryInput(input);
      return parsed.ok
        ? writeDailySummary({
            ...parsed.value,
            source: "assistant",
          }, {
            authorizationOverride: options?.authorizationOverride,
            mutationContext: options?.mutationContext ?? null,
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

  if (!isAssistantTaskType(input.taskType)) {
    return invalidPayloadResult(
      `taskType invalide pour createTask. Valeurs supportées: ${assistantTaskTypeValues.join(", ")}.`,
    );
  }

  if (!requestPriorityOptions.includes(input.priority as AssistantCreateTaskInput["priority"])) {
    return invalidPayloadResult(
      `priority invalide pour createTask. Valeurs supportées: ${requestPriorityOptions.join(", ")}.`,
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

function parseUpdateTaskInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour updateTask.");
  }

  if (typeof input.taskId !== "string") {
    return invalidPayloadResult("Le champ taskId est requis pour updateTask.");
  }

  if (
    "status" in input &&
    typeof input.status === "string" &&
    !taskStatusOptions.includes(input.status as (typeof taskStatusOptions)[number])
  ) {
    return invalidPayloadResult(
      `status invalide pour updateTask. Valeurs supportées: ${taskStatusOptions.join(", ")}.`,
    );
  }

  if (
    "priority" in input &&
    typeof input.priority === "string" &&
    !requestPriorityOptions.includes(
      input.priority as (typeof requestPriorityOptions)[number],
    )
  ) {
    return invalidPayloadResult(
      `priority invalide pour updateTask. Valeurs supportées: ${requestPriorityOptions.join(", ")}.`,
    );
  }

  const hasDueAt = Object.prototype.hasOwnProperty.call(input, "dueAt");
  const value: AssistantUpdateTaskInput = {
    assignedUserId:
      typeof input.assignedUserId === "string" ? input.assignedUserId : null,
    priority:
      typeof input.priority === "string"
        ? (input.priority as AssistantUpdateTaskInput["priority"])
        : null,
    requestId: typeof input.requestId === "string" ? input.requestId : null,
    status:
      typeof input.status === "string"
        ? (input.status as AssistantUpdateTaskInput["status"])
        : null,
    taskId: input.taskId,
  };

  if (hasDueAt) {
    value.dueAt = typeof input.dueAt === "string" ? input.dueAt : null;
  }

  if (!value.status && !value.priority && !value.assignedUserId && !hasDueAt) {
    return invalidPayloadResult(
      "updateTask nécessite au moins un champ parmi status, priority, assignedUserId ou dueAt.",
    );
  }

  return {
    ok: true as const,
    value,
  };
}

function parseUpdateRequestInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour updateRequest.");
  }

  if (typeof input.requestId !== "string") {
    return invalidPayloadResult("Le champ requestId est requis pour updateRequest.");
  }

  if (
    "status" in input &&
    typeof input.status === "string" &&
    !(input.status in requestStatusMeta)
  ) {
    return invalidPayloadResult(
      `status invalide pour updateRequest. Valeurs supportées: ${Object.keys(requestStatusMeta).join(", ")}.`,
    );
  }

  if (
    "priority" in input &&
    typeof input.priority === "string" &&
    !requestPriorityOptions.includes(
      input.priority as (typeof requestPriorityOptions)[number],
    )
  ) {
    return invalidPayloadResult(
      `priority invalide pour updateRequest. Valeurs supportées: ${requestPriorityOptions.join(", ")}.`,
    );
  }

  if (typeof input.status === "string" && typeof input.requestType !== "string") {
    return invalidPayloadResult(
      "Le champ requestType est requis quand updateRequest modifie le statut.",
    );
  }

  const value: AssistantUpdateRequestInput = {
    assignedUserId:
      typeof input.assignedUserId === "string" ? input.assignedUserId : null,
    priority:
      typeof input.priority === "string"
        ? (input.priority as AssistantUpdateRequestInput["priority"])
        : null,
    requestId: input.requestId,
    requestType: typeof input.requestType === "string" ? input.requestType : null,
    status:
      typeof input.status === "string"
        ? (input.status as AssistantUpdateRequestInput["status"])
        : null,
  };

  if (!value.status && !value.priority && !value.assignedUserId) {
    return invalidPayloadResult(
      "updateRequest nécessite au moins un champ parmi status, priority ou assignedUserId.",
    );
  }

  return {
    ok: true as const,
    value,
  };
}

function parseCreateDeadlineInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour createDeadline.");
  }

  if (
    typeof input.label !== "string" ||
    typeof input.deadlineAt !== "string" ||
    typeof input.priority !== "string"
  ) {
    return invalidPayloadResult(
      "Les champs label, deadlineAt et priority sont requis pour createDeadline.",
    );
  }

  if (
    !requestPriorityOptions.includes(
      input.priority as AssistantCreateDeadlineInput["priority"],
    )
  ) {
    return invalidPayloadResult(
      `priority invalide pour createDeadline. Valeurs supportées: ${requestPriorityOptions.join(", ")}.`,
    );
  }

  return {
    ok: true as const,
    value: {
      deadlineAt: input.deadlineAt,
      label: input.label,
      priority: input.priority as AssistantCreateDeadlineInput["priority"],
      requestId: typeof input.requestId === "string" ? input.requestId : null,
    } satisfies AssistantCreateDeadlineInput,
  };
}

function parseCreateClientInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour createClient.");
  }

  if (typeof input.name !== "string") {
    return invalidPayloadResult("Le champ name est requis pour createClient.");
  }

  return {
    ok: true as const,
    value: {
      code: typeof input.code === "string" ? input.code : null,
      name: input.name,
    } satisfies AssistantCreateClientInput,
  };
}

function parseAssignClientToEmailInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour assignClientToEmail.");
  }

  if (typeof input.emailId !== "string" || typeof input.clientId !== "string") {
    return invalidPayloadResult(
      "Les champs emailId et clientId sont requis pour assignClientToEmail.",
    );
  }

  return {
    ok: true as const,
    value: {
      clientId: input.clientId,
      emailId: input.emailId,
    } satisfies AssistantAssignClientToEmailInput,
  };
}

function parseAttachEmailToRequestInput(input: unknown) {
  if (!isRecord(input) || typeof input.emailId !== "string" || typeof input.requestId !== "string") {
    return invalidPayloadResult(
      "Les champs emailId et requestId sont requis pour attachEmailToRequest.",
    );
  }

  return {
    ok: true as const,
    value: {
      emailId: input.emailId,
      requestId: input.requestId,
    } satisfies AssistantAttachEmailToRequestInput,
  };
}

function parseCreateRequestInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour createRequest.");
  }

  if (
    typeof input.title !== "string" ||
    typeof input.requestType !== "string" ||
    typeof input.priority !== "string"
  ) {
    return invalidPayloadResult(
      "Les champs title, requestType et priority sont requis pour createRequest.",
    );
  }

  if (
    !requestPriorityOptions.includes(
      input.priority as AssistantCreateRequestInput["priority"],
    )
  ) {
    return invalidPayloadResult(
      `priority invalide pour createRequest. Valeurs supportées: ${requestPriorityOptions.join(", ")}.`,
    );
  }

  if (
    "status" in input &&
    typeof input.status === "string" &&
    !(input.status in requestStatusMeta)
  ) {
    return invalidPayloadResult(
      `status invalide pour createRequest. Valeurs supportées: ${Object.keys(requestStatusMeta).join(", ")}.`,
    );
  }

  return {
    ok: true as const,
    value: {
      assignedUserId:
        typeof input.assignedUserId === "string" ? input.assignedUserId : null,
      clientId: typeof input.clientId === "string" ? input.clientId : null,
      contactId: typeof input.contactId === "string" ? input.contactId : null,
      dueAt: typeof input.dueAt === "string" ? input.dueAt : null,
      emailIds: normalizeStringArray(input.emailIds),
      modelId: typeof input.modelId === "string" ? input.modelId : null,
      priority: input.priority as AssistantCreateRequestInput["priority"],
      productDepartmentId:
        typeof input.productDepartmentId === "string"
          ? input.productDepartmentId
          : null,
      requestType: input.requestType,
      requestedAction:
        typeof input.requestedAction === "string" ? input.requestedAction : null,
      status:
        typeof input.status === "string"
          ? (input.status as AssistantCreateRequestInput["status"])
          : "qualification",
      summary: typeof input.summary === "string" ? input.summary : null,
      title: input.title,
    } satisfies AssistantCreateRequestInput,
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

  if (!replyTemplateOrder.includes(input.replyType as AssistantPrepareReplyDraftInput["replyType"])) {
    return invalidPayloadResult(
      `replyType invalide pour prepareReplyDraft. Valeurs supportées: ${replyTemplateOrder.join(", ")}.`,
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

function parseRunGmailSyncInput(input: unknown) {
  if (input === undefined || input === null) {
    return {
      ok: true as const,
      value: {
        limit: null,
      } satisfies AssistantRunGmailSyncInput,
    };
  }

  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour runGmailSync.");
  }

  if (
    "limit" in input &&
    (typeof input.limit !== "number" ||
      !Number.isFinite(input.limit) ||
      input.limit < 1 ||
      input.limit > 100)
  ) {
    return invalidPayloadResult(
      "limit invalide pour runGmailSync. Utilise un nombre entre 1 et 100.",
    );
  }

  return {
    ok: true as const,
    value: {
      limit: typeof input.limit === "number" ? Math.floor(input.limit) : null,
    } satisfies AssistantRunGmailSyncInput,
  };
}

function parseRunEmailOpsCycleInput(input: unknown) {
  if (input === undefined || input === null) {
    return {
      ok: true as const,
      value: {
        attachToExistingRequests: null,
        createRequests: null,
        limit: null,
        syncLimit: null,
        updateRequests: null,
        updateTasks: null,
        writeSummary: null,
      } satisfies AssistantRunEmailOpsCycleInput,
    };
  }

  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour runEmailOpsCycle.");
  }

  if (
    "limit" in input &&
    (typeof input.limit !== "number" ||
      !Number.isFinite(input.limit) ||
      input.limit < 1 ||
      input.limit > 40)
  ) {
    return invalidPayloadResult(
      "limit invalide pour runEmailOpsCycle. Utilise un nombre entre 1 et 40.",
    );
  }

  if (
    "syncLimit" in input &&
    (typeof input.syncLimit !== "number" ||
      !Number.isFinite(input.syncLimit) ||
      input.syncLimit < 1 ||
      input.syncLimit > 100)
  ) {
    return invalidPayloadResult(
      "syncLimit invalide pour runEmailOpsCycle. Utilise un nombre entre 1 et 100.",
    );
  }

  return {
    ok: true as const,
    value: {
      attachToExistingRequests:
        typeof input.attachToExistingRequests === "boolean"
          ? input.attachToExistingRequests
          : null,
      createRequests:
        typeof input.createRequests === "boolean" ? input.createRequests : null,
      limit: typeof input.limit === "number" ? Math.floor(input.limit) : null,
      syncLimit:
        typeof input.syncLimit === "number" ? Math.floor(input.syncLimit) : null,
      updateRequests:
        typeof input.updateRequests === "boolean" ? input.updateRequests : null,
      updateTasks: typeof input.updateTasks === "boolean" ? input.updateTasks : null,
      writeSummary:
        typeof input.writeSummary === "boolean" ? input.writeSummary : null,
    } satisfies AssistantRunEmailOpsCycleInput,
  };
}

function parseSetEmailInboxBucketInput(input: unknown) {
  if (!isRecord(input) || typeof input.emailId !== "string" || typeof input.bucket !== "string") {
    return invalidPayloadResult(
      "Les champs emailId et bucket sont requis pour setEmailInboxBucket.",
    );
  }

  if (!["important", "promotional", "to_review"].includes(input.bucket)) {
    return invalidPayloadResult(
      "bucket invalide pour setEmailInboxBucket. Valeurs supportées: important, promotional, to_review.",
    );
  }

  return {
    ok: true as const,
    value: {
      bucket: input.bucket as AssistantSetEmailInboxBucketInput["bucket"],
      confidence: typeof input.confidence === "number" ? input.confidence : null,
      emailId: input.emailId,
      reason: typeof input.reason === "string" ? input.reason : null,
    } satisfies AssistantSetEmailInboxBucketInput,
  };
}

function parseWriteDailySummaryInput(input: unknown) {
  if (!isRecord(input)) {
    return invalidPayloadResult("Payload invalide pour writeDailySummary.");
  }

  if (typeof input.overview !== "string" || input.overview.trim().length < 12) {
    return invalidPayloadResult(
      "Le champ overview est requis pour writeDailySummary.",
    );
  }

  if (!Array.isArray(input.clientSummaries) || input.clientSummaries.length === 0) {
    return invalidPayloadResult(
      "Le champ clientSummaries doit contenir au moins une section client.",
    );
  }

  const clientSummaries = input.clientSummaries
    .filter(isRecord)
    .map((client) => ({
      clientName: typeof client.clientName === "string" ? client.clientName : "",
      decisions: normalizeStringArray(client.decisions),
      emailIds: normalizeStringArray(client.emailIds),
      highlights: normalizeStringArray(client.highlights),
      nextActions: normalizeStringArray(client.nextActions),
      requestIds: normalizeStringArray(client.requestIds),
      risks: normalizeStringArray(client.risks),
      summary: typeof client.summary === "string" ? client.summary : "",
      taskIds: normalizeStringArray(client.taskIds),
    }))
    .filter(
      (client) =>
        client.clientName.trim().length >= 2 && client.summary.trim().length >= 6,
    );

  if (clientSummaries.length === 0) {
    return invalidPayloadResult(
      "Chaque section client doit contenir clientName et summary.",
    );
  }

  return {
    ok: true as const,
    value: {
      clientSummaries,
      generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : null,
      highlights: normalizeStringArray(input.highlights),
      nextActions: normalizeStringArray(input.nextActions),
      overview: input.overview,
      risks: normalizeStringArray(input.risks),
      summaryDate: typeof input.summaryDate === "string" ? input.summaryDate : null,
      summaryTime: typeof input.summaryTime === "string" ? input.summaryTime : null,
      title: typeof input.title === "string" ? input.title : null,
    } satisfies AssistantWriteDailySummaryInput,
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
    case "createClient":
      return {
        code: typeof input.code === "string" ? input.code : null,
        name: typeof input.name === "string" ? input.name.slice(0, 120) : null,
      };
    case "assignClientToEmail":
      return {
        clientId: typeof input.clientId === "string" ? input.clientId : null,
        emailId: typeof input.emailId === "string" ? input.emailId : null,
      };
    case "attachEmailToRequest":
      return {
        emailId: typeof input.emailId === "string" ? input.emailId : null,
        requestId: typeof input.requestId === "string" ? input.requestId : null,
      };
    case "createRequest":
      return {
        clientId: typeof input.clientId === "string" ? input.clientId : null,
        dueAt: typeof input.dueAt === "string" ? input.dueAt : null,
        emailCount: Array.isArray(input.emailIds) ? input.emailIds.length : 0,
        priority: typeof input.priority === "string" ? input.priority : null,
        requestType:
          typeof input.requestType === "string" ? input.requestType : null,
        status: typeof input.status === "string" ? input.status : null,
        title: typeof input.title === "string" ? input.title.slice(0, 120) : null,
      };
    case "createDeadline":
      return {
        deadlineAt:
          typeof input.deadlineAt === "string" ? input.deadlineAt : null,
        label: typeof input.label === "string" ? input.label.slice(0, 120) : null,
        priority: typeof input.priority === "string" ? input.priority : null,
        requestId: typeof input.requestId === "string" ? input.requestId : null,
      };
    case "createTask":
      return {
        dueAt: typeof input.dueAt === "string" ? input.dueAt : null,
        priority: typeof input.priority === "string" ? input.priority : null,
        requestId: typeof input.requestId === "string" ? input.requestId : null,
        taskType: typeof input.taskType === "string" ? input.taskType : null,
        title: typeof input.title === "string" ? input.title.slice(0, 120) : null,
      };
    case "updateRequest":
      return {
        assignedUserId:
          typeof input.assignedUserId === "string" ? input.assignedUserId : null,
        priority: typeof input.priority === "string" ? input.priority : null,
        requestId: typeof input.requestId === "string" ? input.requestId : null,
        requestType:
          typeof input.requestType === "string" ? input.requestType : null,
        status: typeof input.status === "string" ? input.status : null,
      };
    case "updateTask":
      return {
        assignedUserId:
          typeof input.assignedUserId === "string" ? input.assignedUserId : null,
        dueAt:
          Object.prototype.hasOwnProperty.call(input, "dueAt") &&
          typeof input.dueAt === "string"
            ? input.dueAt
            : null,
        priority: typeof input.priority === "string" ? input.priority : null,
        requestId: typeof input.requestId === "string" ? input.requestId : null,
        status: typeof input.status === "string" ? input.status : null,
        taskId: typeof input.taskId === "string" ? input.taskId : null,
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
    case "runGmailSync":
    case "runEmailOpsCycle":
      return {
        attachToExistingRequests:
          typeof input.attachToExistingRequests === "boolean"
            ? input.attachToExistingRequests
            : null,
        createRequests:
          typeof input.createRequests === "boolean" ? input.createRequests : null,
        limit: typeof input.limit === "number" ? input.limit : null,
        syncLimit: typeof input.syncLimit === "number" ? input.syncLimit : null,
        updateRequests:
          typeof input.updateRequests === "boolean" ? input.updateRequests : null,
        updateTasks: typeof input.updateTasks === "boolean" ? input.updateTasks : null,
        writeSummary:
          typeof input.writeSummary === "boolean" ? input.writeSummary : null,
      };
    case "setEmailInboxBucket":
      return {
        bucket: typeof input.bucket === "string" ? input.bucket : null,
        confidence: typeof input.confidence === "number" ? input.confidence : null,
        emailId: typeof input.emailId === "string" ? input.emailId : null,
        reasonPreview:
          typeof input.reason === "string" ? input.reason.slice(0, 180) : null,
      };
    case "writeDailySummary":
      return {
        clientCount: Array.isArray(input.clientSummaries)
          ? input.clientSummaries.length
          : 0,
        overviewPreview:
          typeof input.overview === "string" ? input.overview.slice(0, 220) : null,
        summaryDate:
          typeof input.summaryDate === "string" ? input.summaryDate : null,
        summaryTime:
          typeof input.summaryTime === "string" ? input.summaryTime : null,
        title: typeof input.title === "string" ? input.title.slice(0, 120) : null,
      };
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
    case "createClient":
      return typeof input.name === "string" ? input.name : null;
    case "assignClientToEmail":
    case "attachEmailToRequest":
      return typeof input.emailId === "string" ? input.emailId : null;
    case "createRequest":
      return typeof input.title === "string" ? input.title : null;
    case "createDeadline":
      return typeof input.requestId === "string"
        ? input.requestId
        : typeof input.label === "string"
          ? input.label
          : null;
    case "createTask":
    case "addNoteToRequest":
    case "updateRequest":
      return typeof input.requestId === "string" ? input.requestId : null;
    case "updateTask":
      return typeof input.taskId === "string" ? input.taskId : null;
    case "addNoteToProduction":
      return typeof input.productionId === "string" ? input.productionId : null;
    case "setEmailInboxBucket":
      return typeof input.emailId === "string" ? input.emailId : null;
    case "writeDailySummary":
      return typeof input.summaryDate === "string"
        ? input.summaryDate
        : typeof input.title === "string"
          ? input.title
          : null;
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
    case "createRequest":
      return "request";
    case "createDeadline":
      return "deadline";
    case "createTask":
    case "updateTask":
      return "task";
    case "addNoteToRequest":
    case "updateRequest":
    case "searchClientHistory":
      return "request";
    case "addNoteToProduction":
    case "getBlockedProductions":
    case "getHighRiskProductions":
      return "production";
    case "createClient":
      return "client";
    case "assignClientToEmail":
    case "attachEmailToRequest":
      return "email";
    case "prepareReplyDraft":
      return "reply_draft";
    case "runGmailSync":
    case "runEmailOpsCycle":
      return "gmail_sync";
    case "setEmailInboxBucket":
      return "email";
    case "writeDailySummary":
      return "daily_summary";
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

  if (action === "createRequest") {
    return null;
  }

  if (action === "createDeadline" && typeof input.requestId === "string") {
    return input.requestId;
  }

  if (action === "assignClientToEmail") {
    return null;
  }

  if (action === "attachEmailToRequest" && typeof input.requestId === "string") {
    return input.requestId;
  }

  if (
    (action === "createTask" ||
      action === "updateTask" ||
      action === "updateRequest" ||
      action === "addNoteToRequest") &&
    typeof input.requestId === "string"
  ) {
    return input.requestId;
  }

  if (action === "setEmailInboxBucket" && typeof input.emailId === "string") {
    return null;
  }

  if (action === "runGmailSync") {
    return null;
  }

  if (action === "runEmailOpsCycle") {
    return null;
  }

  if (action === "writeDailySummary") {
    return null;
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

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
}
