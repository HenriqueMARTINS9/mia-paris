import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoryRelatedRequestItem } from "@/features/history/types";
import { formatDateTime } from "@/lib/utils";

export function RelatedRequestsList({
  items,
  title = "Demandes proches",
}: Readonly<{
  items: HistoryRelatedRequestItem[];
  title?: string;
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.status}</Badge>
                <Badge variant="outline">{item.priority}</Badge>
              </div>
              <p className="mt-3 font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.clientName}</p>
              {item.reason ? (
                <p className="mt-2 text-sm text-foreground/80">{item.reason}</p>
              ) : null}
              {item.updatedAt ? (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {formatDateTime(item.updatedAt)}
                </p>
              ) : null}
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune demande similaire ou liée n’a été remontée.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
