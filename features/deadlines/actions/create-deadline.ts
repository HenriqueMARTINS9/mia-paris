"use server";

import { revalidatePath } from "next/cache";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import { notifyUrgentDeadline } from "@/features/notifications/lib/operational-notifications";
import { mapUiPriorityToDatabasePriority } from "@/features/deadlines/metadata";
import type { DeadlinePriority } from "@/features/deadlines/types";
import type { RequestMutationResult } from "@/features/requests/types";
import { recordAuditEvent } from "@/lib/action-runtime";
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
  const authorization = await authorizeServerAction("deadlines.create");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "deadline_at",
      message: authorization.message,
    };
  }

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
    await recordAuditEvent({
      action: "create_deadline",
      actorId: authorization.actorId,
      actorType: "user",
      description: `Création de deadline impossible: ${result.error}`,
      entityId: input.requestId ?? null,
      entityType: "deadline",
      payload,
      requestId: input.requestId ?? null,
      scope: "deadlines.create",
      source: "ui",
      status: "failure",
    });

    return {
      ok: false,
      field: "deadline_at",
      message: `Création de deadline impossible: ${result.error}`,
    };
  }

  if (!result.data || result.data.length === 0) {
    await recordAuditEvent({
      action: "create_deadline",
      actorId: authorization.actorId,
      actorType: "user",
      description:
        "Aucune deadline n'a été créée. Vérifie les policies RLS et la structure de la table deadlines.",
      entityId: input.requestId ?? null,
      entityType: "deadline",
      payload,
      requestId: input.requestId ?? null,
      scope: "deadlines.create",
      source: "ui",
      status: "failure",
    });

    return {
      ok: false,
      field: "deadline_at",
      message:
        "Aucune deadline n'a été créée. Vérifie les policies RLS et la structure de la table deadlines.",
    };
  }

  revalidatePath("/deadlines");
  revalidatePath("/aujourdhui");
  if (input.requestId) {
    revalidatePath(`/requests/${input.requestId}`);
  }
  revalidatePath("/", "layout");

  await notifyUrgentDeadline({
    deadlineAt: payload.deadline_at as string,
    label: input.label.trim(),
    requestId: input.requestId,
  });

  await recordAuditEvent({
    action: "create_deadline",
    actorId: authorization.actorId,
    actorType: "user",
    description: "Deadline créée.",
    entityId:
      typeof result.data[0]?.id === "string" ? result.data[0].id : input.requestId ?? null,
    entityType: "deadline",
    payload,
    requestId: input.requestId ?? null,
    scope: "deadlines.create",
    source: "ui",
    status: "success",
  });

  return {
    ok: true,
    field: "deadline_at",
    message: "Deadline créée avec succès.",
  };
}
