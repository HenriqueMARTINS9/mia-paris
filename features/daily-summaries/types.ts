export interface DailySummaryClientSection {
  clientName: string;
  decisions: string[];
  emailIds: string[];
  highlights: string[];
  nextActions: string[];
  requestIds: string[];
  risks: string[];
  summary: string;
  taskIds: string[];
}

export interface DailySummaryListItem {
  clientSummaries: DailySummaryClientSection[];
  createdAt: string;
  generatedAt: string;
  highlights: string[];
  id: string;
  nextActions: string[];
  overview: string;
  risks: string[];
  source: string;
  summaryDate: string;
  summaryTime: string;
  title: string;
  updatedAt: string;
}

export interface DailySummariesPageData {
  error: string | null;
  summaries: DailySummaryListItem[];
}

export interface WriteDailySummaryClientInput {
  clientName: string;
  decisions?: string[] | null;
  emailIds?: string[] | null;
  highlights?: string[] | null;
  nextActions?: string[] | null;
  requestIds?: string[] | null;
  risks?: string[] | null;
  summary: string;
  taskIds?: string[] | null;
}

export interface WriteDailySummaryInput {
  clientSummaries: WriteDailySummaryClientInput[];
  generatedAt?: string | null;
  highlights?: string[] | null;
  nextActions?: string[] | null;
  overview: string;
  risks?: string[] | null;
  source?: "assistant" | "system" | "ui";
  summaryDate?: string | null;
  summaryTime?: string | null;
  title?: string | null;
}

export interface WriteDailySummaryResult {
  clientCount: number;
  generatedAt: string;
  message: string;
  ok: boolean;
  summaryDate: string;
  summaryId: string | null;
  summaryTime: string;
}
