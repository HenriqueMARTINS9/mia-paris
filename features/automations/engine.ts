import "server-only";

import { getDeadlinesPageData } from "@/features/deadlines/queries";
import { getEmailsPageData } from "@/features/emails/queries";
import { getProductionsPageData } from "@/features/productions/queries";
import { getRequestsOverviewPageData } from "@/features/requests/queries";
import { getTasksPageData } from "@/features/tasks/queries";
import { automationRuleCatalog } from "@/features/automations/rules";
import type {
  AutomationAlertDraft,
  AutomationAlertItem,
  AutomationOverviewData,
  AutomationPriority,
  AutomationRunItem,
} from "@/features/automations/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readString } from "@/lib/record-helpers";
import type {
  AutomationAlertRecord,
  AutomationRunRecord,
  DocumentRecord,
  ValidationRecord,
} from "@/types/crm";

const HOUR = 60 * 60 * 1000;

export async function evaluateAutomationRulesLive() {
  const [
    requestsData,
    tasksData,
    deadlinesData,
    productionsData,
    emailsData,
    validationsResult,
    documentsResult,
  ] = await Promise.all([
    getRequestsOverviewPageData(),
    getTasksPageData(),
    getDeadlinesPageData(),
    getProductionsPageData(),
    getEmailsPageData(),
    supabaseRestSelectList<ValidationRecord>("validations", {
      order: "updated_at.desc.nullslast,created_at.desc.nullslast",
      select: "*",
    }),
    supabaseRestSelectList<DocumentRecord>("documents", {
      order: "updated_at.desc.nullslast,created_at.desc.nullslast",
      select: "*",
    }),
  ]);

  const warnings = [
    requestsData.error,
    tasksData.error,
    deadlinesData.error,
    productionsData.error,
    emailsData.error,
    collectOptionalError("validations", validationsResult.error, validationsResult.rawError),
    collectOptionalError("documents", documentsResult.error, documentsResult.rawError),
  ].filter((value): value is string => Boolean(value));

  const documents = documentsResult.data ?? [];
  const requestIdsWithDocuments = new Set(
    documents
      .map((document) => readString(document, ["request_id", "requestId"]))
      .filter((value): value is string => Boolean(value)),
  );

  const requestsById = new Map(
    requestsData.requests.map((request) => [request.id, request] as const),
  );

  const alerts: AutomationAlertDraft[] = [];

  for (const request of requestsData.requests) {
    if (!isClosedRequest(request.status) && isOlderThan(request.lastInboundAt, 48)) {
      alerts.push({
        clientName: request.clientName,
        entityId: request.id,
        entityType: "request",
        lane: automationRuleCatalog.request_stale.lane,
        linkHref: `/requests/${request.id}`,
        nextAction: automationRuleCatalog.request_stale.nextAction,
        priority: automationRuleCatalog.request_stale.priority,
        reason: `Aucune mise à jour visible depuis ${formatAge(request.lastInboundAt)}.`,
        requestId: request.id,
        ruleKey: "request_stale",
        subtitle: `${request.requestTypeLabel} · ${request.owner}`,
        title: request.title,
      });
    }

    if (!isClosedRequest(request.status) && request.owner === "Non assigné") {
      alerts.push({
        clientName: request.clientName,
        entityId: request.id,
        entityType: "request",
        lane: automationRuleCatalog.request_unassigned.lane,
        linkHref: `/requests/${request.id}`,
        nextAction: automationRuleCatalog.request_unassigned.nextAction,
        priority: automationRuleCatalog.request_unassigned.priority,
        reason: "Aucun owner métier n’est encore défini sur cette demande.",
        requestId: request.id,
        ruleKey: "request_unassigned",
        subtitle: request.requestTypeLabel,
        title: request.title,
      });
    }

    if (
      !isClosedRequest(request.status) &&
      !requestIdsWithDocuments.has(request.id) &&
      isOlderThan(request.lastInboundAt, 24)
    ) {
      alerts.push({
        clientName: request.clientName,
        entityId: request.id,
        entityType: "request",
        lane: automationRuleCatalog.request_missing_documents.lane,
        linkHref: `/requests/${request.id}`,
        nextAction: automationRuleCatalog.request_missing_documents.nextAction,
        priority: automationRuleCatalog.request_missing_documents.priority,
        reason: "Aucun document métier n’est encore rattaché à ce dossier actif.",
        requestId: request.id,
        ruleKey: "request_missing_documents",
        subtitle: request.requestTypeLabel,
        title: request.title,
      });
    }
  }

  const duplicateGroups = new Map<string, string[]>();

  for (const request of requestsData.requests) {
    if (isClosedRequest(request.status)) {
      continue;
    }

    const signature = [
      request.clientName.trim().toLowerCase(),
      request.requestType.trim().toLowerCase(),
      normalizeSignature(request.title),
    ].join("::");

    const currentIds = duplicateGroups.get(signature) ?? [];
    currentIds.push(request.id);
    duplicateGroups.set(signature, currentIds);
  }

  for (const request of requestsData.requests) {
    const signature = [
      request.clientName.trim().toLowerCase(),
      request.requestType.trim().toLowerCase(),
      normalizeSignature(request.title),
    ].join("::");
    const groupIds = duplicateGroups.get(signature) ?? [];

    if (groupIds.length < 2) {
      continue;
    }

    alerts.push({
      clientName: request.clientName,
      entityId: request.id,
      entityType: "request",
      lane: automationRuleCatalog.request_probable_duplicate.lane,
      linkHref: `/requests/${request.id}`,
      metadata: {
        duplicateCount: groupIds.length,
        duplicateRequestIds: groupIds,
      },
      nextAction: automationRuleCatalog.request_probable_duplicate.nextAction,
      priority: automationRuleCatalog.request_probable_duplicate.priority,
      reason: `${groupIds.length} demandes très proches sont déjà ouvertes pour ce client.`,
      requestId: request.id,
      ruleKey: "request_probable_duplicate",
      subtitle: request.requestTypeLabel,
      title: request.title,
    });
  }

  for (const task of tasksData.tasks) {
    if (!task.isOverdue || task.status === "done") {
      continue;
    }

    alerts.push({
      clientName: task.clientName,
      entityId: task.id,
      entityType: "task",
      lane: automationRuleCatalog.task_overdue.lane,
      linkHref: `/taches/${task.id}`,
      metadata: {
        requestId: task.requestId,
      },
      nextAction: automationRuleCatalog.task_overdue.nextAction,
      priority: automationRuleCatalog.task_overdue.priority,
      reason: task.dueAt
        ? `Échéance dépassée depuis ${formatAge(task.dueAt)}.`
        : "Tâche prioritaire sans échéance fiable.",
      requestId: task.requestId,
      ruleKey: "task_overdue",
      subtitle: `${task.taskTypeLabel} · ${task.owner}`,
      title: task.title,
    });
  }

  for (const deadline of deadlinesData.deadlines) {
    if (deadline.status === "done" || !deadline.deadlineAt) {
      continue;
    }

    if (!deadline.isOverdue && !isDueWithin(deadline.deadlineAt, 24)) {
      continue;
    }

    alerts.push({
      clientName: deadline.clientName,
      entityId: deadline.id,
      entityType: "deadline",
      lane: automationRuleCatalog.deadline_critical.lane,
      linkHref: deadline.requestId ? `/requests/${deadline.requestId}` : "/deadlines",
      metadata: {
        requestId: deadline.requestId,
      },
      nextAction: automationRuleCatalog.deadline_critical.nextAction,
      priority: automationRuleCatalog.deadline_critical.priority,
      reason: deadline.isOverdue
        ? `Deadline en retard depuis ${formatAge(deadline.deadlineAt)}.`
        : `Deadline attendue ${formatAge(deadline.deadlineAt, true)}.`,
      requestId: deadline.requestId,
      ruleKey: "deadline_critical",
      subtitle: deadline.linkedObjectLabel,
      title: deadline.label,
    });
  }

  for (const production of productionsData.productions) {
    if (
      (production.isBlocked || Boolean(production.blockingReason)) &&
      isOlderThan(
        production.updatedAt ?? production.plannedEndAt ?? production.createdAt,
        24,
      )
    ) {
      alerts.push({
        clientName: production.clientName,
        entityId: production.id,
        entityType: "production",
        lane: automationRuleCatalog.production_blocked_too_long.lane,
        linkHref: "/productions",
        metadata: {
          requestId: production.requestId,
        },
        nextAction: automationRuleCatalog.production_blocked_too_long.nextAction,
        priority: automationRuleCatalog.production_blocked_too_long.priority,
        productionId: production.id,
        reason:
          production.blockingReason ??
          `Blocage visible depuis ${formatAge(
            production.updatedAt ?? production.createdAt,
          )}.`,
        requestId: production.requestId,
        ruleKey: "production_blocked_too_long",
        subtitle: `${production.modelName} · ${production.productionModeLabel}`,
        title: production.orderNumber,
      });
    }

    if (production.risk === "critical" || production.risk === "high") {
      alerts.push({
        clientName: production.clientName,
        entityId: `${production.id}:risk`,
        entityType: "production",
        lane: automationRuleCatalog.production_high_risk.lane,
        linkHref: "/productions",
        metadata: {
          requestId: production.requestId,
          risk: production.risk,
        },
        nextAction: automationRuleCatalog.production_high_risk.nextAction,
        priority:
          production.risk === "critical"
            ? "critical"
            : automationRuleCatalog.production_high_risk.priority,
        productionId: production.id,
        reason: `Niveau de risque ${production.risk} sur cette production.`,
        requestId: production.requestId,
        ruleKey: "production_high_risk",
        subtitle: `${production.modelName} · ${production.productionModeLabel}`,
        title: production.orderNumber,
      });
    }
  }

  for (const email of emailsData.emails) {
    if (email.status === "processed" || !isOlderThan(email.receivedAt, 8)) {
      continue;
    }

    alerts.push({
      clientName: email.clientName,
      entityId: email.id,
      entityType: "email",
      lane: automationRuleCatalog.email_unqualified_urgent.lane,
      linkHref: "/emails",
      metadata: {
        linkedRequestId: email.linkedRequestId,
      },
      nextAction: automationRuleCatalog.email_unqualified_urgent.nextAction,
      priority:
        email.status === "review"
          ? "high"
          : automationRuleCatalog.email_unqualified_urgent.priority,
      requestId: email.linkedRequestId,
      ruleKey: "email_unqualified_urgent",
      subtitle: `${email.fromName} · ${email.subject}`,
      title: email.subject,
      reason: `Email ${email.status === "review" ? "à revoir" : "non traité"} depuis ${formatAge(email.receivedAt)}.`,
    });
  }

  for (const validation of getSafeValidations(validationsResult)) {
    const status = readString(validation, ["status"])?.toLowerCase() ?? "pending";

    if (["done", "approved", "validated", "closed", "rejected"].includes(status)) {
      continue;
    }

    const updatedAt =
      readString(validation, ["updated_at", "validated_at", "created_at"]) ?? null;

    if (!isOlderThan(updatedAt, 72)) {
      continue;
    }

    const requestId = readString(validation, ["request_id", "requestId"]);
    const request = requestId ? requestsById.get(requestId) ?? null : null;
    const label =
      readString(validation, ["validation_type", "label", "title"]) ?? "Validation";

    alerts.push({
      clientName: request?.clientName ?? null,
      entityId: readString(validation, ["id"]) ?? `validation-${label}`,
      entityType: "validation",
      lane: automationRuleCatalog.validation_pending_too_long.lane,
      linkHref: requestId ? `/requests/${requestId}` : "/validations-ia",
      metadata: {
        requestId,
      },
      nextAction: automationRuleCatalog.validation_pending_too_long.nextAction,
      priority: automationRuleCatalog.validation_pending_too_long.priority,
      reason: `Validation pending depuis ${formatAge(updatedAt)}.`,
      requestId,
      ruleKey: "validation_pending_too_long",
      subtitle: request ? `${request.clientName} · ${request.title}` : "Sans demande liée",
      title: label,
    });
  }

  const now = new Date().toISOString();

  return {
    alerts: dedupeAlerts(alerts)
      .sort(sortAlertDrafts)
      .map((alert) => ({
        ...alert,
        detectedAt: now,
        id: `${alert.ruleKey}:${alert.entityType}:${alert.entityId}`,
        lastSeenAt: now,
        ruleLabel: automationRuleCatalog[alert.ruleKey].label,
        source: "live" as const,
        status: "open" as const,
      })),
    error: null,
    warning: warnings.join(" · ") || null,
  };
}

