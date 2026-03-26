import {
  mapRawRequestPriorityToUiPriority,
  mapUiPriorityToDatabasePriority,
  requestPriorityMeta,
} from "@/features/requests/metadata";
import type { DeadlinePriority, DeadlineStatus } from "@/features/deadlines/types";

export { mapUiPriorityToDatabasePriority, requestPriorityMeta };

export const deadlineStatusMeta: Record<
  DeadlineStatus,
  { label: string; description: string }
> = {
  open: {
    label: "Ouverte",
    description: "Deadline active à suivre.",
  },
  in_progress: {
    label: "En suivi",
    description: "Deadline suivie activement.",
  },
  done: {
    label: "Traitée",
    description: "Deadline absorbée ou clôturée.",
  },
};

export function mapRawDeadlineStatusToUiStatus(
  rawStatus: string | null,
): DeadlineStatus {
  const status = (rawStatus ?? "").toLowerCase();

  if (status === "done" || status === "completed" || status === "closed") {
    return "done";
  }

  if (status === "in_progress") {
    return "in_progress";
  }

  return "open";
}

export function mapUiDeadlineStatusToDatabaseStatus(status: DeadlineStatus) {
  if (status === "done") {
    return "done";
  }

  if (status === "in_progress") {
    return "in_progress";
  }

  return "open";
}

export function mapRawDeadlinePriorityToUiPriority(
  rawPriority: string | null,
): DeadlinePriority {
  return mapRawRequestPriorityToUiPriority(rawPriority);
}
