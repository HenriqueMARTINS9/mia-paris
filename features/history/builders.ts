import type { ProductionDetailItem, ProductionListItem } from "@/features/productions/types";
import type {
  HistoryRelatedRequestItem,
  ProductionHistoryPanelData,
} from "@/features/history/types";

export function buildProductionHistoryPanelData(input: {
  allProductions: ProductionListItem[];
  production: ProductionDetailItem;
}): ProductionHistoryPanelData {
  const peerProductions = input.allProductions.filter((peer) => {
    if (peer.id === input.production.id) {
      return false;
    }

    if (input.production.modelId && peer.modelId === input.production.modelId) {
      return true;
    }

    if (input.production.clientId && peer.clientId === input.production.clientId) {
      return true;
    }

    return false;
  });

  const recentBlockages = [
    input.production,
    ...peerProductions.filter((production) => production.isBlocked || Boolean(production.blockingReason)),
  ]
    .slice(0, 6)
    .map((production) => ({
      date: production.updatedAt,
      href: "/productions",
      id: production.id,
      subtitle: production.blockingReason,
      title: production.orderNumber,
    }));

  return {
    relatedDocuments: input.production.linkedDocuments.slice(0, 6).map((document) => ({
      date: document.updatedAt,
      href: document.url,
      id: document.id,
      subtitle: document.type,
      title: document.name,
    })),
    relatedEmails: [],
    relatedRequests: input.production.linkedRequests.slice(0, 6).map((request) => ({
      clientName: input.production.clientName,
      href: `/requests/${request.id}`,
      id: request.id,
      priority: request.priority ?? "normal",
      reason: "Flux lié à cette production",
      status: request.status ?? "open",
      title: request.label,
      updatedAt: null,
    })),
    recentBlockages,
    signals: buildProductionSignals({
      blockedCount: recentBlockages.length,
      highRiskCount: [
        input.production,
        ...peerProductions,
      ].filter((production) => production.risk === "critical" || production.risk === "high").length,
    }),
  };
}

function buildProductionSignals(input: {
  blockedCount: number;
  highRiskCount: number;
}) {
  const signals: ProductionHistoryPanelData["signals"] = [];

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

export function uniqueRelatedRequests(items: HistoryRelatedRequestItem[]) {
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