export async function getAutomationRuns(limit = 8): Promise<{
  error: string | null;
  runs: AutomationRunItem[];
}> {
  const result = await supabaseRestSelectList<AutomationRunRecord>("automation_runs", {
    limit,
    order: "created_at.desc.nullslast",
    select: "*",
  });

  if (result.error) {
    if (isMissingSupabaseResourceError(result.rawError)) {
      return {
        error: null,
        runs: [],
      };
    }

    return {
      error: result.error,
      runs: [],
    };
  }

  return {
    error: null,
    runs: (result.data ?? []).map(mapAutomationRunRecord),
  };
}

export async function getStoredAutomationAlerts(): Promise<{
  error: string | null;
  alerts: AutomationAlertItem[];
}> {
  const result = await supabaseRestSelectList<AutomationAlertRecord>("automation_alerts", {
    limit: 120,
    order: "priority.asc,last_seen_at.desc.nullslast",
    select: "*",
    status: "eq.open",
  });

  if (result.error) {
    if (isMissingSupabaseResourceError(result.rawError)) {
      return {
        alerts: [],
        error: null,
      };
    }

    return {
      alerts: [],
      error: result.error,
    };
  }

  return {
    alerts: (result.data ?? []).map(mapAutomationAlertRecord),
    error: null,
  };
}

