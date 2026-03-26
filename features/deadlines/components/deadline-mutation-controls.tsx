"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { CheckCheck, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markDeadlineAsDoneAction,
  updateDeadlinePriorityAction,
} from "@/features/deadlines/actions/update-deadline";
import type { DeadlineListItem } from "@/features/deadlines/types";
import { requestPriorityMeta } from "@/features/requests/metadata";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface DeadlineMutationControlsProps {
  deadline: DeadlineListItem;
}

export function DeadlineMutationControls({
  deadline,
}: Readonly<DeadlineMutationControlsProps>) {
  const router = useRouter();
  const [priorityValue, setPriorityValue] = useState(deadline.priority);

  const [isPriorityPending, startPriorityTransition] = useTransition();
  const [isDonePending, startDoneTransition] = useTransition();

  function handlePrioritySave() {
    startPriorityTransition(async () => {
      const result = await updateDeadlinePriorityAction({
        deadlineId: deadline.id,
        priority: priorityValue,
        requestId: deadline.requestId,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleMarkAsDone() {
    startDoneTransition(async () => {
      const result = await markDeadlineAsDoneAction({
        deadlineId: deadline.id,
        requestId: deadline.requestId,
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
          label="Priorité"
          description="Recaler le degré d'urgence métier."
          control={
            <Select
              value={priorityValue}
              onChange={(event) =>
                setPriorityValue(event.target.value as typeof deadline.priority)
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
              onClick={handlePrioritySave}
              disabled={isPriorityPending || priorityValue === deadline.priority}
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
          label="Traitement"
          description="Clore cette deadline dès que l'action attendue a bien été absorbée."
          control={
            <p className="text-sm leading-6 text-muted-foreground">
              {deadline.status === "done"
                ? "Cette deadline est déjà marquée comme traitée."
                : "La deadline sortira de la vue critique après clôture."}
            </p>
          }
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkAsDone}
              disabled={isDonePending || deadline.status === "done"}
            >
              {isDonePending ? (
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
