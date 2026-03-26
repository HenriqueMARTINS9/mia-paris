"use server";

import { revalidatePath } from "next/cache";

import {
  deadlineStatusMeta,
  mapUiDeadlineStatusToDatabaseStatus,
  mapUiPriorityToDatabasePriority,
  requestPriorityMeta,
} from "@/features/deadlines/metadata";
import type { DeadlinePriority, DeadlineStatus } from "@/features/deadlines/types";
import type { RequestMutationResult } from "@/features/requests/types";
import { supabaseRestPatch } from "@/lib/supabase/rest";

interface UpdateDeadlinePriorityInput {
  deadlineId: string;
  priority: DeadlinePriority;
  requestId?: string | null;
}

interface MarkDeadlineAsDoneInput {
  deadlineId: string;
  requestId?: string | null;
}

interface UpdateDeadlineStatusInput {
  deadlineId: string;
  requestId?: string | null;
  status: DeadlineStatus;
}

export async function updateDeadlinePriorityAction(
  input: UpdateDeadlinePriorityInput,
): Promise<RequestMutationResult> {
  return updateDeadlineRecord(
    input.deadlineId,
    {
      priority: mapUiPriorityToDatabasePriority(input.priority),
      updated_at: new Date().toISOString(),
    },
    {
      deadlineId: input.deadlineId,
      field: "priority",
      requestId: input.requestId ?? null,
      successMessage: `Priorité deadline mise à jour: ${requestPriorityMeta[input.priority].label}.`,
    },
  );
}

export async function updateDeadlineStatusAction(
  input: UpdateDeadlineStatusInput,
): Promise<RequestMutationResult> {
  return updateDeadlineRecord(
    input.deadlineId,
    {
      status: mapUiDeadlineStatusToDatabaseStatus(input.status),
      updated_at: new Date().toISOString(),
    },
    {
      deadlineId: input.deadlineId,
      field: "status",
      requestId: input.requestId ?? null,
      successMessage: `Statut deadline mis à jour: ${deadlineStatusMeta[input.status].label}.`,
    },
  );
}

export async function markDeadlineAsDoneAction(
  input: MarkDeadlineAsDoneInput,
): Promise<RequestMutationResult> {
  return updateDeadlineStatusAction({
    deadlineId: input.deadlineId,
    requestId: input.requestId ?? null,
    status: "done",
  });
}

async function updateDeadlineRecord(
  deadlineId: string,
  values: Record<string, unknown>,
  options: {
    deadlineId: string;
    field: RequestMutationResult["field"];
    requestId: string | null;
    successMessage: string;
  },
): Promise<RequestMutationResult> {
  if (!deadlineId) {
    return {
      ok: false,
      field: options.field,
      message: "Identifiant de deadline manquant.",
    };
  }

  const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
    "deadlines",
    values,
    {
      id: `eq.${deadlineId}`,
      select: "id,request_id",
    },
  );

  if (result.error) {
    return {
      ok: false,
      field: options.field,
      message: getDeadlineMutationErrorMessage(result.error),
    };
  }

  if (!result.data || result.data.length === 0) {
    return {
      ok: false,
      field: options.field,
      message:
        "Aucune deadline n'a été mise à jour. Vérifie les policies RLS et la visibilité de la ligne.",
    };
  }

  revalidatePath("/deadlines");
  if (options.requestId) {
    revalidatePath(`/requests/${options.requestId}`);
  }
  revalidatePath("/", "layout");

  return {
    ok: true,
    field: options.field,
    message: options.successMessage,
  };
}

function getDeadlineMutationErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("policy")
  ) {
    return "Mise à jour refusée par Supabase RLS sur deadlines.";
  }

  return `Mutation impossible sur deadlines: ${message}`;
}
