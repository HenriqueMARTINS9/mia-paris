import Link from "next/link";
import {
  AlertTriangle,
  Factory,
  FolderKanban,
  Inbox,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardKpis } from "@/features/dashboard/types";

export function DashboardFocusCards({
  kpis,
}: Readonly<{ kpis: DashboardKpis }>) {
  const items = [
    {
      href: "/deadlines",
      icon: AlertTriangle,
      label: "Urgences du jour",
      value: kpis.urgenciesToday,
    },
    {
      href: "/demandes",
      icon: FolderKanban,
      label: "Demandes non assignées",
      value: kpis.requestsWithoutOwner,
    },
    {
      href: "/productions",
      icon: Factory,
      label: "Productions bloquées",
      value: kpis.productionsBlocked,
    },
    {
      href: "/productions",
      icon: ShieldAlert,
      label: "Productions à risque",
      value: kpis.productionsHighRisk,
    },
    {
      href: "/emails?bucket=important",
      icon: Inbox,
      label: "Emails importants",
      value: kpis.importantEmails,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link key={item.label} href={item.href}>
            <Card className="h-full rounded-[1.2rem] transition hover:border-primary/15 hover:bg-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {item.value}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
