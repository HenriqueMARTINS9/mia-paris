import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReplyDraftContext } from "@/features/replies/types";
import { formatDateTime } from "@/lib/utils";

export function ReplyContextSummary({
  context,
}: Readonly<{
  context: ReplyDraftContext;
}>) {
  const chips = [
    context.clientName,
    context.requestType ? humanize(context.requestType) : null,
    context.requestStatus ? humanize(context.requestStatus) : null,
    context.requestPriority ? humanize(context.requestPriority) : null,
    context.productionStatus ? `Prod ${humanize(context.productionStatus)}` : null,
    context.productionRisk ? `Risque ${humanize(context.productionRisk)}` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Contexte utilisé</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Badge key={chip} variant="outline" className="bg-[#fbf8f2]">
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="space-y-3 text-sm leading-6 text-foreground/80">
          {context.linkedRequestTitle ? (
            <p>
              <span className="font-semibold text-foreground">Dossier lié:</span>{" "}
              {context.linkedRequestTitle}
            </p>
          ) : null}
          {context.requestReference ? (
            <p>
              <span className="font-semibold text-foreground">Référence:</span>{" "}
              {context.requestReference}
            </p>
          ) : null}
          {context.productionLabel ? (
            <p>
              <span className="font-semibold text-foreground">Production:</span>{" "}
              {context.productionLabel}
            </p>
          ) : null}
          {context.dueAt ? (
            <p>
              <span className="font-semibold text-foreground">Deadline:</span>{" "}
              {formatDateTime(context.dueAt)}
            </p>
          ) : null}
          {context.summary ? <p>{context.summary}</p> : null}
          {context.requestedAction ? (
            <p>
              <span className="font-semibold text-foreground">Action attendue:</span>{" "}
              {context.requestedAction}
            </p>
          ) : null}
        </div>

        {context.historicalSignals && context.historicalSignals.length > 0 ? (
          <div className="rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Signaux utiles
            </p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-foreground/80">
              {context.historicalSignals.slice(0, 3).map((signal) => (
                <p key={signal}>• {signal}</p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
