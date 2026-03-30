"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MobileStatusActionSheet } from "@/components/crm/mobile-status-action-sheet";
import {
  ProductionStageBadge,
  RequestPriorityBadge,
  RequestStatusBadge,
} from "@/components/crm/request-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RequestMutationControls } from "@/features/requests/components/request-mutation-controls";
import type {
  RequestAssigneeOption,
  RequestOverviewListItem,
} from "@/features/requests/types";
import { formatDate, getDeadlineLabel } from "@/lib/utils";

interface MobileRequestCardProps {
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  onOpen: () => void;
  request: RequestOverviewListItem;
}

export function MobileRequestCard({
  assignees,
  assigneesError = null,
  onOpen,
  request,
}: Readonly<MobileRequestCardProps>) {
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
              <p className="text-sm font-semibold text-muted-foreground">
                {request.clientName}
              </p>
              <p className="mt-2 line-clamp-2 break-words text-[1.02rem] font-semibold tracking-tight text-foreground">
                {request.sourceSubject}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {request.requestTypeLabel} · {request.reference}
              </p>
            </div>
            <div className="shrink-0">
              <MobileStatusActionSheet
                title="Actions demande"
                description="Mettre à jour le statut, la priorité ou l’assignation du dossier."
              >
                <div className="grid gap-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/requests/${request.id}`}>
                      Ouvrir le dossier
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <RequestMutationControls
                    request={request}
                    assignees={assignees}
                    assigneesError={assigneesError}
                  />
                </div>
              </MobileStatusActionSheet>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <RequestStatusBadge status={request.status} className="w-fit" />
            <RequestPriorityBadge priority={request.priority} className="w-fit" />
            <ProductionStageBadge
              stage={request.productionStage}
              className="w-fit"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Deadline
              </p>
              <p className="mt-2 font-semibold">{getDeadlineLabel(request.dueAt)}</p>
              <p className="mt-1 text-muted-foreground">
                {formatDate(request.dueAt)}
              </p>
            </div>
            <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Owner
              </p>
              <p className="mt-2 font-semibold">{request.owner}</p>
              <p className="mt-1 text-muted-foreground">{request.department}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
