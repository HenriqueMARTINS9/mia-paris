import { Factory } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoricalSignalsCard } from "@/features/history/components/historical-signals-card";
import { RelatedDocumentsTimeline } from "@/features/history/components/related-documents-timeline";
import { RelatedEmailsTimeline } from "@/features/history/components/related-emails-timeline";
import { RelatedRequestsList } from "@/features/history/components/related-requests-list";
import type { ProductionHistoryPanelData } from "@/features/history/types";
import { formatDateTime } from "@/lib/utils";

export function ProductionHistoryPanel({
  data,
}: Readonly<{ data: ProductionHistoryPanelData | null }>) {
  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Historique opérationnel élargi</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <HistoricalSignalsCard signals={data.signals} title="Signaux production" />
        <div className="grid gap-4 xl:grid-cols-2">
          <RelatedRequestsList items={data.relatedRequests} title="Demandes liées" />
          <RelatedDocumentsTimeline items={data.relatedDocuments} />
          <RelatedEmailsTimeline items={data.relatedEmails} />
          <Card>
            <CardHeader className="border-b border-black/[0.06] pb-4">
              <CardTitle>Derniers blocages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentBlockages.length > 0 ? (
                data.recentBlockages.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
                  >
                    <p className="font-medium">{item.title}</p>
                    {item.subtitle ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-foreground/80">
                      {item.date ? formatDateTime(item.date) : "Date indisponible"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun blocage récent supplémentaire n’est remonté.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
