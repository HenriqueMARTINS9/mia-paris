import {
  humanizeTaskType,
  mapRawTaskPriorityToUiPriority,
  mapRawTaskStatusToUiStatus,
} from "@/features/tasks/metadata";
import type { TaskListItem } from "@/features/tasks/types";
import type { RequestLinkOption } from "@/features/requests/types";
import type { TaskOpen, TaskRecord } from "@/types/crm";
import { getDaysUntil } from "@/lib/utils";

export function mapTaskOverviewToListItem(input: {
  requestOptionsById: Map<string, RequestLinkOption>;
  taskRecord: TaskRecord | null;
  taskRow: TaskOpen;
}): TaskListItem {
  const { requestOptionsById, taskRecord, taskRow } = input;
  const requestId = taskRecord?.request_id ?? null;
  const requestLinkOption = requestId ? requestOptionsById.get(requestId) ?? null : null;
  const dueAt = taskRecord?.due_at ?? taskRow.due_at ?? null;
  const rawStatus = taskRecord?.status ?? taskRow.status ?? "todo";
  const rawPriority = taskRecord?.priority ?? taskRow.priority ?? "normal";

  return {
    id: taskRow.id,
    title: taskRecord?.title ?? taskRow.title,
    taskType: taskRecord?.task_type ?? taskRow.task_type ?? "task",
    taskTypeLabel: humanizeTaskType(taskRecord?.task_type ?? taskRow.task_type),
    clientName: taskRow.client_name ?? "Client non renseigné",
    requestTitle: taskRow.request_title ?? requestLinkOption?.label ?? "Demande non reliée",
    requestId,
    requestLabel: requestLinkOption?.label ?? taskRow.request_title ?? null,
    priority: mapRawTaskPriorityToUiPriority(rawPriority),
    rawPriority,
    status: mapRawTaskStatusToUiStatus(rawStatus),
    rawStatus,
    owner: taskRow.assigned_user_name ?? "Non assigné",
    assignedUserId: taskRecord?.assigned_user_id ?? null,
    dueAt,
    createdAt: taskRecord?.created_at ?? null,
    updatedAt: taskRecord?.updated_at ?? null,
    productionStatus: taskRow.production_status,
    orderNumber: taskRow.order_number,
    isOverdue: dueAt ? getDaysUntil(dueAt) < 0 : false,
  };
}

export function mapTaskRecordToListItemFallback(input: {
  requestLabel: string | null;
  requestTitle: string | null;
  taskRecord: TaskRecord;
}): TaskListItem {
  const { requestLabel, requestTitle, taskRecord } = input;
  const rawStatus = taskRecord.status ?? "todo";
  const rawPriority = taskRecord.priority ?? "normal";

  return {
    id: taskRecord.id,
    title: taskRecord.title ?? "Tâche sans titre",
    taskType: taskRecord.task_type ?? "task",
    taskTypeLabel: humanizeTaskType(taskRecord.task_type),
    clientName: "Client non renseigné",
    requestTitle: requestTitle ?? "Demande non reliée",
    requestId: taskRecord.request_id,
    requestLabel,
    priority: mapRawTaskPriorityToUiPriority(rawPriority),
    rawPriority,
    status: mapRawTaskStatusToUiStatus(rawStatus),
    rawStatus,
    owner: "Non assigné",
    assignedUserId: taskRecord.assigned_user_id,
    dueAt: taskRecord.due_at,
    createdAt: taskRecord.created_at,
    updatedAt: taskRecord.updated_at,
    productionStatus: null,
    orderNumber: null,
    isOverdue: taskRecord.due_at ? getDaysUntil(taskRecord.due_at) < 0 : false,
  };
}
