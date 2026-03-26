import {
  mapRawDeadlinePriorityToUiPriority,
  mapRawDeadlineStatusToUiStatus,
} from "@/features/deadlines/metadata";
import type { DeadlineListItem } from "@/features/deadlines/types";
import type { DeadlineCritical, DeadlineRecord } from "@/types/crm";
import { getDaysUntil } from "@/lib/utils";

export function mapDeadlineOverviewToListItem(input: {
  deadlineRecord: DeadlineRecord | null;
  deadlineRow: DeadlineCritical;
}): DeadlineListItem {
  const { deadlineRecord, deadlineRow } = input;
  const deadlineAt = deadlineRecord?.deadline_at ?? deadlineRow.deadline_at ?? null;
  const rawStatus = deadlineRecord?.status ?? deadlineRow.status ?? "open";
  const rawPriority = deadlineRecord?.priority ?? deadlineRow.priority ?? "normal";

  return {
    id: deadlineRow.id,
    label: deadlineRecord?.label ?? deadlineRow.label,
    clientName: deadlineRow.client_name ?? "Client non renseigné",
    requestTitle: deadlineRow.request_title ?? "Objet non relié",
    requestId: deadlineRecord?.request_id ?? null,
    linkedObjectLabel:
      deadlineRow.order_number ??
      deadlineRow.production_status ??
      deadlineRow.request_title ??
      "Objet non relié",
    priority: mapRawDeadlinePriorityToUiPriority(rawPriority),
    rawPriority,
    status: mapRawDeadlineStatusToUiStatus(rawStatus),
    rawStatus,
    deadlineAt,
    createdAt: deadlineRecord?.created_at ?? null,
    updatedAt: deadlineRecord?.updated_at ?? null,
    orderNumber: deadlineRow.order_number,
    productionStatus: deadlineRow.production_status,
    isOverdue: deadlineAt ? getDaysUntil(deadlineAt) < 0 : false,
  };
}
