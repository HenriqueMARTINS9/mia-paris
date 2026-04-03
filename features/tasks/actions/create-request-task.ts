"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import { authorizeServerPermissions } from "@/features/auth/server-authorization";
import { notifyCriticalTask } from "@/features/notifications/lib/operational-notifications";
import type { RequestPriority, RequestMutationResult } from "@/features/requests/types";
import { mapUiPriorityToDatabasePriority } from "@/features/requests/metadata";
import { recordAuditEvent } from "@/lib/action-runtime";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";

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
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  const authorization = await authorizeServerPermissions(
    ["tasks.create"],
    context?.authorizationOverride,
  );

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

  const actor = context?.actor ?? null;
  const auditActorId = actor?.actorUserId ?? authorization.actorId;
  const auditActorType = actor?.actorType ?? authorization.actorType;
  const auditSource = actor?.source ?? authorization.source;
  const tracedPayload = applyTaskActorTrace(payload, actor);
  const result = await insertTaskWithFallback(
    tracedPayload,
    context?.rest ?? null,
  );

  if (result.error) {
    await recordAuditEvent({
      action: "create_task",
      actorId: auditActorId,
      actorType: auditActorType,
      description: `Création de tâche impossible: ${result.error}`,
      entityId: input.requestId ?? null,
      entityType: "task",
      payload: {
        actorEmail: actor?.actorEmail ?? null,
        ...tracedPayload,
      },
      requestId: input.requestId ?? null,
      scope: "tasks.create",
      source: auditSource,
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
      actorId: auditActorId,
      actorType: auditActorType,
      description:
        "Aucune tâche n'a été créée. Vérifie les policies RLS et la structure de la table tasks.",
      entityId: input.requestId ?? null,
      entityType: "task",
      payload: {
        actorEmail: actor?.actorEmail ?? null,
        ...tracedPayload,
      },
      requestId: input.requestId ?? null,
      scope: "tasks.create",
      source: auditSource,
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
    actorId: auditActorId,
    actorType: auditActorType,
    description: "Tâche CRM créée.",
    entityId:
      typeof result.data[0]?.id === "string" ? result.data[0].id : input.requestId ?? null,
    entityType: "task",
    payload: {
      actorEmail: actor?.actorEmail ?? null,
      ...tracedPayload,
    },
    requestId: input.requestId ?? null,
    scope: "tasks.create",
    source: auditSource,
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

async function insertTaskWithFallback(
  payload: Record<string, unknown>,
  restContext: AssistantMutationExecutionContext["rest"] | null,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      "tasks",
      currentPayload,
      {
        select: "id,title",
      },
      restContext ?? undefined,
    );

    if (!result.error) {
      return result;
    }

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.rawError);

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }
}

function applyTaskActorTrace(
  payload: Record<string, unknown>,
  actor: AssistantMutationExecutionContext["actor"] | null,
) {
  if (!actor) {
    return payload;
  }

  return {
    ...payload,
    actor_email: actor.actorEmail,
    actor_user_id: actor.actorUserId,
    created_by: actor.actorUserId,
    created_by_email: actor.actorEmail,
    created_by_type: actor.actorType,
    created_by_user_id: actor.actorUserId,
    source: actor.source,
    updated_by: actor.actorUserId,
    updated_by_email: actor.actorEmail,
    updated_by_type: actor.actorType,
    updated_by_user_id: actor.actorUserId,
  };
}

function extractMissingColumnName(error: SupabaseRestErrorPayload | null) {
  if (!error) {
    return null;
  }

  const haystack = [error.message, error.details, error.error, error.hint]
    .filter(Boolean)
    .join(" ");
  const match = haystack.match(/column ["']?([a-zA-Z0-9_]+)["']?/i);

  return match?.[1] ?? null;
}
