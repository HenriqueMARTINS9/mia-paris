import Link from "next/link";
import { Siren } from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeadlineStatusBadge } from "@/features/deadlines/components/deadline-badges";
import type { DeadlineListItem } from "@/features/deadlines/types";
import { formatDateTime, getDeadlineLabel } from "@/lib/utils";

export function TodayUrgenciesPanel({
  deadlines,
}: Readonly<{
  deadlines: DeadlineListItem[];
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Urgences &lt; 24h</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length > 0 ? (
          deadlines.map((deadline) => (
            <Link
              key={deadline.id}
              href={deadline.requestId ? `/requests/${deadline.requestId}` : "/deadlines"}
              className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fff8f3] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {deadline.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {deadline.clientName || deadline.requestTitle || deadline.linkedObjectLabel}
                  </p>
                </div>
                <div className="text-right text-xs font-semibold text-destructive">
                  {deadline.deadlineAt ? getDeadlineLabel(deadline.deadlineAt) : "À planifier"}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <RequestPriorityBadge priority={deadline.priority} />
                <DeadlineStatusBadge status={deadline.status} />
                {deadline.deadlineAt ? <span>{formatDateTime(deadline.deadlineAt)}</span> : null}
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucune urgence critique à moins de 24h.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
