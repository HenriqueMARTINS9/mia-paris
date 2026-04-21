"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import { authorizeServerPermissions } from "@/features/auth/server-authorization";
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
  context?: AssistantMutationExecutionContext,
): Promise<RequestMutationResult> {
  const authorization = await authorizeServerPermissions(
    ["deadlines.create"],
    context?.authorizationOverride,
  );

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

  const actor = context?.actor ?? null;
  const auditActorId = actor?.actorUserId ?? authorization.actorId;
  const auditActorType = actor?.actorType ?? authorization.actorType;
  const auditSource = actor?.source ?? authorization.source;
  const auditPayload = buildDeadlineAuditPayload(payload, actor);

  const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
    "deadlines",
    payload,
    {
      select: "id,label",
    },
    context?.rest ?? undefined,
  );

  if (result.error) {
    await recordAuditEvent({
      action: "create_deadline",
      actorId: auditActorId,
      actorType: auditActorType,
      description: `Création de deadline impossible: ${result.error}`,
      entityId: input.requestId ?? null,
      entityType: "deadline",
      payload: auditPayload,
      requestId: input.requestId ?? null,
      scope: "deadlines.create",
      source: auditSource,
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
      actorId: auditActorId,
      actorType: auditActorType,
      description:
        "Aucune deadline n'a été créée. Vérifie les policies RLS et la structure de la table deadlines.",
      entityId: input.requestId ?? null,
      entityType: "deadline",
      payload: auditPayload,
      requestId: input.requestId ?? null,
      scope: "deadlines.create",
      source: auditSource,
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
    actorId: auditActorId,
    actorType: auditActorType,
    description: "Deadline créée.",
    entityId:
      typeof result.data[0]?.id === "string" ? result.data[0].id : input.requestId ?? null,
    entityType: "deadline",
    payload: auditPayload,
    requestId: input.requestId ?? null,
    scope: "deadlines.create",
    source: auditSource,
    status: "success",
  });

  return {
    ok: true,
    field: "deadline_at",
    message: "Deadline créée avec succès.",
  };
}

function buildDeadlineAuditPayload(
  payload: Record<string, unknown>,
  actor: AssistantMutationExecutionContext["actor"] | null,
) {
  if (!actor) {
    return payload;
  }

  return {
    ...payload,
    actorEmail: actor.actorEmail,
    actorType: actor.actorType,
    actorUserId: actor.actorUserId,
    source: actor.source,
  };
}
