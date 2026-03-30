import { AlertTriangle, BellRing, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoricalSignal } from "@/features/history/types";

export function HistoricalSignalsCard({
  signals,
  title = "Signaux historiques",
}: Readonly<{
  signals: HistoricalSignal[];
  title?: string;
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.length > 0 ? (
          signals.map((signal) => (
            <div
              key={signal.id}
              className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
            >
              <div className="flex items-center gap-2">
                {signal.tone === "critical" ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : signal.tone === "warning" ? (
                  <BellRing className="h-4 w-4 text-[var(--accent)]" />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
                <p className="font-semibold">{signal.title}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                {signal.description}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun signal historique notable n’est remonté pour ce périmètre.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
