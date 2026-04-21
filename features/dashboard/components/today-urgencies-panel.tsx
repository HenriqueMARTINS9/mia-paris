import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeadlineListItem } from "@/features/deadlines/types";
import { formatDateTime } from "@/lib/utils";

export function TodayUrgenciesPanel({
  deadlines,
}: Readonly<{ deadlines: DeadlineListItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle>Urgences du jour</CardTitle>
          </div>
          <Badge variant="outline" className="bg-[#fbf8f2]">
            {deadlines.length}
          </Badge>
        </div>
        <CardDescription>
          Échéances à arbitrer aujourd’hui ou déjà en retard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length > 0 ? (
          deadlines.map((deadline) => (
            <div
              key={deadline.id}
              className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
            >
              <div className="space-y-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{deadline.label}</p>
                    <RequestPriorityBadge
                      priority={deadline.priority}
                      className="normal-case tracking-normal"
                    />
                    {deadline.isOverdue ? <Badge variant="destructive">En retard</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {deadline.clientName} · {deadline.requestTitle}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span>
                    {deadline.deadlineAt
                      ? formatDateTime(deadline.deadlineAt)
                      : "Sans deadline"}
                  </span>
                  {deadline.requestId ? (
                    <Link
                      href={`/requests/${deadline.requestId}`}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
                    >
                      Ouvrir la demande
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune urgence critique à remonter pour aujourd’hui.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
