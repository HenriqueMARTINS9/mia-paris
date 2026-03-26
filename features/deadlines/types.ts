import type { RequestLinkOption, RequestPriority } from "@/features/requests/types";

export type DeadlinePriority = RequestPriority;

export type DeadlineStatus = "open" | "in_progress" | "done";

export interface DeadlineListItem {
  id: string;
  label: string;
  clientName: string;
  requestTitle: string;
  requestId: string | null;
  linkedObjectLabel: string;
  priority: DeadlinePriority;
  rawPriority: string;
  status: DeadlineStatus;
  rawStatus: string;
  deadlineAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  orderNumber: string | null;
  productionStatus: string | null;
  isOverdue: boolean;
}

export interface DeadlinesPageData {
  deadlines: DeadlineListItem[];
  error: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError: string | null;
}
