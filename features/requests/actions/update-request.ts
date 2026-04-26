"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import type { RequestNoteField } from "@/features/requests/detail-types";
import {
  authorizeServerAction,
  authorizeServerPermissions,
} from "@/features/auth/server-authorization";
import {
  mapUiPriorityToDatabasePriority,
  mapUiStatusToDatabaseStatus,
  requestPriorityMeta,
  requestStatusMeta,
} from "@/features/requests/metadata";
import { getCurrentUserContext } from "@/features/auth/queries";
import type {
  RequestMutationResult,
  RequestPriority,
  RequestStatus,
} from "@/features/requests/types";
import {
  isMissingSupabaseColumnError,
  supabaseRestPatch,
  supabaseRestSelectMaybeSingle,
} from "@/lib/supabase/rest";
import { recordAuditEvent } from "@/lib/action-runtime";
import type { RequestRecord } from "@/types/crm";

interface UpdateRequestStatusInput {
  requestId: string;
  requestType: string;
  status: RequestStatus;
}

interface UpdateRequestPriorityInput {
  requestId: string;
  priority: RequestPriority;
}

interface AssignRequestInput {
  requestId: string;
  assignedUserId: string;
}

interface AppendRequestNoteInput {
  note: string;
  noteField: RequestNoteField | null;
  requestId: string;
}

export async function updateRequestStatusAction(
  input: UpdateRequestStatusInput,
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  if (!input.requestId) {
    return {
      ok: false,
      field: "status",
      message: "Identifiant de demande manquant.",
    };
  }

  const databaseStatus = mapUiStatusToDatabaseStatus(
    input.status,
    input.requestType,
  );

  return updateRequestRecord(
    input.requestId,
    {
      status: databaseStatus,
      updated_at: new Date().toISOString(),
    },
    {
      field: "status",
      successMessage: `Statut mis à jour: ${requestStatusMeta[input.status].label}.`,
    },
    context,
  );
}

export async function updateRequestPriorityAction(
  input: UpdateRequestPriorityInput,
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  if (!input.requestId) {
    return {
      ok: false,
      field: "priority",
      message: "Identifiant de demande manquant.",
    };
  }

  return updateRequestRecord(
    input.requestId,
    {
      priority: mapUiPriorityToDatabasePriority(input.priority),
      updated_at: new Date().toISOString(),
    },
    {
      field: "priority",
      successMessage: `Priorité mise à jour: ${requestPriorityMeta[input.priority].label}.`,
    },
    context,
  );
}

export async function assignRequestAction(
  input: AssignRequestInput,
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  if (!input.requestId) {
    return {
      ok: false,
      field: "assigned_user_id",
      message: "Identifiant de demande manquant.",
    };
  }

  if (!input.assignedUserId) {
    return {
      ok: false,
      field: "assigned_user_id",
      message: "Sélectionne un utilisateur à assigner.",
    };
  }

  return updateRequestRecord(
    input.requestId,
    {
      assigned_user_id: input.assignedUserId,
      updated_at: new Date().toISOString(),
    },
    {
      field: "assigned_user_id",
      successMessage: "Demande réassignée avec succès.",
    },
    context,
  );
}

export async function markRequestAsProcessedAction(
  input: Pick<UpdateRequestStatusInput, "requestId" | "requestType">,
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  if (!input.requestId) {
    return {
      ok: false,
      field: "status",
      message: "Identifiant de demande manquant.",
    };
  }

  return updateRequestRecord(
    input.requestId,
    {
      status: mapUiStatusToDatabaseStatus("approved", input.requestType),
      updated_at: new Date().toISOString(),
    },
    {
      field: "status",
      successMessage: "Demande marquée comme traitée.",
    },
    context,
  );
}