export async function persistAutomationEvaluation(options: {
  alerts: AutomationAlertItem[];
  mode?: string;
  warning?: string | null;
  triggeredByUserId?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const openAlertsResult = await supabase
    .from("automation_alerts" as never)
    .select("*")
    .eq("status", "open");

  if (openAlertsResult.error) {
    if (openAlertsResult.error.code === "42P01") {
      return {
        createdCount: 0,
        error: null,
        resolvedCount: 0,
      };
    }

    return {
      createdCount: 0,
      error: openAlertsResult.error.message,
      resolvedCount: 0,
    };
  }

  const existingAlerts = openAlertsResult.data ?? [];
  const existingByKey = new Map(
    existingAlerts.map((record) => [
      buildAutomationKey(
        readString(record, ["rule_key"]) ?? "",
        readString(record, ["entity_type"]) ?? "",
        readString(record, ["entity_id"]) ?? "",
      ),
      record,
    ]),
  );

  const now = new Date().toISOString();
  const currentKeys = new Set<string>();

  const upsertPayload = options.alerts.map((alert) => {
    const key = buildAutomationKey(alert.ruleKey, alert.entityType, alert.entityId);
    currentKeys.add(key);
    const existing = existingByKey.get(key);

    return {
      client_id: alert.clientId ?? null,
      client_name: alert.clientName ?? null,
      created_at: readString(existing, ["created_at"]) ?? now,
      detected_at: readString(existing, ["detected_at"]) ?? alert.detectedAt ?? now,
      entity_id: alert.entityId,
      entity_type: alert.entityType,
      id: readString(existing, ["id"]) ?? undefined,
      lane: alert.lane,
      last_seen_at: now,
      link_href: alert.linkHref,
      metadata: alert.metadata ?? null,
      model_id: alert.modelId ?? null,
      next_action: alert.nextAction,
      priority: alert.priority,
      production_id: alert.productionId ?? null,
      reason: alert.reason,
      request_id: alert.requestId ?? null,
      resolved_at: null,
      rule_key: alert.ruleKey,
      rule_label: alert.ruleLabel,
      status: "open",
      subtitle: alert.subtitle,
      title: alert.title,
      updated_at: now,
    };
  });

  if (upsertPayload.length > 0) {
    const { error } = await supabase
      .from("automation_alerts" as never)
      .upsert(upsertPayload as never[], {
        onConflict: "rule_key,entity_type,entity_id",
      });

    if (error) {
      return {
        createdCount: 0,
        error: error.message,
        resolvedCount: 0,
      };
    }
  }

  const resolvedIds = existingAlerts
    .filter((record) => {
      const key = buildAutomationKey(
        readString(record, ["rule_key"]) ?? "",
        readString(record, ["entity_type"]) ?? "",
        readString(record, ["entity_id"]) ?? "",
      );

      return !currentKeys.has(key);
    })
    .map((record) => readString(record, ["id"]))
    .filter((value): value is string => Boolean(value));

  if (resolvedIds.length > 0) {
    const { error } = await supabase
      .from("automation_alerts" as never)
      .update({
        resolved_at: now,
        status: "resolved",
        updated_at: now,
      } as never)
      .in("id", resolvedIds);

    if (error) {
      return {
        createdCount: 0,
        error: error.message,
        resolvedCount: 0,
      };
    }
  }

  const existingOpenCount = existingAlerts.length;
  const createdCount = Math.max(options.alerts.length - existingOpenCount + resolvedIds.length, 0);

  const { error: runError } = await supabase
    .from("automation_runs" as never)
    .insert({
      created_at: now,
      created_count: createdCount,
      decide_open: options.alerts.filter((alert) => alert.lane === "decide").length,
      error_message: null,
      finished_at: now,
      message:
        options.warning ??
        `${options.alerts.length} alertes opérationnelles évaluées.`,
      metadata: {
        warning: options.warning ?? null,
      },
      mode: options.mode ?? "manual",
      ok: true,
      process_open: options.alerts.filter((alert) => alert.lane === "process").length,
      resolved_count: resolvedIds.length,
      started_at: now,
      total_open: options.alerts.length,
      triggered_by_user_id: options.triggeredByUserId ?? null,
    } as never);

  return {
    createdCount,
    error: runError?.code === "42P01" ? null : runError?.message ?? null,
    resolvedCount: resolvedIds.length,
  };
}

export async function getAutomationOverviewData(): Promise<AutomationOverviewData> {
  const [liveEvaluation, runsResult, storedAlertsResult] = await Promise.all([
    evaluateAutomationRulesLive(),
    getAutomationRuns(),
    getStoredAutomationAlerts(),
  ]);

  const latestRun = runsResult.runs[0] ?? null;
  const alerts = liveEvaluation.alerts.length > 0 ? liveEvaluation.alerts : storedAlertsResult.alerts;

  return {
    alerts,
    error:
      liveEvaluation.error ??
      storedAlertsResult.error ??
      runsResult.error,
    latestRun,
    runs: runsResult.runs,
    rules: Object.values(automationRuleCatalog),
    summary: {
      criticalCount: alerts.filter((alert) => alert.priority === "critical").length,
      decideOpen: alerts.filter((alert) => alert.lane === "decide").length,
      highCount: alerts.filter((alert) => alert.priority === "high").length,
      lastRunAt: latestRun?.createdAt ?? null,
      processOpen: alerts.filter((alert) => alert.lane === "process").length,
      totalOpen: alerts.length,
    },
    warning:
      [liveEvaluation.warning, storedAlertsResult.error, runsResult.error]
        .filter(Boolean)
        .join(" · ") || null,
  };
}

function mapAutomationAlertRecord(record: AutomationAlertRecord): AutomationAlertItem {
  const ruleKey = (readString(record, ["rule_key"]) ?? "request_stale") as AutomationAlertItem["ruleKey"];

  return {
    clientId: readString(record, ["client_id"]),
    clientName: readString(record, ["client_name"]),
    detectedAt:
      readString(record, ["detected_at", "created_at", "updated_at"]) ??
      new Date().toISOString(),
    entityId: readString(record, ["entity_id"]) ?? record.id,
    entityType: readString(record, ["entity_type"]) ?? "request",
    id: record.id,
    lane: (readString(record, ["lane"]) ?? "process") as AutomationAlertItem["lane"],
    lastSeenAt:
      readString(record, ["last_seen_at", "updated_at", "detected_at"]) ??
      new Date().toISOString(),
    linkHref: readString(record, ["link_href"]),
    metadata:
      typeof record.metadata === "object" && record.metadata !== null && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : null,
    modelId: readString(record, ["model_id"]),
    nextAction: readString(record, ["next_action"]) ?? "Ouvrir la fiche liée",
    priority: (readString(record, ["priority"]) ?? "normal") as AutomationPriority,
    productionId: readString(record, ["production_id"]),
    reason: readString(record, ["reason"]) ?? "Alerte métier",
    requestId: readString(record, ["request_id"]),
    ruleKey,
    ruleLabel:
      readString(record, ["rule_label"]) ??
      automationRuleCatalog[ruleKey]?.label ??
      "Règle métier",
    source: "stored",
    status: (readString(record, ["status"]) ?? "open") as AutomationAlertItem["status"],
    subtitle: readString(record, ["subtitle"]),
    title: readString(record, ["title"]) ?? "Alerte métier",
  };
}

function mapAutomationRunRecord(record: AutomationRunRecord): AutomationRunItem {
  return {
    createdAt:
      readString(record, ["created_at", "finished_at", "started_at"]) ??
      new Date().toISOString(),
    createdCount: Number(record.created_count ?? 0),
    decideOpen: Number(record.decide_open ?? 0),
    errorMessage: readString(record, ["error_message"]),
    id: record.id,
    message: readString(record, ["message"]),
    ok: Boolean(record.ok ?? true),
    processOpen: Number(record.process_open ?? 0),
    resolvedCount: Number(record.resolved_count ?? 0),
    totalOpen: Number(record.total_open ?? 0),
  };
}

function getSafeValidations(
  result: Awaited<ReturnType<typeof supabaseRestSelectList<ValidationRecord>>>,
) {
  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as ValidationRecord[];
  }

  return result.data ?? [];
}

