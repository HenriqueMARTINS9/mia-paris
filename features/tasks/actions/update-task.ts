"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import {
  authorizeServerAction,
  authorizeServerPermissions,
} from "@/features/auth/server-authorization";
import { notifyCriticalTask } from "@/features/notifications/lib/operational-notifications";
import {
  mapUiPriorityToDatabasePriority,
  mapUiTaskStatusToDatabaseStatus,
  requestPriorityMeta,
  taskStatusMeta,
} from "@/features/tasks/metadata";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types";
import type { RequestMutationResult } from "@/features/requests/types";
import { readString } from "@/lib/record-helpers";
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
  context?: AssistantMutationExecutionContext,
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
    context,
  );
}

export async function updateTaskPriorityAction(
  input: UpdateTaskPriorityInput,
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  return updateTaskRecord(
    input.taskId,
    {
      priority: mapUiPriorityToDatabasePriority(input.priority),
      updated_at: new Date().toISOString(),
    },
    {
      field: "priority",
      onSuccess:
        input.priority === "critical"
          ? async (record) => {
              await notifyCriticalTask({
                dueAt: readString(record, ["due_at"]) ?? null,
                requestId:
                  readString(record, ["request_id"]) ?? input.requestId ?? null,
                title: readString(record, ["title"]) ?? "Tâche critique",
              });
            }
          : undefined,
      requestId: input.requestId ?? null,
      successMessage: `Priorité tâche mise à jour: ${requestPriorityMeta[input.priority].label}.`,
      taskId: input.taskId,
    },
    context,
  );
}

export async function assignTaskAction(
  input: AssignTaskInput,
  context?: AssistantMutationExecutionContext,
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
    context,
  );
}

export async function updateTaskDueDateAction(
  input: UpdateTaskDueDateInput,
  context?: AssistantMutationExecutionContext,
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
    context,
  );
}

async function updateTaskRecord(
  taskId: string,
  values: Record<string, unknown>,
  options: {
    field: RequestMutationResult["field"];
    onSuccess?: (record: Record<string, unknown>) => Promise<void>;
    requestId: string | null;
    successMessage: string;
    taskId: string;
  },
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  if (!taskId) {
    return {
      ok: false,
      field: options.field,
      message: "Identifiant de tâche manquant.",
    };
  }

  const authorization = context?.authorizationOverride
    ? await authorizeServerPermissions(["tasks.update"], context.authorizationOverride)
    : await authorizeServerAction("tasks.update");

  if (!authorization.ok) {
    return {
      ok: false,
      field: options.field,
      message: authorization.message,
    };
  }

  const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
    "tasks",
    values,
    {
      id: `eq.${taskId}`,
      select: "id,request_id,title,due_at",
    },
    context?.rest ?? undefined,
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

  if (options.onSuccess) {
    await options.onSuccess(result.data[0] ?? {});
  }

  revalidatePath("/taches");
  revalidatePath("/aujourdhui");
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
