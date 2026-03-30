"use server";

import { revalidatePath } from "next/cache";

import type { RequestNoteField } from "@/features/requests/detail-types";
import { authorizeServerAction } from "@/features/auth/server-authorization";
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
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  isMissingSupabaseColumnError,
  supabaseRestPatch,
  supabaseRestSelectMaybeSingle,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  );
}

export async function updateRequestPriorityAction(
  input: UpdateRequestPriorityInput,
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
  );
}

export async function assignRequestAction(
  input: AssignRequestInput,
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
  );
}

export async function markRequestAsProcessedAction(
  input: Pick<UpdateRequestStatusInput, "requestId" | "requestType">,
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
  );
}

export async function appendRequestNoteAction(
  input: AppendRequestNoteInput,
): Promise<RequestMutationResult> {
  const authorization = await authorizeServerAction("requests.update");

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

  const authorContext = await getCurrentUserContext().catch(() => null);
  const authorLabel =
    authorContext?.appUser?.full_name ??
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
): Promise<RequestMutationResult> {
  try {
    const authorization = await authorizeServerAction("requests.update");

    if (!authorization.ok) {
      return {
        ok: false,
        field: options.field,
        message: authorization.message,
      };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        field: options.field,
        message:
          "Session Supabase introuvable. Reconnecte-toi pour modifier cette demande.",
      };
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return {
        ok: false,
        field: options.field,
        message:
          "Session Supabase expirée. Reconnecte-toi pour modifier cette demande.",
      };
    }

    const response = await fetch(buildRequestsMutationUrl(requestId), {
      method: "PATCH",
      headers: getRequestsMutationHeaders(session.access_token),
      body: JSON.stringify(values),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | Array<Pick<RequestRecord, "id">>
      | {
          message?: string;
          error?: string;
          details?: string;
          hint?: string;
        }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        field: options.field,
        message: getRequestMutationErrorMessage(
          getResponseErrorMessage(payload) ?? response.statusText,
        ),
      };
    }

    if (!Array.isArray(payload) || payload.length === 0) {
      return {
        ok: false,
        field: options.field,
        message: getRequestMutationFallbackMessage(),
      };
    }

    revalidatePath("/demandes");
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

function buildRequestsMutationUrl(requestId: string) {
  const { supabaseUrl } = getSupabaseEnv();
  const params = new URLSearchParams({
    id: `eq.${requestId}`,
    select: "id",
  });

  return `${supabaseUrl}/rest/v1/requests?${params.toString()}`;
}

function getRequestsMutationHeaders(accessToken: string) {
  const { supabasePublishableKey } = getSupabaseEnv();

  return {
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function getResponseErrorMessage(
  payload:
    | Array<Pick<RequestRecord, "id">>
    | {
        message?: string;
        error?: string;
        details?: string;
        hint?: string;
      }
    | null,
) {
  if (!payload || Array.isArray(payload)) {
    return null;
  }

  return payload.message ?? payload.error ?? payload.details ?? payload.hint ?? null;
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
