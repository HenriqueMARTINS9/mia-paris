import type {
  RequestAssigneeOption,
  RequestLinkOption,
  RequestPriority,
} from "@/features/requests/types";

export type TaskPriority = RequestPriority;

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export interface TaskListItem {
  id: string;
  title: string;
  taskType: string;
  taskTypeLabel: string;
  clientName: string;
  requestTitle: string;
  requestId: string | null;
  requestLabel: string | null;
  priority: TaskPriority;
  rawPriority: string;
  status: TaskStatus;
  rawStatus: string;
  owner: string;
  assignedUserId: string | null;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  productionStatus: string | null;
  orderNumber: string | null;
  isOverdue: boolean;
}

export interface TasksPageData {
  tasks: TaskListItem[];
  assignees: RequestAssigneeOption[];
  assigneesError: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError: string | null;
  error: string | null;
}
