import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { ClipboardList, Euro, Factory, Mail, Truck } from "lucide-react";

import { getEmailsPageData } from "@/features/emails/queries";
import { getProductionsPageData } from "@/features/productions/queries";
import { getRequestsOverviewPageData } from "@/features/requests/queries";
import { getTasksPageData } from "@/features/tasks/queries";
import { workspaceDefinitions } from "@/features/workspaces/config";
import type {
  WorkspaceDocumentItem,
  WorkspaceKey,
  WorkspacePageData,
} from "@/features/workspaces/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { readString } from "@/lib/record-helpers";
import type { DocumentRecord } from "@/types/crm";

export async function getWorkspacePageData(
  workspace: WorkspaceKey,
): Promise<WorkspacePageData> {
  noStore();

  const definition = workspaceDefinitions[workspace];
  const [requestsData, tasksData, emailsData, productionsData, documentsResult] =
    await Promise.all([
      getRequestsOverviewPageData(),
      getTasksPageData(),
      getEmailsPageData(),
      getProductionsPageData(),
      supabaseRestSelectList<DocumentRecord>("documents", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
    ]);

  const requestTypeSet = new Set(definition.requestTypes.map(normalizeValue));
  const taskTypeSet = new Set(definition.taskTypes.map(normalizeValue));
  const emailTypeSet = new Set(definition.emailTypes.map(normalizeValue));
  const documentTypeSet = new Set(definition.documentTypes.map(normalizeValue));

  const requests = [...requestsData.requests]
    .filter((request) => requestTypeSet.has(normalizeValue(request.requestType)))
    .sort((left, right) => right.urgencyScore - left.urgencyScore);
  const requestIds = new Set(requests.map((request) => request.id));

  const tasks = [...tasksData.tasks]
    .filter(
      (task) =>
        requestIds.has(task.requestId ?? "") ||
        taskTypeSet.has(normalizeValue(task.taskType)),
    )
    .sort(sortTasksByWorkspaceUrgency);

  const emails = [...emailsData.emails]
    .filter((email) => {
      if (email.status === "processed" && !requestIds.has(email.linkedRequestId ?? "")) {
        return false;
      }

      return (
        requestIds.has(email.linkedRequestId ?? "") ||
        emailTypeSet.has(normalizeValue(email.detectedType))
      );
    })
    .sort(
      (left, right) =>
        new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
    );

  const productions = [...productionsData.productions]
    .filter((production) =>
      shouldKeepProductionForWorkspace({
        production,
        requestIds,
        workspace,
      }),
    )
    .sort(sortProductionsByWorkspaceUrgency);
  const productionIds = new Set(productions.map((production) => production.id));

  const documents = (documentsResult.data ?? [])
    .map(mapWorkspaceDocumentItem)
    .filter((document) => {
      const typeMatches = documentTypeSet.has(normalizeValue(document.type));
      const requestMatch = requestIds.has(document.requestId ?? "");
      const productionMatch = productionIds.has(document.productionId ?? "");

      return typeMatches || requestMatch || productionMatch;
    })
    .sort(
      (left, right) =>
        new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime(),
    );

  const errors = [
    requestsData.error,
    tasksData.error,
    emailsData.error,
    productionsData.error,
    getOptionalDocumentsError(documentsResult.error, documentsResult.rawError),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    documents: documents.slice(0, 8),
    emails: emails.slice(0, 8),
    error: errors.length > 0 ? errors : null,
    metrics: buildWorkspaceMetrics(workspace, {
      documentsCount: documents.length,
      emailsCount: emails.length,
      productionsCount: productions.length,
      requestsCount: requests.length,
      tasksCount: tasks.length,
    }),
    productions: productions.slice(0, 8),
    requests: requests.slice(0, 8),
    tasks: tasks.slice(0, 8),
  };
}

function buildWorkspaceMetrics(
  workspace: WorkspaceKey,
  counts: {
    documentsCount: number;
    emailsCount: number;
    productionsCount: number;
    requestsCount: number;
    tasksCount: number;
  },
) {
  if (workspace === "development") {
    return [
      {
        accent: "primary" as const,
        hint: "Demandes de développement, TDS, swatches et validations trim encore actives.",
        icon: ClipboardList,
        label: "Demandes produit",
        value: String(counts.requestsCount),
      },
      {
        accent: "accent" as const,
        hint: "Actions en file pour modélisme, sourcing et suivi validation.",
        icon: Truck,
        label: "Tâches ouvertes",
        value: String(counts.tasksCount),
      },
      {
        accent: "danger" as const,
        hint: "Emails encore à qualifier ou à absorber côté développement.",
        icon: Mail,
        label: "Emails utiles",
        value: String(counts.emailsCount),
      },
      {
        accent: "primary" as const,
        hint: "Tech packs, prototypes et éléments d’habillage déjà stockés côté CRM.",
        icon: Factory,
        label: "Documents liés",
        value: String(counts.documentsCount),
      },
    ];
  }

  if (workspace === "logistics") {
    return [
      {
        accent: "danger" as const,
        hint: "Demandes logistiques, conformité ou délais qui menacent le flux client.",
        icon: ClipboardList,
        label: "Demandes sensibles",
        value: String(counts.requestsCount),
      },
      {
        accent: "danger" as const,
        hint: "Productions bloquées ou à risque à surveiller de près.",
        icon: Factory,
        label: "Productions à suivre",
        value: String(counts.productionsCount),
      },
      {
        accent: "accent" as const,
        hint: "Emails entrants liés à l’expédition, la conformité ou un retard.",
        icon: Mail,
        label: "Inbox logistique",
        value: String(counts.emailsCount),
      },
      {
        accent: "primary" as const,
        hint: "Packing lists, rapports d’inspection et documents de conformité disponibles.",
        icon: Truck,
        label: "Documents flux",
        value: String(counts.documentsCount),
      },
    ];
  }

  return [
    {
      accent: "accent" as const,
      hint: "Demandes de prix et arbitrages chiffrage encore ouverts.",
      icon: Euro,
      label: "Demandes prix",
      value: String(counts.requestsCount),
    },
    {
      accent: "primary" as const,
      hint: "Tâches de costing et contrôles prix déjà planifiés.",
      icon: Truck,
      label: "Actions chiffrage",
      value: String(counts.tasksCount),
    },
    {
      accent: "accent" as const,
      hint: "Price sheets ou factures déjà présentes dans les documents métier.",
      icon: ClipboardList,
      label: "Docs facture",
      value: String(counts.documentsCount),
    },
    {
      accent: "danger" as const,
      hint: "Emails encore à absorber avant réponse prix ou validation financière.",
      icon: Mail,
      label: "Emails entrants",
      value: String(counts.emailsCount),
    },
  ];
}

function shouldKeepProductionForWorkspace(input: {
  production: WorkspacePageData["productions"][number];
  requestIds: Set<string>;
  workspace: WorkspaceKey;
}) {
  if (input.requestIds.has(input.production.requestId ?? "")) {
    return true;
  }

  if (input.workspace === "logistics") {
    return input.production.isBlocked || input.production.risk !== "low";
  }

  if (input.workspace === "billing") {
    return false;
  }

  return false;
}

function mapWorkspaceDocumentItem(row: DocumentRecord): WorkspaceDocumentItem & {
  productionId: string | null;
  requestId: string | null;
} {
  return {
    id: row.id,
    productionId: readString(row, ["production_id", "productionId"]),
    relatedLabel:
      readString(row, ["title", "name", "file_name"]) ??
      readString(row, ["reference", "label"]),
    requestId: readString(row, ["request_id", "requestId"]),
    title: readString(row, ["title", "name", "file_name"]) ?? "Document",
    type: readString(row, ["document_type", "type", "mime_type"]) ?? "document",
    updatedAt: readString(row, ["updated_at", "created_at"]),
    url: readString(row, ["url", "public_url", "file_url", "storage_path"]),
  };
}

function getOptionalDocumentsError(error: string | null, rawError: unknown) {
  if (!error) {
    return null;
  }

  if (isMissingSupabaseResourceError(rawError as never)) {
    return null;
  }

  return error;
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function sortTasksByWorkspaceUrgency(
  left: WorkspacePageData["tasks"][number],
  right: WorkspacePageData["tasks"][number],
) {
  if (left.isOverdue !== right.isOverdue) {
    return left.isOverdue ? -1 : 1;
  }

  return new Date(left.dueAt ?? 0).getTime() - new Date(right.dueAt ?? 0).getTime();
}

function sortProductionsByWorkspaceUrgency(
  left: WorkspacePageData["productions"][number],
  right: WorkspacePageData["productions"][number],
) {
  if (left.isBlocked !== right.isBlocked) {
    return left.isBlocked ? -1 : 1;
  }

  const riskWeight = (value: string) => {
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

  return riskWeight(right.risk) - riskWeight(left.risk);
}
