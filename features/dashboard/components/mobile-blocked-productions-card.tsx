import Link from "next/link";
import { ArrowUpRight, Factory } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProductionStatusBadge,
  RiskBadge,
} from "@/features/productions/components/production-badges";
import type { ProductionListItem } from "@/features/productions/types";

export function MobileBlockedProductionsCard({
  productions,
}: Readonly<{ productions: ProductionListItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Productions à risque</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {productions.slice(0, 3).map((production) => (
          <Link
            key={production.id}
            href="/productions"
            className="block rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 p-3.5"
          >
            <p className="font-semibold">{production.orderNumber}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {production.clientName} · {production.modelName}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProductionStatusBadge status={production.status} className="w-fit" />
              <RiskBadge risk={production.risk} className="w-fit" />
            </div>
          </Link>
        ))}

        <Link
          href="/productions"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Ouvrir la production
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
