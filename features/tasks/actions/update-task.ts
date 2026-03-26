"use server";

import { revalidatePath } from "next/cache";

import {
  mapUiPriorityToDatabasePriority,
  mapUiTaskStatusToDatabaseStatus,
  requestPriorityMeta,
  taskStatusMeta,
} from "@/features/tasks/metadata";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types";
import type { RequestMutationResult } from "@/features/requests/types";
import { supabaseRestPatch } from "@/lib/supabase/rest";

interface UpdateTaskStatusInput {
  taskId: string;
  status: TaskStatus;
  requestId?: string | null;
}

interface UpdateTaskPriorityInput {
  taskId: string;
  priority: TaskPriority;
  requestId?: string | null;
}

interface AssignTaskInput {
  taskId: string;
  assignedUserId: string;
  requestId?: string | null;
}

interface UpdateTaskDueDateInput {
  taskId: string;
  dueAt: string | null;
  requestId?: string | null;
}

export async function updateTaskStatusAction(
  input: UpdateTaskStatusInput,
): Promise<RequestMutationResult> {
  return updateTaskRecord(
    input.taskId,
    {
      status: mapUiTaskStatusToDatabaseStatus(input.status),
      updated_at: new Date().toISOString(),
    },
    {
      field: "status",
      requestId: input.requestId ?? null,
      successMessage: `Statut tâche mis à jour: ${taskStatusMeta[input.status].label}.`,
      taskId: input.taskId,
    },
  );
}

export async function updateTaskPriorityAction(
  input: UpdateTaskPriorityInput,
): Promise<RequestMutationResult> {
  return updateTaskRecord(
    input.taskId,
    {
      priority: mapUiPriorityToDatabasePriority(input.priority),
      updated_at: new Date().toISOString(),
    },
    {
      field: "priority",
      requestId: input.requestId ?? null,
      successMessage: `Priorité tâche mise à jour: ${requestPriorityMeta[input.priority].label}.`,
      taskId: input.taskId,
    },
  );
}

export async function assignTaskAction(
  input: AssignTaskInput,
): Promise<RequestMutationResult> {
  if (!input.assignedUserId) {
    return {
      ok: false,
      field: "assigned_user_id",
      message: "Sélectionne un responsable.",
    };
  }

  return updateTaskRecord(
    input.taskId,
    {
      assigned_user_id: input.assignedUserId,
      updated_at: new Date().toISOString(),
    },
    {
      field: "assigned_user_id",
      requestId: input.requestId ?? null,
      successMessage: "Responsable de la tâche mis à jour.",
      taskId: input.taskId,
    },
  );
}

export async function updateTaskDueDateAction(
  input: UpdateTaskDueDateInput,
): Promise<RequestMutationResult> {
  return updateTaskRecord(
    input.taskId,
    {
      due_at: input.dueAt ? new Date(`${input.dueAt}T09:00:00`).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    {
      field: "due_at",
      requestId: input.requestId ?? null,
      successMessage: "Échéance de la tâche mise à jour.",
      taskId: input.taskId,
    },
  );
}

async function updateTaskRecord(
  taskId: string,
  values: Record<string, unknown>,
  options: {
    field: RequestMutationResult["field"];
    requestId: string | null;
    successMessage: string;
    taskId: string;
  },
): Promise<RequestMutationResult> {
  if (!taskId) {
    return {
      ok: false,
      field: options.field,
      message: "Identifiant de tâche manquant.",
    };
  }

  const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
    "tasks",
    values,
    {
      id: `eq.${taskId}`,
      select: "id,request_id",
    },
  );

  if (result.error) {
    return {
      ok: false,
      field: options.field,
      message: getTaskMutationErrorMessage(result.error),
    };
  }

  if (!result.data || result.data.length === 0) {
    return {
      ok: false,
      field: options.field,
      message:
        "Aucune tâche n'a été mise à jour. Vérifie les policies RLS et la visibilité de la ligne.",
    };
  }

  revalidatePath("/taches");
  revalidatePath(`/taches/${options.taskId}`);
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

function getTaskMutationErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("policy")
  ) {
    return "Mise à jour refusée par Supabase RLS sur tasks.";
  }

  return `Mutation impossible sur tasks: ${message}`;
}
