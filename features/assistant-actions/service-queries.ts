import "server-only";

import { mapDeadlineOverviewToListItem } from "@/features/deadlines/mappers";
import type { DeadlineListItem } from "@/features/deadlines/types";
import {
  getEmailRelatedIds,
  mapEmailRecordToListItem,
} from "@/features/emails/mappers";
import type { EmailListItem } from "@/features/emails/types";
import {
  getProductionRelatedIds,
  mapProductionRecordToListItem,
} from "@/features/productions/mappers";
import type { ProductionListItem } from "@/features/productions/types";
import { mapRequestOverviewRowToListItem } from "@/features/requests/mappers";
import type { RequestOverviewListItem } from "@/features/requests/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readString, uniqueStrings } from "@/lib/record-helpers";
import type {
  ClientRecord,
  DeadlineCritical,
  DeadlineRecord,
  EmailAttachmentRecord,
  EmailRecord,
  EmailThreadRecord,
  ModelRecord,
  OrderRecord,
  ProductionRecord,
  RequestOverview,
} from "@/types/crm";

export async function getAssistantServiceRequestOverviews(): Promise<
  RequestOverviewListItem[]
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("v_requests_overview")
    .select("*")
    .order("urgency_score", { ascending: false, nullsFirst: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Impossible de charger les demandes assistant: ${error.message}`);
  }

  return (data ?? []).map(mapRequestOverviewRowToListItem);
}

export async function getAssistantServiceDeadlines(): Promise<DeadlineListItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("v_deadlines_critical")
    .select("*")
    .order("deadline_at", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  if (error) {
    throw new Error(`Impossible de charger les deadlines assistant: ${error.message}`);
  }

  const deadlineRows = (data ?? []) as DeadlineCritical[];
  const deadlineIds = deadlineRows.map((deadline) => deadline.id);
  const deadlineRecords = await getRowsByIds<DeadlineRecord>(
    "deadlines",
    deadlineIds,
    "id,label,status,priority,request_id,deadline_at,created_at,updated_at",
  );
  const deadlineRecordsById = new Map(
    deadlineRecords.map((record) => [record.id, record] as const),
  );

  return deadlineRows.map((deadlineRow) =>
    mapDeadlineOverviewToListItem({
      deadlineRecord: deadlineRecordsById.get(deadlineRow.id) ?? null,
      deadlineRow,
    }),
  );
}

export async function getAssistantServiceEmails(): Promise<EmailListItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("emails").select("*");

  if (error) {
    throw new Error(`Impossible de charger les emails assistant: ${error.message}`);
  }

  const emailRows = (data ?? []) as EmailRecord[];
  const relatedIds = emailRows.map(getEmailRelatedIds);
  const clientIds = uniqueStrings(relatedIds.map((item) => item.clientId));
  const emailIds = uniqueStrings(emailRows.map((email) => email.id));
  const requestIds = uniqueStrings(relatedIds.map((item) => item.requestId));
  const threadIds = uniqueStrings(relatedIds.map((item) => item.threadId));

  const [attachments, clients, requests, threads] = await Promise.all([
    getRowsByForeignKey<EmailAttachmentRecord>("email_attachments", "email_id", emailIds),
    getRowsByIds<ClientRecord>("clients", clientIds),
    getRowsByIds<RequestOverview>("v_requests_overview", requestIds),
    getRowsByIds<EmailThreadRecord>("email_threads", threadIds),
  ]);

  const attachmentRecordsByEmailId = new Map<string, EmailAttachmentRecord[]>();

  for (const attachment of attachments) {
    const emailId = readString(attachment, ["email_id", "emailId"]);

    if (!emailId) {
      continue;
    }

    const currentRows = attachmentRecordsByEmailId.get(emailId) ?? [];
    currentRows.push(attachment);
    attachmentRecordsByEmailId.set(emailId, currentRows);
  }

  const clientRecordsById = new Map(clients.map((client) => [client.id, client] as const));
  const requestRowsById = new Map(
    requests.map((request) => [request.id, request] as const),
  );
  const threadRecordsById = new Map(
    threads.map((thread) => [thread.id, thread] as const),
  );

  return emailRows
    .map((emailRecord) =>
      mapEmailRecordToListItem({
        attachmentRecordsByEmailId,
        clientRecordsById,
        emailRecord,
        requestRowsById,
        threadRecordsById,
      }),
    )
    .sort(sortEmails);
}

export async function getAssistantServiceProductions(): Promise<
  ProductionListItem[]
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("productions").select("*");

  if (error) {
    throw new Error(`Impossible de charger les productions assistant: ${error.message}`);
  }

  const productionRows = (data ?? []) as ProductionRecord[];
  const relatedIds = productionRows.map(getProductionRelatedIds);
  const orderIds = uniqueStrings(relatedIds.map((item) => item.orderId));
  const modelIds = uniqueStrings(relatedIds.map((item) => item.modelId));
  const clientIds = uniqueStrings(relatedIds.map((item) => item.clientId));
  const requestIds = uniqueStrings(relatedIds.map((item) => item.requestId));

  const [orders, models, clients, requests] = await Promise.all([
    getRowsByIds<OrderRecord>("orders", orderIds),
    getRowsByIds<ModelRecord>("models", modelIds),
    getRowsByIds<ClientRecord>("clients", clientIds),
    getRowsByIds<RequestOverview>("v_requests_overview", requestIds),
  ]);

  const ordersById = new Map(orders.map((order) => [order.id, order] as const));
  const modelsById = new Map(models.map((model) => [model.id, model] as const));
  const clientsById = new Map(clients.map((client) => [client.id, client] as const));
  const requestsById = new Map(
    requests.map((request) => [request.id, request] as const),
  );

  return productionRows
    .map((productionRecord) =>
      mapProductionRecordToListItem({
        clientRecordsById: clientsById,
        modelRecordsById: modelsById,
        orderRecordsById: ordersById,
        productionRecord,
        requestRowsById: requestsById,
      }),
    )
    .sort(sortProductions);
}

async function getRowsByIds<T>(
  resource: string,
  ids: string[],
  select = "*",
): Promise<T[]> {
  if (ids.length === 0) {
    return [] as T[];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from(resource as never)
    .select(select as never)
    .in("id" as never, ids as never);

  if (error && !isMissingResourceError(error)) {
    throw new Error(`Lecture ${resource} impossible: ${error.message}`);
  }

  return ((data ?? []) as T[]) ?? [];
}

async function getRowsByForeignKey<T>(
  resource: string,
  foreignKey: string,
  ids: string[],
  select = "*",
): Promise<T[]> {
  if (ids.length === 0) {
    return [] as T[];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from(resource as never)
    .select(select as never)
    .in(foreignKey as never, ids as never);

  if (error && !isMissingResourceError(error)) {
    throw new Error(`Lecture ${resource} impossible: ${error.message}`);
  }

  return ((data ?? []) as T[]) ?? [];
}

function isMissingResourceError(error: { code?: string; message: string }) {
  return (
    error.code === "42P01" ||
    error.message.toLowerCase().includes("does not exist")
  );
}

function sortEmails(
  a: { isUnread: boolean; receivedAt: string; status: string },
  b: { isUnread: boolean; receivedAt: string; status: string },
) {
  const statusScore = (status: string) => {
    if (status === "new") {
      return 3;
    }

    if (status === "review") {
      return 2;
    }

    return 1;
  };

  if (a.isUnread !== b.isUnread) {
    return a.isUnread ? -1 : 1;
  }

  if (statusScore(a.status) !== statusScore(b.status)) {
    return statusScore(b.status) - statusScore(a.status);
  }

  return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
}

function sortProductions(
  a: { isBlocked: boolean; plannedEndAt: string | null; risk: string },
  b: { isBlocked: boolean; plannedEndAt: string | null; risk: string },
) {
  if (a.isBlocked !== b.isBlocked) {
    return a.isBlocked ? -1 : 1;
  }

  const riskScore = (value: string) => {
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
  };

  if (riskScore(a.risk) !== riskScore(b.risk)) {
    return riskScore(b.risk) - riskScore(a.risk);
  }

  const aTime = a.plannedEndAt
    ? new Date(a.plannedEndAt).getTime()
    : Number.MAX_SAFE_INTEGER;
  const bTime = b.plannedEndAt
    ? new Date(b.plannedEndAt).getTime()
    : Number.MAX_SAFE_INTEGER;

  return aTime - bTime;
}
