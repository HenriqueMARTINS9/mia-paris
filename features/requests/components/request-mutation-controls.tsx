"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCheck, Loader2, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  assignRequestAction,
  markRequestAsProcessedAction,
  updateRequestPriorityAction,
  updateRequestStatusAction,
} from "@/features/requests/actions/update-request";
import {
  formatAssigneeLabel,
  getStatusOptionsForRequestType,
  requestPriorityMeta,
  requestStatusMeta,
} from "@/features/requests/metadata";
import type {
  RequestAssigneeOption,
  RequestOverviewListItem,
} from "@/features/requests/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface RequestMutationControlsProps {
  request: RequestOverviewListItem;
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
}

export function RequestMutationControls({
  request,
  assignees,
  assigneesError = null,
}: Readonly<RequestMutationControlsProps>) {
  const router = useRouter();
  const currentAssigneeId =
    request.assignedUserId ??
    assignees.find((assignee) => assignee.fullName === request.owner)?.id ??
    "";
  const [statusValue, setStatusValue] = useState(request.status);
  const [priorityValue, setPriorityValue] = useState(request.priority);
  const [assigneeValue, setAssigneeValue] = useState(currentAssigneeId);

  const [isStatusPending, startStatusTransition] = useTransition();
  const [isPriorityPending, startPriorityTransition] = useTransition();
  const [isAssignmentPending, startAssignmentTransition] = useTransition();
  const [isCompletePending, startCompleteTransition] = useTransition();

  const statusOptions = useMemo(
    () => getStatusOptionsForRequestType(request.requestType),
    [request.requestType],
  );

  useEffect(() => {
    setStatusValue(request.status);
  }, [request.status]);

  useEffect(() => {
    setPriorityValue(request.priority);
  }, [request.priority]);

  useEffect(() => {
    setAssigneeValue(currentAssigneeId);
  }, [currentAssigneeId]);

  function handleStatusSave() {
    startStatusTransition(async () => {
      const result = await updateRequestStatusAction({
        requestId: request.id,
        requestType: request.requestType,
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
      const result = await updateRequestPriorityAction({
        requestId: request.id,
        priority: priorityValue,
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
      const result = await assignRequestAction({
        requestId: request.id,
        assignedUserId: assigneeValue,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleMarkAsProcessed() {
    startCompleteTransition(async () => {
      const result = await markRequestAsProcessedAction({
        requestId: request.id,
        requestType: request.requestType,
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
          description="Mettre à jour l'étape métier de la demande."
          control={
            <Select
              value={statusValue}
              onChange={(event) =>
                setStatusValue(event.target.value as typeof request.status)
              }
              disabled={isStatusPending}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {requestStatusMeta[status].label}
                </option>
              ))}
            </Select>
          }
          action={
            <Button
              size="sm"
              onClick={handleStatusSave}
              disabled={isStatusPending || statusValue === request.status}
            >
              {isStatusPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          }
        />

        <ActionRow
          label="Priorité"
          description="Ajuster le niveau d'urgence du dossier."
          control={
            <Select
              value={priorityValue}
              onChange={(event) =>
                setPriorityValue(event.target.value as typeof request.priority)
              }
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
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePrioritySave}
              disabled={isPriorityPending || priorityValue === request.priority}
            >
              {isPriorityPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Mettre à jour
                </>
              )}
            </Button>
          }
        />

        <ActionRow
          label="Assignation"
          description={
            assigneesError ??
            "Réassigner la demande à un utilisateur MIA PARIS."
          }
          control={
            <Select
              value={assigneeValue}
              onChange={(event) => setAssigneeValue(event.target.value)}
              disabled={isAssignmentPending || assignees.length === 0}
            >
              <option value="">
                {assignees.length === 0
                  ? "Aucun utilisateur disponible"
                  : "Sélectionner un utilisateur"}
              </option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {formatAssigneeLabel(assignee)}
                </option>
              ))}
            </Select>
          }
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={handleAssignmentSave}
              disabled={
                isAssignmentPending ||
                assignees.length === 0 ||
                !assigneeValue ||
                assigneeValue === currentAssigneeId
              }
            >
              {isAssignmentPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                <>
                  <UserRound className="h-4 w-4" />
                  Assigner
                </>
              )}
            </Button>
          }
        />

        <ActionRow
          label="Traitement"
          description="Clore rapidement le dossier quand la demande a bien été absorbée par le workflow."
          control={
            <p className="text-sm leading-6 text-muted-foreground">
              {request.status === "approved"
                ? "Cette demande est déjà considérée comme traitée."
                : "Cette action positionne le dossier sur un état métier validé."}
            </p>
          }
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkAsProcessed}
              disabled={isCompletePending || request.status === "approved"}
            >
              {isCompletePending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Marquer traitée
                </>
              )}
            </Button>
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
