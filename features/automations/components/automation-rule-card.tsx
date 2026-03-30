import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutomationRuleDefinition } from "@/features/automations/types";

export function AutomationRuleCard({
  rule,
}: Readonly<{ rule: AutomationRuleDefinition }>) {
  return (
    <Card className="border-black/[0.06] bg-white/88">
      <CardHeader className="gap-3 border-b border-black/[0.05] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-[#fbf8f2]">
            {rule.lane === "process" ? "À traiter" : "À décider"}
          </Badge>
          <Badge variant="outline" className="bg-white">
            {rule.priority}
          </Badge>
          {rule.thresholdHours ? (
            <Badge variant="outline" className="bg-white">
              seuil {rule.thresholdHours}h
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-base">{rule.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        <p className="text-sm leading-6 text-muted-foreground">{rule.description}</p>
        <div className="rounded-2xl border border-black/[0.06] bg-[#fbf8f2]/80 px-4 py-3 text-sm text-foreground/80">
          {rule.nextAction}
        </div>
      </CardContent>
    </Card>
  );
}
