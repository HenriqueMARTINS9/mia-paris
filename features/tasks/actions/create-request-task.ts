"use server";

import { revalidatePath } from "next/cache";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import { notifyCriticalTask } from "@/features/notifications/lib/operational-notifications";
import type { RequestPriority, RequestMutationResult } from "@/features/requests/types";
import { mapUiPriorityToDatabasePriority } from "@/features/requests/metadata";
import { recordAuditEvent } from "@/lib/action-runtime";
import { supabaseRestInsert } from "@/lib/supabase/rest";

interface CreateRequestTaskInput {
  assignedUserId: string | null;
  dueAt: string | null;
  priority: RequestPriority;
  requestId: string | null;
  taskType: string;
  title: string;
}

export async function createTaskAction(
  input: CreateRequestTaskInput,
): Promise<RequestMutationResult> {
  const authorization = await authorizeServerAction("tasks.create");

  if (!authorization.ok) {
    return {
      ok: false,
      field: "task",
      message: authorization.message,
    };
  }

  if (input.title.trim().length < 3) {
    return {
      ok: false,
      field: "task",
      message: "Renseigne un intitulé de tâche plus explicite.",
    };
  }

  const payload: Record<string, unknown> = {
    priority: mapUiPriorityToDatabasePriority(input.priority),
    status: "open",
    task_type: input.taskType,
    title: input.title.trim(),
  };

  if (input.requestId) {
    payload.request_id = input.requestId;
  }

  if (input.assignedUserId) {
    payload.assigned_user_id = input.assignedUserId;
  }

  if (input.dueAt) {
    payload.due_at = new Date(`${input.dueAt}T09:00:00`).toISOString();
  }

  const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
    "tasks",
    payload,
    {
      select: "id,title",
    },
  );

  if (result.error) {
    await recordAuditEvent({
      action: "create_task",
      actorId: authorization.actorId,
      actorType: "user",
      description: `Création de tâche impossible: ${result.error}`,
      entityId: input.requestId ?? null,
      entityType: "task",
      payload,
      requestId: input.requestId ?? null,
      scope: "tasks.create",
      source: "ui",
      status: "failure",
    });

    return {
      ok: false,
      field: "task",
      message: `Création de tâche impossible: ${result.error}`,
    };
  }

  if (!result.data || result.data.length === 0) {
    await recordAuditEvent({
      action: "create_task",
      actorId: authorization.actorId,
      actorType: "user",
      description:
        "Aucune tâche n'a été créée. Vérifie les policies RLS et la structure de la table tasks.",
      entityId: input.requestId ?? null,
      entityType: "task",
      payload,
      requestId: input.requestId ?? null,
      scope: "tasks.create",
      source: "ui",
      status: "failure",
    });

    return {
      ok: false,
      field: "task",
      message:
        "Aucune tâche n'a été créée. Vérifie les policies RLS et la structure de la table tasks.",
    };
  }

  revalidatePath("/taches");
  revalidatePath("/aujourdhui");
  if (input.requestId) {
    revalidatePath(`/requests/${input.requestId}`);
  }
  revalidatePath("/", "layout");

  if (input.priority === "critical") {
    await notifyCriticalTask({
      dueAt: input.dueAt ? new Date(`${input.dueAt}T09:00:00`).toISOString() : null,
      requestId: input.requestId,
      title: input.title.trim(),
    });
  }

  await recordAuditEvent({
    action: "create_task",
    actorId: authorization.actorId,
    actorType: "user",
    description: "Tâche CRM créée.",
    entityId:
      typeof result.data[0]?.id === "string" ? result.data[0].id : input.requestId ?? null,
    entityType: "task",
    payload,
    requestId: input.requestId ?? null,
    scope: "tasks.create",
    source: "ui",
    status: "success",
  });

  return {
    ok: true,
    field: "task",
    message: "Tâche liée créée avec succès.",
  };
}

export async function createRequestTaskAction(
  input: CreateRequestTaskInput,
): Promise<RequestMutationResult> {
  if (!input.requestId) {
    return {
      ok: false,
      field: "task",
      message: "Identifiant de demande manquant.",
    };
  }

  return createTaskAction(input);
}
