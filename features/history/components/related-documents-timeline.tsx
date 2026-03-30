import Link from "next/link";
import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoryTimelineItem } from "@/features/history/types";
import { formatDate } from "@/lib/utils";

export function RelatedDocumentsTimeline({
  items,
}: Readonly<{ items: HistoryTimelineItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Documents liés</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <DocumentRow key={item.id} item={item} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun document lié n’a été remonté sur ce périmètre.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentRow({ item }: Readonly<{ item: HistoryTimelineItem }>) {
  const content = (
    <div className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4">
      <p className="font-medium">{item.title}</p>
      {item.subtitle ? (
        <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
      ) : null}
      <p className="mt-2 text-sm text-foreground/80">
        {item.date ? `Mis à jour ${formatDate(item.date)}` : "Date indisponible"}
      </p>
    </div>
  );

  if (!item.href) {
    return content;
  }

  const isExternal = /^https?:\/\//.test(item.href);

  return isExternal ? (
    <a href={item.href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={item.href}>{content}</Link>
  );
}
