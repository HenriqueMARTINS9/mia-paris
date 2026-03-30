import Link from "next/link";
import { ArrowUpRight, FolderKanban } from "lucide-react";

import { RequestPriorityBadge, RequestStatusBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestOverviewListItem } from "@/features/requests/types";
import { formatDateTime } from "@/lib/utils";

export function PriorityRequestsPanel({
  requests,
}: Readonly<{ requests: RequestOverviewListItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Demandes prioritaires</CardTitle>
          </div>
          <Badge variant="outline" className="bg-[#fbf8f2]">
            {requests.length}
          </Badge>
        </div>
        <CardDescription>
          Dossiers à pousser en premier dans la journée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length > 0 ? (
          requests.map((request) => (
            <Link
              key={request.id}
              href={`/requests/${request.id}`}
              className="block rounded-[1.2rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4 transition hover:border-primary/20 hover:bg-white/95"
            >
              <div className="space-y-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{request.title}</p>
                    <RequestPriorityBadge
                      priority={request.priority}
                      className="normal-case tracking-normal"
                    />
                    <RequestStatusBadge
                      status={request.status}
                      className="normal-case tracking-normal"
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {request.clientName} · {request.department}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/80">
                    {request.emailPreview}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span>{request.dueAt ? formatDateTime(request.dueAt) : "Sans date"}</span>
                  <span>{request.owner}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    Ouvrir
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune demande prioritaire détectée pour l’instant.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
