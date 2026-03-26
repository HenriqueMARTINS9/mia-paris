import type { RequestOverview } from "@/types/crm";
import {
  mapRawRequestPriorityToUiPriority,
  mapRawRequestStatusToUiStatus,
} from "@/features/requests/metadata";
import type {
  ProductionStage,
  RequestContact,
  RequestMilestone,
  RequestOverviewListItem,
  RequestPriority,
  RequestStatus,
  RequestTimelineEvent,
} from "@/features/requests/types";
import { getDaysUntil } from "@/lib/utils";

export function mapRequestOverviewRowToListItem(
  row: RequestOverview,
): RequestOverviewListItem {
  const requestType = row.request_type ?? "request";
  const rawStatus = row.status ?? "unknown";
  const rawPriority = row.priority ?? "normal";
  const dueAt = row.due_at ?? row.updated_at ?? row.created_at;
  const priority = mapRawRequestPriorityToUiPriority(rawPriority);
  const status = mapRawRequestStatusToUiStatus(rawStatus, requestType);
  const productionStage = mapProductionStage(requestType, rawStatus);
  const requestTypeLabel = humanizeRequestType(requestType);
  const reference = row.internal_ref ?? row.client_ref ?? row.id.slice(0, 8);
  const clientName = row.client_name ?? "Client non renseigné";
  const contactName = row.contact_name ?? "Contact non renseigné";
  const owner = row.assigned_user_name ?? "Non assigné";
  const urgencyScore = row.urgency_score ?? fallbackUrgencyFromPriority(priority);

  return {
    id: row.id,
    title: row.title,
    reference,
    clientName,
    clientCode: buildClientCode(clientName, row.client_ref),
    department: row.department_name ?? "Département non renseigné",
    requestType,
    requestTypeLabel,
    internalRef: row.internal_ref,
    clientRef: row.client_ref,
    sourceChannel: "email",
    sourceSubject: row.title,
    emailFrom: `${contactName} · ${clientName}`,
    emailPreview: buildEmailPreview(row, requestTypeLabel),
    status,
    priority,
    productionStage,
    assignedUserId: null,
    owner,
    ownerRole: buildOwnerRole(requestType),
    dueAt,
    lastInboundAt: row.updated_at ?? row.created_at,
    urgencyScore,
    aiConfidence: row.ai_confidence,
    rawStatus,
    rawPriority,
    tags: buildTags(row, requestTypeLabel, rawStatus, rawPriority),
    notes: buildNotes(row, requestTypeLabel),
    nextActions: buildNextActions(requestType, status),
    contacts: buildContacts(row, contactName, clientName, owner),
    milestones: buildMilestones(row, dueAt, urgencyScore),
    documents: [],
    timeline: buildTimeline(row, dueAt),
  };
}

function mapProductionStage(
  requestType: string,
  rawStatus: string,
): ProductionStage {
  const type = requestType.toLowerCase();
  const status = rawStatus.toLowerCase();

  if (type.includes("production")) {
    return "production";
  }

  if (status.includes("done") || status.includes("approved")) {
    return "approved";
  }

  if (type.includes("validation") || type.includes("trim")) {
    return "sampling";
  }

  if (type.includes("price") || type.includes("cost")) {
    return "sourcing";
  }

  return "brief";
}

