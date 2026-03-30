import { Shirt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoricalSignalsCard } from "@/features/history/components/historical-signals-card";
import { RelatedDocumentsTimeline } from "@/features/history/components/related-documents-timeline";
import { RelatedRequestsList } from "@/features/history/components/related-requests-list";
import type { ModelHistoryPanelData } from "@/features/history/types";

export function ModelHistoryPanel({
  data,
}: Readonly<{ data: ModelHistoryPanelData | null }>) {
  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Shirt className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Historique modèle · {data.modelName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        <HistoricalSignalsCard signals={data.signals} title="Signaux modèle" />
        <RelatedRequestsList items={data.relatedRequests} title="Demandes déjà vues" />
        <div className="xl:col-span-2">
          <RelatedDocumentsTimeline items={data.relatedDocuments} />
        </div>
      </CardContent>
    </Card>
  );
}
