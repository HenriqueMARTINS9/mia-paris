import { Scale } from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionCenterCard } from "@/features/action-center/components/action-center-card";
import type { ActionCenterItem } from "@/features/action-center/types";
import type { RequestAssigneeOption } from "@/features/requests/types";

export function ToDecidePanel({
  assignees,
  assigneesError = null,
  currentAppUserId,
  items,
}: Readonly<{
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  currentAppUserId: string | null;
  items: ActionCenterItem[];
}>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <CardTitle>À décider</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <ActionCenterCard
              key={item.id}
              assignees={assignees}
              assigneesError={assigneesError}
              currentAppUserId={currentAppUserId}
              item={item}
            />
          ))
        ) : (
          <EmptyState
            title="Aucun arbitrage urgent"
            description="Les validations lentes, blocages critiques et doublons probables ne remontent plus pour l’instant."
            icon={Scale}
          />
        )}
      </CardContent>
    </Card>
  );
}
