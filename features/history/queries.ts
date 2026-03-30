import "server-only";

import { getDeadlinesPageData } from "@/features/deadlines/queries";
import { getEmailsPageData } from "@/features/emails/queries";
import { getProductionsPageData } from "@/features/productions/queries";
import type { RequestDetailItem } from "@/features/requests/detail-types";
import { getRequestsOverviewPageData } from "@/features/requests/queries";
import { getTasksPageData } from "@/features/tasks/queries";
import type {
  ClientHistoryPanelData,
  EmailHistoryInsightData,
  HistoricalSignal,
  HistoryRelatedRequestItem,
  HistoryTimelineItem,
  ModelHistoryPanelData,
  ProductionHistoryPanelData,
  RequestHistoryPanelData,
} from "@/features/history/types";
import { supabaseRestSelectList } from "@/lib/supabase/rest";
import { readString } from "@/lib/record-helpers";
import type { DocumentRecord, RequestRecord, ValidationRecord } from "@/types/crm";

export async function getRequestHistoryPanelData(
  request: Pick<
    RequestDetailItem,
    "clientId" | "clientName" | "id" | "modelId" | "modelName" | "requestType" | "title"
  >,
): Promise<RequestHistoryPanelData> {
  const [
    requestsData,
    emailsData,
    productionsData,
    tasksData,
    deadlinesData,
    validationsResult,
    documentsResult,
    clientRequestRowsResult,
    modelRequestRowsResult,
  ] = await Promise.all([
    getRequestsOverviewPageData(),
    getEmailsPageData(),
    getProductionsPageData(),
    getTasksPageData(),
    getDeadlinesPageData(),
    supabaseRestSelectList<ValidationRecord>("validations", {
      order: "updated_at.desc.nullslast,created_at.desc.nullslast",
      select: "*",
    }),
    supabaseRestSelectList<DocumentRecord>("documents", {
      order: "updated_at.desc.nullslast,created_at.desc.nullslast",
      select: "*",
    }),
    request.clientId
      ? supabaseRestSelectList<RequestRecord>("requests", {
          client_id: `eq.${request.clientId}`,
          select: "id,client_id,model_id",
        })
      : Promise.resolve({
          data: [] as RequestRecord[],
          error: null,
          rawError: null,
          status: 200,
        }),
    request.modelId
      ? supabaseRestSelectList<RequestRecord>("requests", {
          model_id: `eq.${request.modelId}`,
          select: "id,client_id,model_id",
        })
      : Promise.resolve({
          data: [] as RequestRecord[],
          error: null,
          rawError: null,
          status: 200,
        }),
  ]);

  const allRequests = requestsData.requests;
  const allEmails = emailsData.emails;
  const allProductions = productionsData.productions;
  const allTasks = tasksData.tasks;
  const allDeadlines = deadlinesData.deadlines;
  const allDocuments = documentsResult.data ?? [];
  const allValidations = validationsResult.data ?? [];

  const clientRequestIds = new Set(
    (clientRequestRowsResult.data ?? [])
      .map((row) => row.id)
      .filter((value): value is string => Boolean(value)),
  );
  const modelRequestIds = new Set(
    (modelRequestRowsResult.data ?? [])
      .map((row) => row.id)
      .filter((value): value is string => Boolean(value)),
  );

  const clientRequests = allRequests.filter((item) =>
    clientRequestIds.size > 0 ? clientRequestIds.has(item.id) : item.clientName === request.clientName,
  );
  const similarRequests = clientRequests.filter((item) => item.id !== request.id);
  const modelRequests = allRequests.filter((item) =>
    modelRequestIds.size > 0
      ? modelRequestIds.has(item.id)
      : Boolean(request.modelName) && item.title.toLowerCase().includes((request.modelName ?? "").toLowerCase()),
  );

  const clientEmails = allEmails.filter((email) =>
    request.clientId
      ? email.clientId === request.clientId
      : email.clientName === request.clientName,
  );
  const requestEmails = clientEmails
    .filter(
      (email) =>
        email.linkedRequestId === request.id ||
        email.subject.toLowerCase().includes(request.title.toLowerCase().slice(0, 16)),
    )
    .slice(0, 6);

  const clientDocuments = allDocuments.filter((document) =>
    request.clientId
      ? readString(document, ["client_id", "clientId"]) === request.clientId
      : readString(document, ["request_id", "requestId"]) === request.id,
  );
  const modelDocuments = allDocuments.filter(
    (document) => request.modelId && readString(document, ["model_id", "modelId"]) === request.modelId,
  );

  const clientProductions = allProductions.filter((production) =>
    request.clientId ? production.clientId === request.clientId : production.clientName === request.clientName,
  );
  const modelProductions = allProductions.filter(
    (production) => request.modelId && production.modelId === request.modelId,
  );

  const clientValidationCount = allValidations.filter((validation) =>
    clientRequestIds.has(readString(validation, ["request_id", "requestId"]) ?? ""),
  ).length;
  const overdueTaskCount = allTasks.filter(
    (task) => task.requestId && clientRequestIds.has(task.requestId) && task.isOverdue,
  ).length;
  const overdueDeadlineCount = allDeadlines.filter(
    (deadline) => deadline.requestId && clientRequestIds.has(deadline.requestId) && deadline.isOverdue,
  ).length;

  const requestSignals: HistoricalSignal[] = [];

  if (
    similarRequests.filter((item) => item.requestType === request.requestType).length >= 2
  ) {
    requestSignals.push({
      description:
        "Le même type de demande revient régulièrement pour ce client. Anticiper la prochaine action ou le prochain document utile fait souvent gagner du temps.",
      id: "request-repeat",
      title: "Type de demande récurrent chez ce client",
      tone: "info",
    });
  }

  if (clientProductions.filter((production) => production.isBlocked).length >= 2) {
    requestSignals.push({
      description:
        "Plusieurs productions du même périmètre ont déjà remonté des blocages. Vérifie rapidement s’il s’agit d’un signal structurel sur le dossier.",
      id: "request-blockages",
      title: "Blocages déjà vus sur le périmètre client",
      tone: "warning",
    });
  }

  if (overdueTaskCount + overdueDeadlineCount >= 3) {
    requestSignals.push({
      description:
        "L’historique du client montre plusieurs retards récents sur des tâches ou deadlines proches de ce dossier.",
      id: "request-delays",
      title: "Retards fréquents autour de ce flux",
      tone: "warning",
    });
  }

  const clientHistory: ClientHistoryPanelData | null =
    request.clientName.length > 0
      ? {
          clientName: request.clientName,
          relatedDocuments: clientDocuments
            .slice(0, 6)
            .map((document) => mapDocumentTimelineItem(document)),
          relatedEmails: clientEmails.slice(0, 6).map((email) => ({
            date: email.receivedAt,
            href: "/emails",
            id: email.id,
            subtitle: `${email.fromName} · ${email.subject}`,
            title: email.subject,
          })),
          relatedRequests: similarRequests
            .slice(0, 6)
            .map((item) => mapRelatedRequestItem(item, "Même client")),
          signals: buildClientHistorySignals({
            clientValidationCount,
            highPriorityRequestCount: clientRequests.filter(
              (item) => item.priority === "critical" || item.priority === "high",
            ).length,
            overdueCount: overdueTaskCount + overdueDeadlineCount,
            repeatedBlockageCount: clientProductions.filter((item) => item.isBlocked).length,
          }),
        }
      : null;

  const modelHistory: ModelHistoryPanelData | null = request.modelName
    ? {
        modelName: request.modelName,
        relatedDocuments: modelDocuments
          .slice(0, 6)
          .map((document) => mapDocumentTimelineItem(document)),
        relatedRequests: modelRequests
          .filter((item) => item.id !== request.id)
          .slice(0, 6)
          .map((item) => mapRelatedRequestItem(item, "Même modèle")),
        signals: buildModelHistorySignals({
          blockedProductions: modelProductions.filter((item) => item.isBlocked).length,
          relatedRequestCount: modelRequests.length,
        }),
      }
    : null;

  const productionHistory: ProductionHistoryPanelData | null =
    clientProductions.length > 0 || modelProductions.length > 0
      ? {
          relatedDocuments: uniqueTimelineItems(
            [...clientDocuments.slice(0, 4), ...modelDocuments.slice(0, 4)].map(
              (document) => mapDocumentTimelineItem(document),
            ),
          ).slice(0, 6),
          relatedEmails: requestEmails.map((email) => ({
            date: email.receivedAt,
            href: "/emails",
            id: email.id,
            subtitle: `${email.fromName} · ${email.clientName}`,
            title: email.subject,
          })),
          relatedRequests: uniqueRelatedRequests(
            [...similarRequests, ...modelRequests.filter((item) => item.id !== request.id)]
              .slice(0, 8)
              .map((item) => mapRelatedRequestItem(item, "Historique de flux")),
          ).slice(0, 6),
          recentBlockages: uniqueTimelineItems(
            [...clientProductions, ...modelProductions]
              .filter((production) => production.isBlocked || Boolean(production.blockingReason))
              .slice(0, 6)
              .map((production) => ({
                date: production.updatedAt,
                href: "/productions",
                id: production.id,
                subtitle: production.blockingReason,
                title: production.orderNumber,
              })),
          ),
          signals: buildProductionSignals({
            blockedCount: [...clientProductions, ...modelProductions].filter(
              (item) => item.isBlocked,
            ).length,
            highRiskCount: [...clientProductions, ...modelProductions].filter(
              (item) => item.risk === "critical" || item.risk === "high",
            ).length,
          }),
        }
      : null;

  return {
    clientHistory,
    modelHistory,
    productionHistory,
    requestSignals,
  };
}