function humanizeRequestType(requestType: string) {
  return requestType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildClientCode(clientName: string, clientRef: string | null) {
  if (clientRef) {
    const fromRef = clientRef.split("-")[0];
    if (fromRef) {
      return fromRef;
    }
  }

  return clientName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function buildOwnerRole(requestType: string) {
  if (requestType.includes("production")) {
    return "Coordination production";
  }

  if (requestType.includes("validation") || requestType.includes("trim")) {
    return "Pilotage validation";
  }

  if (requestType.includes("price")) {
    return "Développement produit";
  }

  return "Responsable dossier";
}

function buildEmailPreview(row: RequestOverview, requestTypeLabel: string) {
  const parts = [
    requestTypeLabel,
    row.department_name ? `pôle ${row.department_name}` : null,
    row.client_ref ? `réf client ${row.client_ref}` : null,
    row.internal_ref ? `réf interne ${row.internal_ref}` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function buildTags(
  row: RequestOverview,
  requestTypeLabel: string,
  rawStatus: string,
  rawPriority: string,
) {
  return [
    requestTypeLabel,
    rawStatus,
    rawPriority,
    row.client_ref,
    row.department_name,
  ].filter((value): value is string => Boolean(value));
}

function buildNotes(row: RequestOverview, requestTypeLabel: string) {
  return [
    `Demande issue de la vue Supabase v_requests_overview.`,
    `Type: ${requestTypeLabel}.`,
    row.client_ref ? `Référence client: ${row.client_ref}.` : null,
    row.internal_ref ? `Référence interne: ${row.internal_ref}.` : null,
    row.contact_name ? `Contact principal: ${row.contact_name}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildNextActions(requestType: string, status: RequestStatus) {
  if (status === "costing") {
    return [
      "Consolider le prix et le délai sur le dossier.",
      "Valider la faisabilité atelier avant retour client.",
      "Préparer le compte-rendu de chiffrage dans le CRM.",
    ];
  }

  if (status === "awaiting_validation") {
    return [
      "Planifier la prochaine validation produit ou client.",
      "Partager la dernière version du dossier à l'équipe concernée.",
      "Tracer la décision finale dans Supabase.",
    ];
  }

  if (status === "in_production") {
    return [
      "Contrôler la prochaine échéance de production.",
      "Relancer l'owner si un blocage atelier persiste.",
      "Mettre à jour le statut de suivi dans le CRM.",
    ];
  }

  if (requestType.includes("price")) {
    return [
      "Qualifier le besoin prix / délai.",
      "Créer les tâches de chiffrage liées.",
      "Préparer un retour structuré au client.",
    ];
  }

  return [
    "Qualifier la demande et vérifier les références.",
    "Affecter le bon interlocuteur métier.",
    "Créer les objets liés nécessaires pour la suite.",
  ];
}

function buildContacts(
  row: RequestOverview,
  contactName: string,
  clientName: string,
  owner: string,
): RequestContact[] {
  return [
    {
      name: contactName,
      role: "Contact client",
      company: clientName,
      email: row.contact_name ? "Contact disponible dans Supabase" : "Non renseigné",
    },
    {
      name: owner,
      role: "Owner interne",
      company: "MIA PARIS",
      email: "Utilisateur interne",
    },
  ];
}

function buildMilestones(
  row: RequestOverview,
  dueAt: string,
  urgencyScore: number,
): RequestMilestone[] {
  const dueTone = getDaysUntil(dueAt) <= 2 || urgencyScore >= 80 ? "risk" : "next";

  return [
    {
      label: "Création dossier",
      date: row.created_at,
      tone: "done",
    },
    {
      label: "Dernière mise à jour",
      date: row.updated_at,
      tone: "next",
    },
    {
      label: "Deadline métier",
      date: dueAt,
      tone: dueTone,
    },
  ];
}

function buildTimeline(
  row: RequestOverview,
  dueAt: string,
): RequestTimelineEvent[] {
  return [
    {
      id: `${row.id}-created`,
      title: "Demande créée dans Supabase",
      date: row.created_at,
      category: "email",
    },
    {
      id: `${row.id}-updated`,
      title: "Dernière mise à jour du dossier",
      date: row.updated_at,
      category: "task",
    },
    {
      id: `${row.id}-due`,
      title: "Deadline opérationnelle",
      date: dueAt,
      category: "deadline",
    },
  ];
}

function fallbackUrgencyFromPriority(priority: RequestPriority) {
  if (priority === "critical") {
    return 95;
  }

  if (priority === "high") {
    return 75;
  }

  return 45;
}
