import { Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoricalSignalsCard } from "@/features/history/components/historical-signals-card";
import { RelatedDocumentsTimeline } from "@/features/history/components/related-documents-timeline";
import { RelatedEmailsTimeline } from "@/features/history/components/related-emails-timeline";
import { RelatedRequestsList } from "@/features/history/components/related-requests-list";
import type { ClientHistoryPanelData } from "@/features/history/types";

export function ClientHistoryPanel({
  data,
}: Readonly<{ data: ClientHistoryPanelData | null }>) {
  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Historique client · {data.clientName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        <HistoricalSignalsCard signals={data.signals} title="Signaux client" />
        <RelatedRequestsList items={data.relatedRequests} title="Demandes sensibles récentes" />
        <RelatedEmailsTimeline items={data.relatedEmails} />
        <RelatedDocumentsTimeline items={data.relatedDocuments} />
      </CardContent>
    </Card>
  );
}