export async function getEmailHistoryInsightData(input: {
  clientId?: string | null;
  clientName: string;
  linkedRequestId?: string | null;
  requestType?: string | null;
}): Promise<EmailHistoryInsightData> {
  const requestsData = await getRequestsOverviewPageData();

  const relatedRequests = requestsData.requests
    .filter((request) =>
      input.clientId
        ? request.clientName === input.clientName
        : request.clientName === input.clientName,
    )
    .slice(0, 6)
    .map((request) =>
      mapRelatedRequestItem(
        request,
        request.id === input.linkedRequestId ? "Déjà liée" : "Même client",
      ),
    );

  const signals: HistoricalSignal[] = [];

  if (relatedRequests.length >= 2) {
    signals.push({
      description:
        "Plusieurs demandes proches existent déjà chez ce client. Vérifie s’il s’agit d’un nouveau dossier ou d’une suite logique.",
      id: "email-related-requests",
      title: "Historique client déjà dense",
      tone: "info",
    });
  }

  if (input.requestType && relatedRequests.some((request) => request.reason === "Même client")) {
    signals.push({
      description:
        "Un rattachement à une demande existante est peut-être pertinent avant de créer un nouveau dossier.",
      id: "email-possible-attach",
      title: "Rattachement probable à vérifier",
      tone: "warning",
    });
  }

  return {
    relatedRequests,
    signals,
  };
}

