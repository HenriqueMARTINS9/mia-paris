"use server";

import { revalidatePath } from "next/cache";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import {
  evaluateAutomationRulesLive,
  persistAutomationEvaluation,
} from "@/features/automations/engine";
import type { RunAutomationsResult } from "@/features/automations/types";
import { insertActivityLogViaRest } from "@/lib/activity-logs";

export async function runAutomationEvaluationAction(): Promise<RunAutomationsResult> {
  const authorization = await authorizeServerAction("automations.run");

  if (!authorization.ok) {
    return {
      createdCount: 0,
      message: authorization.message,
      ok: false,
      resolvedCount: 0,
      totalOpen: 0,
    };
  }

  const liveEvaluation = await evaluateAutomationRulesLive();

  if (liveEvaluation.error) {
    return {
      createdCount: 0,
      message: liveEvaluation.error,
      ok: false,
      resolvedCount: 0,
      totalOpen: 0,
    };
  }

  const persistence = await persistAutomationEvaluation({
    alerts: liveEvaluation.alerts,
    mode: "manual",
    triggeredByUserId: authorization.actorId,
    warning: liveEvaluation.warning,
  });

  if (persistence.error) {
    return {
      createdCount: 0,
      message: persistence.error,
      ok: false,
      resolvedCount: 0,
      totalOpen: 0,
    };
  }

  await insertActivityLogViaRest({
    action: "automation_rules_evaluated",
    actorId: authorization.actorId,
    actorType: "user",
    description: `${liveEvaluation.alerts.length} alertes ouvertes après évaluation manuelle.`,
    entityId: null,
    entityType: "automation",
    payload: {
      createdCount: persistence.createdCount,
      resolvedCount: persistence.resolvedCount,
      totalOpen: liveEvaluation.alerts.length,
      warning: liveEvaluation.warning,
    },
    requestId: null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/aujourdhui");
  revalidatePath("/a-traiter");
  revalidatePath("/emails");
  revalidatePath("/demandes");
  revalidatePath("/taches");
  revalidatePath("/deadlines");
  revalidatePath("/productions");
  revalidatePath("/", "layout");

  return {
    createdCount: persistence.createdCount,
    message:
      liveEvaluation.warning ??
      `${liveEvaluation.alerts.length} alertes métiers recalculées.`,
    ok: true,
    resolvedCount: persistence.resolvedCount,
    totalOpen: liveEvaluation.alerts.length,
  };
}
