import Link from "next/link";
import { ArrowUpRight, Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardAssistantActionItem } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils";

export function RecentAssistantActionsCard({
  actions,
}: Readonly<{ actions: DashboardAssistantActionItem[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Dernières actions de Claw</CardTitle>
          </div>
          <Badge variant="outline" className="bg-[#fbf8f2]">
            {actions.length}
          </Badge>
        </div>
        <CardDescription>
          Ce que l’assistant a déjà absorbé, créé ou classé avant votre passage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length > 0 ? (
          actions.map((action) => {
            const content = (
              <div className="space-y-2 rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{action.title}</p>
                  <ActionStatusBadge status={action.status} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {action.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDateTime(action.createdAt)}</span>
                  {action.href ? (
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      Ouvrir
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
              </div>
            );

            return action.href ? (
              <Link key={action.id} href={action.href}>
                {content}
              </Link>
            ) : (
              <div key={action.id}>{content}</div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune action récente de Claw à remonter pour le moment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ActionStatusBadge({
  status,
}: Readonly<{ status: DashboardAssistantActionItem["status"] }>) {
  if (status === "failure") {
    return <Badge variant="destructive">Échec</Badge>;
  }

  if (status === "success") {
    return <Badge className="bg-primary/[0.08] text-primary">OK</Badge>;
  }

  return <Badge variant="outline">Info</Badge>;
}
