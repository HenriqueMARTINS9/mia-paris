import Link from "next/link";
import { AlertTriangle, Factory, Inbox, ListTodo, UserRoundX } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardKpis } from "@/features/dashboard/types";

export function MobileDashboardKpis({
  kpis,
}: Readonly<{ kpis: DashboardKpis }>) {
  const items = [
    {
      href: "/emails",
      icon: Inbox,
      label: "Emails",
      value: kpis.openEmails,
    },
    {
      href: "/deadlines",
      icon: AlertTriangle,
      label: "Urgences",
      value: kpis.urgencies24h,
    },
    {
      href: "/taches",
      icon: ListTodo,
      label: "Retards",
      value: kpis.tasksOverdue,
    },
    {
      href: "/productions",
      icon: Factory,
      label: "Blocages",
      value: kpis.productionsBlocked,
    },
    {
      href: "/demandes",
      icon: UserRoundX,
      label: "Sans owner",
      value: kpis.requestsWithoutOwner,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link key={item.label} href={item.href}>
            <Card className="rounded-[1.25rem]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {item.value}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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