export async function appendRequestNoteAction(
  input: AppendRequestNoteInput,
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  const authorization = await authorizeServerPermissions(
    ["requests.update"],
    context?.authorizationOverride,
  );

  if (!authorization.ok) {
    return {
      ok: false,
      field: "note",
      message: authorization.message,
    };
  }

  if (!input.requestId) {
    return {
      ok: false,
      field: "note",
      message: "Identifiant de demande manquant.",
    };
  }

  if (!input.noteField) {
    return {
      ok: false,
      field: "note",
      message:
        "Aucun champ note compatible n'a été détecté sur la table requests.",
    };
  }

  if (input.note.trim().length === 0) {
    return {
      ok: false,
      field: "note",
      message: "Saisis une note avant de l'enregistrer.",
    };
  }

  const currentRecord = await supabaseRestSelectMaybeSingle<Record<string, unknown>>(
    "requests",
    {
      id: `eq.${input.requestId}`,
      select: `id,${input.noteField}`,
    },
    context?.rest ?? undefined,
  );

  if (currentRecord.error) {
    return {
      ok: false,
      field: "note",
      message: getRequestMutationErrorMessage(currentRecord.error),
    };
  }

  if (!currentRecord.data) {
    return {
      ok: false,
      field: "note",
      message: getRequestMutationFallbackMessage(),
    };
  }

  const actor = context?.actor ?? null;
  const authorContext =
    actor ? null : await getCurrentUserContext().catch(() => null);
  const authorLabel =
    actor?.actorType === "assistant"
      ? "OpenClaw"
      : authorContext?.appUser?.full_name ??
        authorContext?.authUser.email ??
        "MIA PARIS";
  const currentValue =
    typeof currentRecord.data[input.noteField] === "string"
      ? (currentRecord.data[input.noteField] as string)
      : "";
  const nextValue = buildAppendedRequestNote(currentValue, input.note, authorLabel);

  const patchResult = await supabaseRestPatch<Array<Record<string, unknown>>>(
    "requests",
    {
      [input.noteField]: nextValue,
      updated_at: new Date().toISOString(),
    },
    {
      id: `eq.${input.requestId}`,
      select: "id",
    },
    context?.rest ?? undefined,
  );

  if (patchResult.error) {
    const message = isMissingSupabaseColumnError(patchResult.rawError)
      ? `Le champ ${input.noteField} n'est pas disponible sur requests.`
      : getRequestMutationErrorMessage(patchResult.error);

    return {
      ok: false,
      field: "note",
      message,
    };
  }

  if (!patchResult.data || patchResult.data.length === 0) {
    return {
      ok: false,
      field: "note",
      message: getRequestMutationFallbackMessage(),
    };
  }

  revalidatePath(`/requests/${input.requestId}`);
  revalidatePath("/demandes");
  revalidatePath("/", "layout");

  await recordAuditEvent({
    action: "add_note_to_request",
    actorId: actor?.actorUserId ?? authorization.actorId,
    actorType: actor?.actorType ?? authorization.actorType,
    description: "Note métier ajoutée sur la demande.",
    entityId: input.requestId,
    entityType: "request",
    payload: {
      actorEmail: actor?.actorEmail ?? null,
      noteField: input.noteField,
      notePreview: input.note.trim().slice(0, 220),
    },
    requestId: input.requestId,
    scope: "requests.add_note",
    source: actor?.source ?? authorization.source,
    status: "success",
  });

  return {
    ok: true,
    field: "note",
    message: "Note métier ajoutée avec succès.",
  };
}

async function updateRequestRecord(
  requestId: string,
  values: Partial<
    Pick<RequestRecord, "status" | "priority" | "assigned_user_id" | "updated_at">
  >,
  options: {
    field: RequestMutationResult["field"];
    successMessage: string;
  },
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  try {
    const authorization = context?.authorizationOverride
      ? await authorizeServerPermissions(
          ["requests.update"],
          context.authorizationOverride,
        )
      : await authorizeServerAction("requests.update");

    if (!authorization.ok) {
      return {
        ok: false,
        field: options.field,
        message: authorization.message,
      };
    }

    const result = await supabaseRestPatch<Array<Pick<RequestRecord, "id">>>(
      "requests",
      values,
      {
        id: `eq.${requestId}`,
        select: "id",
      },
      context?.rest ?? undefined,
    );

    if (result.error) {
      return {
        ok: false,
        field: options.field,
        message: getRequestMutationErrorMessage(result.error),
      };
    }

    if (!result.data || result.data.length === 0) {
      return {
        ok: false,
        field: options.field,
        message: getRequestMutationFallbackMessage(),
      };
    }

    revalidatePath("/demandes");
    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/", "layout");

    return {
      ok: true,
      field: options.field,
      message: options.successMessage,
    };
  } catch (error) {
    return {
      ok: false,
      field: options.field,
      message:
        error instanceof Error
          ? getRequestMutationErrorMessage(error.message)
          : "La mutation de la demande a échoué.",
    };
  }
}

function getRequestMutationErrorMessage(message: string) {
  if (message.includes("0 rows")) {
    return getRequestMutationFallbackMessage();
  }

  if (
    message.toLowerCase().includes("row-level security") ||
    message.toLowerCase().includes("permission denied") ||
    message.toLowerCase().includes("policy")
  ) {
    return "Mise à jour refusée par Supabase RLS. Vérifie les policies de la table requests pour l'utilisateur connecté.";
  }

  return `Mutation impossible sur requests: ${message}`;
}

function getRequestMutationFallbackMessage() {
  return "Aucune ligne n'a été mise à jour. Vérifie les policies RLS sur requests et les droits de l'utilisateur connecté.";
}

function buildAppendedRequestNote(
  currentValue: string,
  note: string,
  authorLabel: string,
) {
  const timestamp = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const nextEntry = `[${timestamp}] ${authorLabel} - ${note.trim()}`;

  if (currentValue.trim().length === 0) {
    return nextEntry;
  }

  return `${currentValue.trim()}\n\n${nextEntry}`;
}
