import { BellRing } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PushSubscriptionManager } from "@/features/notifications/components/push-subscription-manager";
import type { NotificationPreferencesState } from "@/features/notifications/types";

export function NotificationPreferencesCard({
  state,
}: Readonly<{
  state: NotificationPreferencesState;
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-5">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Notifications push</CardTitle>
        </div>
        <CardDescription>
          Active les alertes métier les plus utiles sur mobile: inbox partagée,
          urgences, tâches critiques, productions bloquées et échecs de sync.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PushSubscriptionManager initialState={state} />
      </CardContent>
    </Card>
  );
}
