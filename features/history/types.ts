export type HistoricalSignalTone = "critical" | "warning" | "info";

export interface HistoricalSignal {
  description: string;
  id: string;
  title: string;
  tone: HistoricalSignalTone;
}

export interface HistoryTimelineItem {
  date: string | null;
  href: string | null;
  id: string;
  subtitle: string | null;
  title: string;
}

export interface HistoryRelatedRequestItem {
  clientName: string;
  href: string;
  id: string;
  priority: string;
  reason: string | null;
  status: string;
  title: string;
  updatedAt: string | null;
}

export interface ClientHistoryPanelData {
  clientName: string;
  relatedDocuments: HistoryTimelineItem[];
  relatedEmails: HistoryTimelineItem[];
  relatedRequests: HistoryRelatedRequestItem[];
  signals: HistoricalSignal[];
}

export interface ModelHistoryPanelData {
  modelName: string;
  relatedDocuments: HistoryTimelineItem[];
  relatedRequests: HistoryRelatedRequestItem[];
  signals: HistoricalSignal[];
}

export interface ProductionHistoryPanelData {
  relatedDocuments: HistoryTimelineItem[];
  relatedEmails: HistoryTimelineItem[];
  relatedRequests: HistoryRelatedRequestItem[];
  recentBlockages: HistoryTimelineItem[];
  signals: HistoricalSignal[];
}

export interface RequestHistoryPanelData {
  clientHistory: ClientHistoryPanelData | null;
  modelHistory: ModelHistoryPanelData | null;
  productionHistory: ProductionHistoryPanelData | null;
  requestSignals: HistoricalSignal[];
}

export interface EmailHistoryInsightData {
  relatedRequests: HistoryRelatedRequestItem[];
  signals: HistoricalSignal[];
}
