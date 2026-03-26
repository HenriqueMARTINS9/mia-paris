"use client";

import {
  ArrowUpRight,
  CircleGauge,
  Fingerprint,
  TimerReset,
} from "lucide-react";

import {
  ProductionStageBadge,
  RequestPriorityBadge,
  RequestStatusBadge,
} from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RequestOverviewListItem } from "@/features/requests/types";
import { cn, formatDate, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface RequestsTableProps {
  requests: RequestOverviewListItem[];
  selectedRequestId: string | null;
  onSelectRequest: (requestId: string) => void;
}

const channelLabel = {
  email: "Email",
  meeting: "Showroom",
  phone: "Call",
} as const;

export function RequestsTable({
  requests,
  selectedRequestId,
  onSelectRequest,
}: Readonly<RequestsTableProps>) {
  if (requests.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/40 px-6 py-12 text-center">
        <p className="text-base font-semibold">Aucune demande trouvée</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste les filtres pour retrouver une demande active.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[320px]">Demande</TableHead>
          <TableHead className="min-w-[190px]">Client / type</TableHead>
          <TableHead className="min-w-[170px]">Statut</TableHead>
          <TableHead className="min-w-[160px]">Deadline</TableHead>
          <TableHead className="min-w-[170px]">Owner</TableHead>
          <TableHead className="min-w-[160px] text-right">
            Urgence / IA
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => {
          const isSelected = request.id === selectedRequestId;

          return (
            <TableRow
              key={request.id}
              className={cn(
                "cursor-pointer",
                isSelected && "bg-primary/[0.06]",
              )}
              onClick={() => onSelectRequest(request.id)}
            >
              <TableCell>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold tracking-tight">
                        {request.reference}
                      </p>
                      <Badge variant="outline">
                        {channelLabel[request.sourceChannel]}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground/90">
                      {request.sourceSubject}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {request.emailPreview}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(request.lastInboundAt)}</span>
                      <span className="flex items-center gap-1">
                        <Fingerprint className="h-3.5 w-3.5" />
                        {request.clientRef ?? "Réf client absente"}
                      </span>
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <p className="font-semibold">{request.clientName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.requestTypeLabel}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {request.department} · {request.clientCode}
                </p>
              </TableCell>

              <TableCell>
                <div className="flex flex-col gap-2">
                  <RequestStatusBadge status={request.status} className="w-fit" />
                  <div className="flex flex-wrap gap-2">
                    <RequestPriorityBadge
                      priority={request.priority}
                      className="w-fit"
                    />
                    <ProductionStageBadge
                      stage={request.productionStage}
                      className="w-fit"
                    />
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div className="flex items-start gap-2">
                  <TimerReset className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{getDeadlineLabel(request.dueAt)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.dueAt, {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Statut source: {request.rawStatus}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <p className="font-semibold">{request.owner}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.ownerRole}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {request.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="normal-case tracking-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>

              <TableCell className="text-right">
                <div className="inline-flex flex-col items-end gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold">
                    <CircleGauge className="h-4 w-4 text-primary" />
                    {request.urgencyScore}/100
                  </div>
                  <p className="text-sm text-muted-foreground">
                    IA{" "}
                    {request.aiConfidence !== null
                      ? `${Math.round(request.aiConfidence * 100)}%`
                      : "n/a"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {request.rawPriority}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
