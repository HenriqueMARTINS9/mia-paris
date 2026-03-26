import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface BlockingReasonCellProps {
  blockingReason: string | null;
  isBlocked: boolean;
}

export function BlockingReasonCell({
  blockingReason,
  isBlocked,
}: Readonly<BlockingReasonCellProps>) {
  if (!blockingReason && !isBlocked) {
    return <span className="text-sm text-muted-foreground">Aucun blocage</span>;
  }

  return (
    <div className="inline-flex max-w-[18rem] items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Blocage</span>
          {isBlocked ? <Badge variant="destructive">Prioritaire</Badge> : null}
        </div>
        <p className="mt-1 line-clamp-2">{blockingReason ?? "Statut bloqué sans motif renseigné."}</p>
      </div>
    </div>
  );
}
