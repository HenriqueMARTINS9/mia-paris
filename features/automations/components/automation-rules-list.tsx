import { CircuitBoard } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationRuleCard } from "@/features/automations/components/automation-rule-card";
import type { AutomationRuleDefinition } from "@/features/automations/types";

export function AutomationRulesList({
  rules,
}: Readonly<{ rules: AutomationRuleDefinition[] }>) {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <CircuitBoard className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Règles d’automations V1</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {rules.map((rule) => (
          <AutomationRuleCard key={rule.key} rule={rule} />
        ))}
      </CardContent>
    </Card>
  );
}
