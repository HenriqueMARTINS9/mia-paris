"use server";

import { revalidatePath } from "next/cache";

import { mapUiPriorityToDatabasePriority } from "@/features/deadlines/metadata";
import type { DeadlinePriority } from "@/features/deadlines/types";
import type { RequestMutationResult } from "@/features/requests/types";
import { supabaseRestInsert } from "@/lib/supabase/rest";

interface CreateDeadlineInput {
  deadlineAt: string;
  label: string;
  priority: DeadlinePriority;
  requestId: string | null;
}

export async function createDeadlineAction(
  input: CreateDeadlineInput,
): Promise<RequestMutationResult> {
  if (input.label.trim().length < 3) {
    return {
      ok: false,
      field: "deadline_at",
      message: "Renseigne un libellé plus explicite pour la deadline.",
    };
  }

  if (!input.deadlineAt) {
    return {
      ok: false,
      field: "deadline_at",
      message: "Sélectionne une date de deadline.",
    };
  }

  const payload: Record<string, unknown> = {
    deadline_at: new Date(`${input.deadlineAt}T09:00:00`).toISOString(),
    label: input.label.trim(),
    priority: mapUiPriorityToDatabasePriority(input.priority),
    status: "open",
  };

  if (input.requestId) {
    payload.request_id = input.requestId;
  }

  const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
    "deadlines",
    payload,
    {
      select: "id,label",
    },
  );

  if (result.error) {
    return {
      ok: false,
      field: "deadline_at",
      message: `Création de deadline impossible: ${result.error}`,
    };
  }

  if (!result.data || result.data.length === 0) {
    return {
      ok: false,
      field: "deadline_at",
      message:
        "Aucune deadline n'a été créée. Vérifie les policies RLS et la structure de la table deadlines.",
    };
  }

  revalidatePath("/deadlines");
  if (input.requestId) {
    revalidatePath(`/requests/${input.requestId}`);
  }
  revalidatePath("/", "layout");

  return {
    ok: true,
    field: "deadline_at",
    message: "Deadline créée avec succès.",
  };
}
