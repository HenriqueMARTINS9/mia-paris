import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientHistoryPanel } from "@/features/history/components/client-history-panel";
import { HistoricalSignalsCard } from "@/features/history/components/historical-signals-card";
import { ModelHistoryPanel } from "@/features/history/components/model-history-panel";
import { ProductionHistoryPanel } from "@/features/history/components/production-history-panel";
import type { RequestHistoryPanelData } from "@/features/history/types";

export function RequestHistoryPanel({
  data,
}: Readonly<{ data: RequestHistoryPanelData | null }>) {
  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-black/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Historique intelligent</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <HistoricalSignalsCard
            signals={data.requestSignals}
            title="Lecture rapide du dossier"
          />
        </CardContent>
      </Card>

      <ClientHistoryPanel data={data.clientHistory} />
      <ModelHistoryPanel data={data.modelHistory} />
      <ProductionHistoryPanel data={data.productionHistory} />
    </div>
  );
}
