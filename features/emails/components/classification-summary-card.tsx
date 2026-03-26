import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailListItem } from "@/features/emails/types";

export function ClassificationSummaryCard({
  email,
}: Readonly<{ email: EmailListItem }>) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Qualification IA</Badge>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <CardTitle className="text-base">Synthèse de classification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem
            label="Client"
            value={email.classification.suggestedFields.clientName ?? "Non détecté"}
          />
          <SummaryItem
            label="Type"
            value={email.classification.suggestedFields.requestType ?? "Non détecté"}
          />
          <SummaryItem
            label="Confiance"
            value={
              email.confidence !== null ? `${Math.round(email.confidence * 100)}%` : "n/a"
            }
          />
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/65 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            JSON simplifié
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-foreground/80">
            {JSON.stringify(email.classification.simplifiedJson, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/65 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-sm font-semibold">{value}</p>
    </div>
  );
}
