import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getProductionsPageData } from "@/features/productions/queries";
import type { AnalyticsPageData } from "@/features/analytics/types";
import { logOperationalError } from "@/lib/action-runtime";
import { readString } from "@/lib/record-helpers";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import {
  createSupabaseServerClient,
  hasSupabaseEnv,
} from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type {
  DeadlineRecord,
  EmailRecord,
  RequestOverview,
  RequestRecord,
  TaskRecord,
  ValidationRecord,
} from "@/types/crm";

const MS_IN_HOUR = 1000 * 60 * 60;
const MS_IN_DAY = 1000 * 60 * 60 * 24;

export async function getAnalyticsOverviewData(): Promise<AnalyticsPageData> {
  noStore();

  const emptyData: AnalyticsPageData = {
    error: null,
    flowByDay: [],
    kpis: [],
    overdue: {
      items: [],
      missedDeadlinesCount: 0,
      overdueTasksCount: 0,
    },
    productionRisk: {
      blockedCount: 0,
      highRiskCount: 0,
      incidents: [],
    },
    requestsByClient: [],
    requestsByType: [],
    timing: {
      avgEmailToRequestHours: null,
      avgRequestToFirstTaskHours: null,
      medianEmailToRequestHours: null,
      requestToFirstTaskSampleSize: 0,
      sampleSize: 0,
    },
    validation: {
      averageHours: null,
      pendingCount: 0,
      sampleSize: 0,
      slowest: [],
    },
  };

  if (!hasSupabaseEnv) {
    return {
      ...emptyData,
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ...emptyData,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux analytics métier.",
      };
    }

    const [
      requestsOverviewResult,
      requestsTableResult,
      emailsResult,
      tasksResult,
      deadlinesResult,
      validationsResult,
      productionsData,
    ] = await Promise.all([
      supabase
        .from("v_requests_overview")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseRestSelectList<RequestRecord>("requests", {
        order: "created_at.desc.nullslast",
        select:
          "id,source_email_id,client_id,request_type,priority,status,created_at,due_at,assigned_user_id,updated_at",
      }),
      supabaseRestSelectList<EmailRecord>("emails", {
        order: "received_at.desc.nullslast,created_at.desc.nullslast",
        select:
          "id,subject,received_at,created_at,client_id,processing_status,is_processed",
      }),
      supabaseRestSelectList<TaskRecord>("tasks", {
        order: "created_at.desc.nullslast",
        select:
          "id,title,request_id,priority,status,due_at,created_at,updated_at",
      }),
      supabaseRestSelectList<DeadlineRecord>("deadlines", {
        order: "deadline_at.asc.nullslast",
        select: "id,label,request_id,priority,status,deadline_at,created_at,updated_at",
      }),
      supabaseRestSelectList<ValidationRecord>("validations", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
      getProductionsPageData(),
    ]);

    if (requestsOverviewResult.error) {
      return {
        ...emptyData,
        error: `Impossible de charger les analytics: ${requestsOverviewResult.error.message}`,
      };
    }

    const requestOverviewRows = (requestsOverviewResult.data ?? []) as RequestOverview[];
    const requestRows = requestsTableResult.data ?? [];
    const emailRows = emailsResult.data ?? [];
    const taskRows = tasksResult.data ?? [];
    const deadlineRows = deadlinesResult.data ?? [];
    const validationRows = getOptionalRows(validationsResult);

    const requestRowsById = new Map(requestOverviewRows.map((row) => [row.id, row] as const));
    const emailRowsById = new Map(emailRows.map((row) => [row.id, row] as const));
    const tasksByRequestId = groupRowsByKey(taskRows, ["request_id"]);

    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * MS_IN_DAY);

    const emailCountToday = emailRows.filter((row) =>
      isOnOrAfter(readString(row, ["received_at", "created_at"]), todayStart),
    ).length;
    const emailCountWeek = emailRows.filter((row) =>
      isOnOrAfter(readString(row, ["received_at", "created_at"]), sevenDaysAgo),
    ).length;
    const requestCountToday = requestRows.filter((row) =>
      isOnOrAfter(readString(row, ["created_at"]), todayStart),
    ).length;
    const requestCountWeek = requestRows.filter((row) =>
      isOnOrAfter(readString(row, ["created_at"]), sevenDaysAgo),
    ).length;

    const emailToRequestDurations = requestRows
      .map((request) => {
        const sourceEmailId = readString(request, ["source_email_id"]);
        const requestCreatedAt = readString(request, ["created_at"]);
        const emailReceivedAt = sourceEmailId
          ? readString(emailRowsById.get(sourceEmailId), ["received_at", "created_at"])
          : null;

        return diffHours(emailReceivedAt, requestCreatedAt);
      })
      .filter((value): value is number => value !== null);

    const requestToFirstTaskDurations = requestRows
      .map((request) => {
        const requestCreatedAt = readString(request, ["created_at"]);
        const tasks = tasksByRequestId.get(request.id) ?? [];
        const firstTaskCreatedAt = [...tasks]
          .map((task) => readString(task, ["created_at", "updated_at"]))
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null;

        return diffHours(requestCreatedAt, firstTaskCreatedAt);
      })
      .filter((value): value is number => value !== null);

    const overdueTasks = taskRows
      .filter((task) => isOpenTask(task) && isPast(readString(task, ["due_at"]), now))
      .sort((left, right) =>
        compareIsoAsc(readString(left, ["due_at"]), readString(right, ["due_at"])),
      );
    const missedDeadlines = deadlineRows.filter(
      (deadline) =>
        isOpenDeadline(deadline) && isPast(readString(deadline, ["deadline_at"]), now),
    );

    const flowByDay = buildFlowByDay({
      emails: emailRows,
      now,
      requests: requestRows,
    });

    const requestsByType = buildDistribution(
      requestOverviewRows.map((row) => ({
        id: row.id,
        label: humanize(row.request_type ?? "non_qualifie"),
        secondary: row.client_name ?? null,
      })),
      8,
    );

    const urgentClientCounts = countByLabel(
      requestOverviewRows.filter(
        (row) =>
          (row.priority ?? "").toLowerCase() === "critical" ||
          (row.priority ?? "").toLowerCase() === "high" ||
          (row.urgency_score ?? 0) >= 70,
      ),
      (row) => row.client_name ?? "Client non renseigné",
    );
    const requestsByClient = buildDistribution(
      requestOverviewRows.map((row) => {
        const clientLabel = row.client_name ?? "Client non renseigné";

        return {
          id: row.id,
          label: clientLabel,
          secondary: `${urgentClientCounts.get(clientLabel) ?? 0} urgentes`,
        };
      }),
      8,
    );

    const blockedProductionsCount = productionsData.productions.filter(
      (item) => item.isBlocked,
    ).length;
    const highRiskProductionsCount = productionsData.productions.filter(
      (item) => item.risk === "critical" || item.risk === "high",
    ).length;

    const completedValidations = validationRows
      .map((row) => {
        const createdAt = readString(row, ["created_at"]);
        const completedAt =
          readString(row, ["validated_at"]) ?? readString(row, ["updated_at"]);
        const duration = diffHours(createdAt, completedAt);
        const status = readString(row, ["status"]) ?? "pending";

        if (
          duration === null ||
          !["approved", "validated", "done", "rejected", "closed"].includes(
            status.toLowerCase(),
          )
        ) {
          return null;
        }

        return {
          duration,
          item: {
            id: row.id,
            label: humanize(readString(row, ["validation_type"]) ?? "validation"),
            status,
            turnaroundHours: duration,
            updatedAt: completedAt,
          },
        };
      })
      .filter(
        (
          value,
        ): value is {
          duration: number;
          item: AnalyticsPageData["validation"]["slowest"][number];
        } => value !== null,
      );

    return {
      error:
        [
          requestsTableResult.error,
          emailsResult.error,
          tasksResult.error,
          deadlinesResult.error,
          productionsData.error,
          validationsResult.error && !isMissingSupabaseResourceError(validationsResult.rawError)
            ? validationsResult.error
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      flowByDay,
      kpis: [
        {
          hint: "Lecture rapide du flux Gmail réellement absorbé dans l’application.",
          id: "emails-volume",
          label: "Emails entrants",
          secondary: `${emailCountWeek} sur 7 jours`,
          value: String(emailCountToday),
        },
        {
          hint: "Demandes créées depuis email ou manuellement sur le cockpit.",
          id: "requests-volume",
          label: "Requests créées",
          secondary: `${requestCountWeek} sur 7 jours`,
          value: String(requestCountToday),
        },
        {
          hint: "Temps moyen entre réception d’un email et création effective d’une demande.",
          id: "email-to-request",
          label: "Email → request",
          secondary: `${emailToRequestDurations.length} cas mesurés`,
          value: formatHours(average(emailToRequestDurations)),
        },
        {
          hint: "Temps moyen entre création de demande et première tâche réellement ouverte.",
          id: "request-to-task",
          label: "Request → 1re task",
          secondary: `${requestToFirstTaskDurations.length} cas mesurés`,
          value: formatHours(average(requestToFirstTaskDurations)),
        },
        {
          hint: "Retards concrets à traiter maintenant sur les workflows ouverts.",
          id: "overdue",
          label: "Tasks overdue",
          secondary: `${missedDeadlines.length} deadlines manquées`,
          tone: overdueTasks.length > 0 ? "critical" : "default",
          value: String(overdueTasks.length),
        },
        {
          hint: "Productions bloquées ou déjà classées à risque élevé.",
          id: "production-risk",
          label: "Productions à risque",
          secondary: `${highRiskProductionsCount} high risk`,
          tone: blockedProductionsCount > 0 ? "warning" : "default",
          value: String(blockedProductionsCount),
        },
      ],
      overdue: {
        items: overdueTasks.slice(0, 6).map((task) => {
          const requestId = readString(task, ["request_id"]);
          const request = requestId ? requestRowsById.get(requestId) : null;

          return {
            clientName:
              request?.client_name ?? "Client non renseigné",
            dueAt: readString(task, ["due_at"]),
            id: task.id,
            priority: humanize(readString(task, ["priority"]) ?? "normal"),
            title: readString(task, ["title"]) ?? "Tâche sans titre",
          };
        }),
        missedDeadlinesCount: missedDeadlines.length,
        overdueTasksCount: overdueTasks.length,
      },
      productionRisk: {
        blockedCount: blockedProductionsCount,
        highRiskCount: highRiskProductionsCount,
        incidents: productionsData.productions
          .filter((item) => item.isBlocked || item.risk === "critical" || item.risk === "high")
          .sort((left, right) => {
            if (left.isBlocked !== right.isBlocked) {
              return left.isBlocked ? -1 : 1;
            }

            return riskWeight(right.risk) - riskWeight(left.risk);
          })
          .slice(0, 6)
          .map((item) => ({
            blockingReason: item.blockingReason,
            clientName: item.clientName,
            id: item.id,
            label: item.orderNumber || item.modelName || "Production",
            risk: item.risk,
            status: item.status,
          })),
      },
      requestsByClient,
      requestsByType,
      timing: {
        avgEmailToRequestHours: average(emailToRequestDurations),
        avgRequestToFirstTaskHours: average(requestToFirstTaskDurations),
        medianEmailToRequestHours: median(emailToRequestDurations),
        requestToFirstTaskSampleSize: requestToFirstTaskDurations.length,
        sampleSize: emailToRequestDurations.length,
      },
      validation: {
        averageHours: average(completedValidations.map((item) => item.duration)),
        pendingCount: validationRows.filter((row) => isPendingValidation(row)).length,
        sampleSize: completedValidations.length,
        slowest: completedValidations
          .sort((left, right) => right.duration - left.duration)
          .slice(0, 6)
          .map((item) => item.item),
      },
    };
  } catch (error) {
    await logOperationalError({
      error,
      message: "Impossible de charger les analytics métier.",
      scope: "analytics.load",
    });

    return {
      ...emptyData,
      error:
        error instanceof Error
          ? `Impossible de charger les analytics: ${error.message}`
          : "Impossible de charger les analytics.",
    };
  }
}

