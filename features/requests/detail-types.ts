import type {
  RequestAssigneeOption,
  RequestOverviewListItem,
} from "@/features/requests/types";
import type { RequestHistoryPanelData } from "@/features/history/types";

export type RequestNoteField = "notes" | "internal_notes" | "note";

export type RequestActivityCategory =
  | "request"
  | "task"
  | "deadline"
  | "validation"
  | "document"
  | "email";

export interface RequestDetailItem extends RequestOverviewListItem {
  clientId: string | null;
  contactId: string | null;
  createdAt: string;
  modelId: string | null;
  modelName: string | null;
  modelReference: string | null;
  noteField: RequestNoteField | null;
  persistedNote: string | null;
  requestSummary: string;
  updatedAt: string;
}

export interface RelatedTaskItem {
  assigneeName: string;
  createdAt: string | null;
  dueAt: string | null;
  id: string;
  priority: string;
  status: string;
  taskType: string;
  title: string;
}

export interface RelatedDeadlineItem {
  deadlineAt: string | null;
  id: string;
  label: string;
  priority: string;
  status: string;
}

export interface RelatedValidationItem {
  decision: string | null;
  id: string;
  label: string;
  ownerName: string | null;
  status: string;
  updatedAt: string | null;
}

export interface RelatedDocumentItem {
  id: string;
  name: string;
  status: string | null;
  type: string;
  updatedAt: string | null;
  url: string | null;
}

export interface RequestActivityItem {
  category: RequestActivityCategory;
  date: string;
  description: string | null;
  id: string;
  title: string;
}

export interface RequestDetailPageData {
  assignees: RequestAssigneeOption[];
  assigneesError: string | null;
  deadlines: RelatedDeadlineItem[];
  documents: RelatedDocumentItem[];
  error: string | null;
  history: RequestActivityItem[];
  historyContext: RequestHistoryPanelData | null;
  request: RequestDetailItem | null;
  tasks: RelatedTaskItem[];
  validations: RelatedValidationItem[];
  warnings: string[];
}

export type SupabaseRecord = Record<string, unknown>;
