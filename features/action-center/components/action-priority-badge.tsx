import { Badge } from "@/components/ui/badge";
import type { AutomationPriority } from "@/features/automations/types";

export function ActionPriorityBadge({
  priority,
}: Readonly<{ priority: AutomationPriority }>) {
  if (priority === "critical") {
    return <Badge variant="destructive">Critique</Badge>;
  }

  if (priority === "high") {
    return <Badge className="bg-[var(--accent)] text-white hover:bg-[var(--accent)]">Haute</Badge>;
  }

  return <Badge variant="outline">Normale</Badge>;
}
