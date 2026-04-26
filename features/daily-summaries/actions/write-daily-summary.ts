"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import { authorizeServerPermissions } from "@/features/auth/server-authorization";
import type {
  DailySummaryClientSection,
  WriteDailySummaryInput,
  WriteDailySummaryResult,
} from "@/features/daily-summaries/types";
import { recordAuditEvent } from "@/lib/action-runtime";
import { supabaseRestInsert } from "@/lib/supabase/rest";

export async function writeDailySummaryAction(
  input: WriteDailySummaryInput,
  context?: AssistantMutationExecutionContext,
): Promise<WriteDailySummaryResult> {
  const authorization = await authorizeServerPermissions(
    ["assistant.write.safe"],
    context?.authorizationOverride,
  );

  if (!authorization.ok) {
    return {
      clientCount: 0,
      generatedAt: new Date().toISOString(),
      message: authorization.message,
      ok: false,
      summaryDate: input.summaryDate ?? new Date().toISOString().slice(0, 10),
      summaryId: null,
      summaryTime: input.summaryTime ?? "00:00",
    };
  }

  const overview = input.overview.trim();

  if (overview.length < 12) {
    return createFailureResult(input, "Le résumé global doit être plus explicite.");
  }

  const clientSummaries = normalizeClientSummaries(input.clientSummaries);

  if (clientSummaries.length === 0) {
    return createFailureResult(input, "Ajoute au moins une section client au résumé.");
  }

  const generatedAt = normalizeGeneratedAt(input.generatedAt);
  const summaryDate = normalizeSummaryDate(input.summaryDate, generatedAt);
  const summaryTime = normalizeSummaryTime(input.summaryTime, generatedAt);
  const actor = context?.actor ?? null;
  const payload = {
    client_summaries: clientSummaries,
    created_by: actor?.actorUserId ?? authorization.actorId,
    generated_at: generatedAt,
    highlights: normalizeStringArray(input.highlights),
    next_actions: normalizeStringArray(input.nextActions),
    overview,
    risks: normalizeStringArray(input.risks),
    source: input.source ?? actor?.source ?? "assistant",
    summary_date: summaryDate,
    summary_time: summaryTime,
    title: input.title?.trim() || `Synthèse du ${summaryDate}`,
    updated_by: actor?.actorUserId ?? authorization.actorId,
  };

  const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
    "daily_summaries",
    payload,
    {
      select: "id,summary_date,summary_time,generated_at",
    },
    context?.rest ?? undefined,
  );

  if (result.error || !result.data || result.data.length === 0) {
    await recordAuditEvent({
      action: "assistant_write_daily_summary",
      actorId: actor?.actorUserId ?? authorization.actorId,
      actorType: actor?.actorType ?? authorization.actorType,
      description: `Écriture de synthèse impossible: ${result.error ?? "aucune ligne insérée."}`,
      entityId: summaryDate,
      entityType: "daily_summary",
      payload: buildAuditPayload(payload),
      requestId: null,
      scope: "daily_summaries.write",
      source: input.source ?? actor?.source ?? "assistant",
      status: "failure",
    });

    return {
      clientCount: clientSummaries.length,
      generatedAt,
      message: `Écriture de synthèse impossible: ${result.error ?? "aucune ligne insérée."}`,
      ok: false,
      summaryDate,
      summaryId: null,
      summaryTime,
    };
  }

  const summaryId =
    typeof result.data[0]?.id === "string" ? result.data[0].id : null;

  await recordAuditEvent({
    action: "assistant_write_daily_summary",
    actorId: actor?.actorUserId ?? authorization.actorId,
    actorType: actor?.actorType ?? authorization.actorType,
    description: "Synthèse quotidienne écrite dans le CRM.",
    entityId: summaryId ?? summaryDate,
    entityType: "daily_summary",
    payload: buildAuditPayload(payload),
    requestId: null,
    scope: "daily_summaries.write",
    source: input.source ?? actor?.source ?? "assistant",
    status: "success",
  });

  revalidatePath("/syntheses");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  return {
    clientCount: clientSummaries.length,
    generatedAt,
    message: "Synthèse quotidienne enregistrée.",
    ok: true,
    summaryDate,
    summaryId,
    summaryTime,
  };
}

function createFailureResult(
  input: WriteDailySummaryInput,
  message: string,
): WriteDailySummaryResult {
  const generatedAt = normalizeGeneratedAt(input.generatedAt);

  return {
    clientCount: 0,
    generatedAt,
    message,
    ok: false,
    summaryDate: normalizeSummaryDate(input.summaryDate, generatedAt),
    summaryId: null,
    summaryTime: normalizeSummaryTime(input.summaryTime, generatedAt),
  };
}

function normalizeClientSummaries(
  input: WriteDailySummaryInput["clientSummaries"],
): DailySummaryClientSection[] {
  return input
    .map((client) => ({
      clientName: client.clientName.trim(),
      decisions: normalizeStringArray(client.decisions),
      emailIds: normalizeStringArray(client.emailIds),
      highlights: normalizeStringArray(client.highlights),
      nextActions: normalizeStringArray(client.nextActions),
      requestIds: normalizeStringArray(client.requestIds),
      risks: normalizeStringArray(client.risks),
      summary: client.summary.trim(),
      taskIds: normalizeStringArray(client.taskIds),
    }))
    .filter((client) => client.clientName.length >= 2 && client.summary.length >= 6)
    .slice(0, 24);
}

function normalizeStringArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeGeneratedAt(value: string | null | undefined) {
  if (value) {
    const date = new Date(value);

    if (Number.isFinite(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeSummaryDate(value: string | null | undefined, generatedAt: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return generatedAt.slice(0, 10);
}

function normalizeSummaryTime(value: string | null | undefined, generatedAt: string) {
  if (value && /^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(generatedAt));
}

function buildAuditPayload(payload: Record<string, unknown>) {
  const clientSummaries = Array.isArray(payload.client_summaries)
    ? payload.client_summaries
    : [];

  return {
    clientCount: clientSummaries.length,
    generatedAt: payload.generated_at,
    overviewPreview:
      typeof payload.overview === "string" ? payload.overview.slice(0, 240) : null,
    source: payload.source,
    summaryDate: payload.summary_date,
    summaryTime: payload.summary_time,
    title: payload.title,
  };
}