function collectOptionalError(
  label: string,
  error: string | null,
  rawError: { code?: string; message?: string } | null,
) {
  if (!error || isMissingSupabaseResourceError(rawError)) {
    return null;
  }

  return `${label}: ${error}`;
}

function isClosedRequest(status: string) {
  return ["approved", "in_production"].includes(status);
}

function buildAutomationKey(ruleKey: string, entityType: string, entityId: string) {
  return `${ruleKey}:${entityType}:${entityId}`;
}

function normalizeSignature(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(re|fw|fwd|mia|paris|request|demande)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(" ");
}

function dedupeAlerts(alerts: AutomationAlertDraft[]) {
  const seen = new Set<string>();
  const deduped: AutomationAlertDraft[] = [];

  for (const alert of alerts) {
    const key = buildAutomationKey(alert.ruleKey, alert.entityType, alert.entityId);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(alert);
  }

  return deduped;
}

function sortAlertDrafts(left: AutomationAlertDraft, right: AutomationAlertDraft) {
  const priorityDiff = priorityWeight(right.priority) - priorityWeight(left.priority);

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const leftTime = deriveAlertTimestamp(left);
  const rightTime = deriveAlertTimestamp(right);

  return rightTime - leftTime;
}

function priorityWeight(value: AutomationPriority) {
  if (value === "critical") {
    return 3;
  }

  if (value === "high") {
    return 2;
  }

  return 1;
}