function mapRelatedRequestItem(
  request: {
    clientName: string;
    id: string;
    priority: string;
    status: string;
    title: string;
    updatedAt?: string | null;
  },
  reason: string,
): HistoryRelatedRequestItem {
  return {
    clientName: request.clientName,
    href: `/requests/${request.id}`,
    id: request.id,
    priority: request.priority,
    reason,
    status: request.status,
    title: request.title,
    updatedAt: request.updatedAt ?? null,
  };
}

function mapDocumentTimelineItem(document: DocumentRecord): HistoryTimelineItem {
  return {
    date: readString(document, ["updated_at", "created_at"]),
    href: readString(document, ["url", "file_url", "public_url", "storage_path"]),
    id: document.id,
    subtitle:
      readString(document, ["document_type", "status"]) ?? "Document métier",
    title:
      readString(document, ["title", "name", "file_name"]) ?? "Document",
  };
}

function buildClientHistorySignals(input: {
  clientValidationCount: number;
  highPriorityRequestCount: number;
  overdueCount: number;
  repeatedBlockageCount: number;
}): HistoricalSignal[] {
  const signals: HistoricalSignal[] = [];

  if (input.highPriorityRequestCount >= 3) {
    signals.push({
      description:
        "Ce client concentre plusieurs dossiers high / critical récents. Prévoir des retours structurés et rapides reste souvent décisif.",
      id: "client-urgent",
      title: "Client souvent urgent",
      tone: "warning",
    });
  }

  if (input.overdueCount >= 3) {
    signals.push({
      description:
        "Retards et échéances dépassées se répètent sur ce client. Un pilotage plus serré peut éviter la prochaine escalade.",
      id: "client-overdue",
      title: "Retards fréquents",
      tone: "warning",
    });
  }

  if (input.repeatedBlockageCount >= 2) {
    signals.push({
      description:
        "Des blocages production sont déjà revenus sur ce périmètre. Vérifie s’il existe une cause commune ou un document manquant.",
      id: "client-blocked",
      title: "Blocages récurrents",
      tone: "critical",
    });
  }

  if (input.clientValidationCount >= 2) {
    signals.push({
      description:
        "Plusieurs validations liées à ce client restent visibles dans l’historique. L’arbitrage peut nécessiter une coordination plus active.",
      id: "client-validations",
      title: "Validations souvent longues",
      tone: "info",
    });
  }

  return signals;
}

