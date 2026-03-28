import Link from "next/link";
import { ArrowUpRight, FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestPriorityBadge, RequestStatusBadge } from "@/components/crm/request-badges";
import type { ProductionLinkedRequestItem } from "@/features/productions/types";
import {
  mapRawRequestPriorityToUiPriority,
  mapRawRequestStatusToUiStatus,
} from "@/features/requests/metadata";

export function ProductionLinkedRequests({
  requests,
}: Readonly<{ requests: ProductionLinkedRequestItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Demandes liées</CardTitle>
        </div>
        <CardDescription>
          Dossiers CRM qui pilotent ou expliquent cette production.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length > 0 ? (
          requests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{request.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.status ? (
                      <RequestStatusBadge
                        status={mapRawRequestStatusToUiStatus(
                          request.status,
                          "production_followup",
                        )}
                        className="normal-case tracking-normal"
                      />
                    ) : (
                      <Badge variant="outline">Statut inconnu</Badge>
                    )}
                    {request.priority ? (
                      <RequestPriorityBadge
                        priority={mapRawRequestPriorityToUiPriority(request.priority)}
                        className="normal-case tracking-normal"
                      />
                    ) : null}
                  </div>
                </div>

                <Button asChild size="sm" variant="outline">
                  <Link href={`/requests/${request.id}`}>
                    Ouvrir
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucune demande n&apos;est reliée à cette production.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
