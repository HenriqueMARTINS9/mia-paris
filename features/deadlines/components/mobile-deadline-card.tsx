"use client";

import { useTransition } from "react";
import { Loader2, TimerReset } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { MobileStatusActionSheet } from "@/components/crm/mobile-status-action-sheet";
import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markDeadlineAsDoneAction } from "@/features/deadlines/actions/update-deadline";
import { DeadlineStatusBadge } from "@/features/deadlines/components/deadline-badges";
import { DeadlineMutationControls } from "@/features/deadlines/components/deadline-mutation-controls";
import type { DeadlineListItem } from "@/features/deadlines/types";
import { formatDate, getDeadlineLabel } from "@/lib/utils";

interface MobileDeadlineCardProps {
  deadline: DeadlineListItem;
  onOpen: () => void;
}

export function MobileDeadlineCard({
  deadline,
  onOpen,
}: Readonly<MobileDeadlineCardProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMarkDone() {
    startTransition(async () => {
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
    <Card className="rounded-[1.35rem]">
      <CardContent className="p-4">
        <div
          role="button"
          tabIndex={0}
          className="grid gap-4 text-left"
          onClick={onOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen();
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 break-words text-[1.02rem] font-semibold tracking-tight text-foreground">
                {deadline.label}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {deadline.clientName} · {deadline.linkedObjectLabel}
              </p>
            </div>
            <div className="shrink-0">
              <MobileStatusActionSheet
                title="Actions deadline"
                description="Clôturer rapidement l’échéance ou ajuster sa priorité."
              >
                <DeadlineMutationControls deadline={deadline} />
              </MobileStatusActionSheet>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <RequestPriorityBadge priority={deadline.priority} className="w-fit" />
            <DeadlineStatusBadge status={deadline.status} className="w-fit" />
            <UrgencyBadge deadline={deadline} />
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Échéance
              </p>
              <p className="mt-2 font-semibold">
                {deadline.deadlineAt ? getDeadlineLabel(deadline.deadlineAt) : "Sans date"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {deadline.deadlineAt ? formatDate(deadline.deadlineAt) : "À planifier"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Contexte
              </p>
              <p className="mt-2 font-semibold">{deadline.requestTitle}</p>
              <p className="mt-1 text-muted-foreground">
                {deadline.orderNumber ?? deadline.productionStatus ?? "Objet métier"}
              </p>
            </div>
          </div>
        </div>

        {deadline.status !== "done" ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            onClick={(event) => {
              event.stopPropagation();
              handleMarkDone();
            }}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                En cours
              </>
            ) : (
              <>
                <TimerReset className="h-4 w-4" />
                Marquer traitée
              </>
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UrgencyBadge({
  deadline,
}: Readonly<{ deadline: DeadlineListItem }>) {
  const hours = getHoursUntil(deadline.deadlineAt);

  if (deadline.isOverdue) {
    return <Badge variant="destructive">Retard</Badge>;
  }

  if (hours !== null && hours <= 24) {
    return <Badge variant="outline">{"< 24h"}</Badge>;
  }

  if (hours !== null && hours <= 48) {
    return <Badge variant="outline">{"< 48h"}</Badge>;
  }

  return null;
}

function getHoursUntil(value: string | null) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return null;
  }

  return Math.round((time - Date.now()) / 3_600_000);
}