function buildModelHistorySignals(input: {
  blockedProductions: number;
  relatedRequestCount: number;
}): HistoricalSignal[] {
  const signals: HistoricalSignal[] = [];

  if (input.relatedRequestCount >= 2) {
    signals.push({
      description:
        "Ce modèle a déjà connu plusieurs demandes proches. Les validations et documents antérieurs peuvent accélérer le traitement.",
      id: "model-repeat",
      title: "Modèle déjà sollicité",
      tone: "info",
    });
  }

  if (input.blockedProductions >= 2) {
    signals.push({
      description:
        "Plusieurs productions du même modèle ont déjà remonté un blocage. Vérifie le dernier motif avant de relancer le flux.",
      id: "model-blocked",
      title: "Blocages répétés sur le modèle",
      tone: "warning",
    });
  }

  return signals;
}

function buildProductionSignals(input: {
  blockedCount: number;
  highRiskCount: number;
}): HistoricalSignal[] {
  const signals: HistoricalSignal[] = [];

  if (input.blockedCount >= 2) {
    signals.push({
      description:
        "Le périmètre de production montre plusieurs blocages proches. Un arbitrage rapide évite souvent l’effet domino sur les délais.",
      id: "prod-blocked-repeat",
      title: "Blocages récurrents",
      tone: "critical",
    });
  }

  if (input.highRiskCount >= 2) {
    signals.push({
      description:
        "Plusieurs productions parentes sont déjà high / critical. Le dossier mérite un suivi resserré et documenté.",
      id: "prod-risk-repeat",
      title: "Risque élevé récurrent",
      tone: "warning",
    });
  }

  return signals;
}

function uniqueTimelineItems(items: HistoryTimelineItem[]) {
  const seen = new Set<string>();
  const unique: HistoryTimelineItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    unique.push(item);
  }

  return unique;
}

function uniqueRelatedRequests(items: HistoryRelatedRequestItem[]) {
  const seen = new Set<string>();
  const unique: HistoryRelatedRequestItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    unique.push(item);
  }

  return unique;
}