function isOlderThan(value: string | null | undefined, hours: number) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) && Date.now() - time >= hours * HOUR;
}

function isDueWithin(value: string | null | undefined, hours: number) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return false;
  }

  const diff = time - Date.now();
  return diff >= 0 && diff <= hours * HOUR;
}

function formatAge(value: string | null | undefined, future = false) {
  if (!value) {
    return "date indisponible";
  }

  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return "date indisponible";
  }

  const diff = future ? time - Date.now() : Date.now() - time;
  const hours = Math.round(diff / HOUR);

  if (hours < 24) {
    return future ? `dans ${Math.max(hours, 1)}h` : `${Math.max(hours, 1)}h`;
  }

  const days = Math.round(hours / 24);
  return future ? `dans ${Math.max(days, 1)}j` : `${Math.max(days, 1)}j`;
}

function deriveAlertTimestamp(alert: AutomationAlertDraft) {
  const candidate = [
    typeof alert.metadata?.updatedAt === "string" ? alert.metadata.updatedAt : null,
    typeof alert.metadata?.dueAt === "string" ? alert.metadata.dueAt : null,
    typeof alert.metadata?.receivedAt === "string" ? alert.metadata.receivedAt : null,
  ].find((value): value is string => Boolean(value));

  if (!candidate) {
    return 0;
  }

  const timestamp = new Date(candidate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
