import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReplyDraftHistoryItem } from "@/features/replies/types";
import { formatDateTime } from "@/lib/utils";

export function ReplyHistoryPanel({
  items,
}: Readonly<{
  items: ReplyDraftHistoryItem[];
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Historique des brouillons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {item.action === "saved"
                    ? "Enregistré"
                    : item.action === "ready"
                      ? "Prêt à envoyer"
                      : "Généré"}
                </Badge>
                {item.replyType ? (
                  <Badge variant="outline" className="bg-white">
                    {item.replyType.replace(/_/g, " ")}
                  </Badge>
                ) : null}
              </div>
              {item.subject ? (
                <p className="mt-3 font-medium text-foreground">{item.subject}</p>
              ) : null}
              {item.bodyPreview ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.bodyPreview}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(item.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucun brouillon généré ou enregistré sur ce dossier pour le moment.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