function getOptionalRows<T>(
  result: Awaited<ReturnType<typeof supabaseRestSelectList<T>>>,
) {
  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as T[];
  }

  return result.data ?? [];
}

function buildFlowByDay(input: {
  emails: EmailRecord[];
  now: Date;
  requests: RequestRecord[];
}) {
  const start = new Date(startOfDay(input.now).getTime() - 6 * MS_IN_DAY);
  const rows = Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start.getTime() + index * MS_IN_DAY);
    const key = isoDateKey(current);

    return {
      emails: 0,
      label: formatDate(current.toISOString(), {
        day: "2-digit",
        month: "short",
      }),
      requests: 0,
      key,
    };
  });
  const rowByKey = new Map(rows.map((row) => [row.key, row]));

  for (const email of input.emails) {
    const key = isoDateKey(readString(email, ["received_at", "created_at"]));
    if (key && rowByKey.has(key)) {
      rowByKey.get(key)!.emails += 1;
    }
  }

  for (const request of input.requests) {
    const key = isoDateKey(readString(request, ["created_at"]));
    if (key && rowByKey.has(key)) {
      rowByKey.get(key)!.requests += 1;
    }
  }

  return rows.map(({ key, ...row }) => {
    void key;
    return row;
  });
}

function buildDistribution(
  rows: Array<{ id: string; label: string; secondary: string | null }>,
  limit: number,
) {
  const grouped = new Map<
    string,
    { count: number; label: string; secondary: string | null }
  >();

  for (const row of rows) {
    const key = row.label;
    const current = grouped.get(key) ?? {
      count: 0,
      label: row.label,
      secondary: row.secondary,
    };
    current.count += 1;
    current.secondary = current.secondary ?? row.secondary;
    grouped.set(key, current);
  }

  const total = rows.length;

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      count: value.count,
      id: key,
      label: value.label,
      secondary: value.secondary,
      share: total > 0 ? Math.round((value.count / total) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function groupRowsByKey<T extends Record<string, unknown>>(rows: T[], keys: string[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const key = readString(row, keys);

    if (!key) {
      continue;
    }

    const currentRows = grouped.get(key) ?? [];
    currentRows.push(row);
    grouped.set(key, currentRows);
  }

  return grouped;
}

function countByLabel<T>(rows: T[], getLabel: (row: T) => string) {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    const label = getLabel(row);
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }

  return grouped;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function diffHours(start: string | null, end: string | null) {
  if (!start || !end) {
    return null;
  }

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return null;
  }

  return Number(((endTime - startTime) / MS_IN_HOUR).toFixed(1));
}

function isOpenTask(task: TaskRecord) {
  const status = (readString(task, ["status"]) ?? "todo").toLowerCase();
  return status !== "done" && status !== "closed";
}

function isOpenDeadline(deadline: DeadlineRecord) {
  const status = (readString(deadline, ["status"]) ?? "open").toLowerCase();
  return status !== "done" && status !== "closed";
}

function isPendingValidation(validation: ValidationRecord) {
  const status = (readString(validation, ["status"]) ?? "pending").toLowerCase();
  return !["approved", "validated", "done", "rejected", "closed"].includes(status);
}

function isOnOrAfter(value: string | null, target: Date) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= target.getTime();
}

function isPast(value: string | null, now: Date) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) && time < now.getTime();
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isoDateKey(value: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function compareIsoAsc(left: string | null, right: string | null) {
  const leftTime = left ? new Date(left).getTime() : Number.POSITIVE_INFINITY;
  const rightTime = right ? new Date(right).getTime() : Number.POSITIVE_INFINITY;

  return leftTime - rightTime;
}

function riskWeight(value: string) {
  if (value === "critical") {
    return 4;
  }

  if (value === "high") {
    return 3;
  }

  if (value === "normal") {
    return 2;
  }

  return 1;
}

function formatHours(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (value < 24) {
    return `${Math.round(value * 10) / 10} h`;
  }

  return `${Math.round((value / 24) * 10) / 10} j`;
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
