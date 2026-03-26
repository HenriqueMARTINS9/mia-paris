import {
  mapRawRequestPriorityToUiPriority,
  mapUiPriorityToDatabasePriority,
  requestPriorityMeta,
} from "@/features/requests/metadata";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types";

export { mapUiPriorityToDatabasePriority, requestPriorityMeta };

export const taskStatusMeta: Record<
  TaskStatus,
  { label: string; description: string }
> = {
  todo: {
    label: "À faire",
    description: "Action créée mais non démarrée.",
  },
  in_progress: {
    label: "En cours",
    description: "Traitement métier en cours.",
  },
  blocked: {
    label: "Bloquée",
    description: "Dépendance externe ou arbitrage requis.",
  },
  done: {
    label: "Terminée",
    description: "Action finalisée.",
  },
};

export const taskPriorityOptions: TaskPriority[] = [
  "critical",
  "high",
  "normal",
];

export const taskStatusOptions: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export function mapRawTaskStatusToUiStatus(rawStatus: string | null): TaskStatus {
  const status = (rawStatus ?? "").toLowerCase();

  if (status === "done" || status === "completed" || status === "closed") {
    return "done";
  }

  if (status === "in_progress" || status === "doing") {
    return "in_progress";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "todo";
}

export function mapUiTaskStatusToDatabaseStatus(status: TaskStatus) {
  if (status === "todo") {
    return "todo";
  }

  if (status === "in_progress") {
    return "in_progress";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "done";
}

export function mapRawTaskPriorityToUiPriority(rawPriority: string | null) {
  return mapRawRequestPriorityToUiPriority(rawPriority);
}

export function humanizeTaskType(taskType: string | null) {
  return (taskType ?? "task")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
