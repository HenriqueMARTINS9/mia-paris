"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { CalendarClock, Loader2, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { requestPriorityMeta } from "@/features/requests/metadata";
import type { RequestAssigneeOption } from "@/features/requests/types";
import { taskStatusMeta, taskStatusOptions } from "@/features/tasks/metadata";
import {
  assignTaskAction,
  updateTaskDueDateAction,
  updateTaskPriorityAction,
  updateTaskStatusAction,
} from "@/features/tasks/actions/update-task";
import type { TaskListItem } from "@/features/tasks/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface TaskMutationControlsProps {
  task: TaskListItem;
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
}

export function TaskMutationControls({
  task,
  assignees,
  assigneesError = null,
}: Readonly<TaskMutationControlsProps>) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState(task.status);
  const [priorityValue, setPriorityValue] = useState(task.priority);
  const [assigneeValue, setAssigneeValue] = useState(task.assignedUserId ?? "");
  const [dueAtValue, setDueAtValue] = useState(task.dueAt ? task.dueAt.slice(0, 10) : "");

  const [isStatusPending, startStatusTransition] = useTransition();
  const [isPriorityPending, startPriorityTransition] = useTransition();
  const [isAssignmentPending, startAssignmentTransition] = useTransition();
  const [isDueDatePending, startDueDateTransition] = useTransition();

  function handleStatusSave() {
    startStatusTransition(async () => {
      const result = await updateTaskStatusAction({
        taskId: task.id,
        requestId: task.requestId,
        status: statusValue,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handlePrioritySave() {
    startPriorityTransition(async () => {
      const result = await updateTaskPriorityAction({
        taskId: task.id,
        priority: priorityValue,
        requestId: task.requestId,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleAssignmentSave() {
    startAssignmentTransition(async () => {
      const result = await assignTaskAction({
        taskId: task.id,
        assignedUserId: assigneeValue,
        requestId: task.requestId,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleDueDateSave() {
    startDueDateTransition(async () => {
      const result = await updateTaskDueDateAction({
        taskId: task.id,
        dueAt: dueAtValue || null,
        requestId: task.requestId,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
      <div className="grid gap-4">
        <ActionRow
          label="Statut"
          description="Piloter l'avancement de la tâche."
          control={
            <Select
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value as typeof task.status)}
              disabled={isStatusPending}
            >
              {taskStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {taskStatusMeta[status].label}
                </option>
              ))}
            </Select>
          }
          action={
            <ActionButton
              isPending={isStatusPending}
              disabled={isStatusPending || statusValue === task.status}
              label="Enregistrer"
              onClick={handleStatusSave}
            />
          }
        />

        <ActionRow
          label="Priorité"
          description="Ajuster l'urgence de traitement."
          control={
            <Select
              value={priorityValue}
              onChange={(event) => setPriorityValue(event.target.value as typeof task.priority)}
              disabled={isPriorityPending}
            >
              {(["critical", "high", "normal"] as const).map((priority) => (
                <option key={priority} value={priority}>
                  {requestPriorityMeta[priority].label}
                </option>
              ))}
            </Select>
          }
          action={
            <ActionButton
              isPending={isPriorityPending}
              disabled={isPriorityPending || priorityValue === task.priority}
              label="Mettre à jour"
              onClick={handlePrioritySave}
              variant="secondary"
            />
          }
        />

        <ActionRow
          label="Responsable"
          description={assigneesError ?? "Réassigner la tâche à un utilisateur MIA PARIS."}
          control={
            <Select
              value={assigneeValue}
              onChange={(event) => setAssigneeValue(event.target.value)}
              disabled={isAssignmentPending || assignees.length === 0}
            >
              <option value="">
                {assignees.length > 0 ? "Sélectionner un responsable" : "Aucun utilisateur disponible"}
              </option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.fullName}
                </option>
              ))}
            </Select>
          }
          action={
            <ActionButton
              isPending={isAssignmentPending}
              disabled={isAssignmentPending || assignees.length === 0 || !assigneeValue || assigneeValue === (task.assignedUserId ?? "")}
              label="Assigner"
              onClick={handleAssignmentSave}
              variant="outline"
              icon={UserRound}
            />
          }
        />

        <ActionRow
          label="Échéance"
          description="Déplacer la date de rendu ou la planifier."
          control={
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dueAtValue}
                onChange={(event) => setDueAtValue(event.target.value)}
                className="pl-10"
                disabled={isDueDatePending}
              />
            </div>
          }
          action={
            <ActionButton
              isPending={isDueDatePending}
              disabled={isDueDatePending || dueAtValue === (task.dueAt ? task.dueAt.slice(0, 10) : "")}
              label="Sauver date"
              onClick={handleDueDateSave}
            />
          }
        />
      </div>
    </div>
  );
}

interface ActionRowProps {
  label: string;
  description: string;
  control: ReactNode;
  action: ReactNode;
}

function ActionRow({ label, description, control, action }: Readonly<ActionRowProps>) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 lg:grid-cols-[120px_minmax(0,1fr)_auto] lg:items-center">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      {control}
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

interface ActionButtonProps {
  disabled: boolean;
  isPending: boolean;
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline";
  icon?: typeof Save | typeof UserRound;
}

function ActionButton({
  disabled,
  isPending,
  label,
  onClick,
  variant = "default",
  icon: Icon = Save,
}: Readonly<ActionButtonProps>) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} disabled={disabled}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          En cours
        </>
      ) : (
        <>
          <Icon className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
