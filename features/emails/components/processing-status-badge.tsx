import { Badge } from "@/components/ui/badge";
import { emailStatusMeta } from "@/features/emails/metadata";
import type { EmailProcessingStatus } from "@/features/emails/types";
import { cn } from "@/lib/utils";

export function ProcessingStatusBadge({
  status,
}: Readonly<{ status: EmailProcessingStatus }>) {
  return (
    <Badge
      className={cn(
        status === "new" &&
          "border-primary/[0.15] bg-primary/[0.08] text-primary",
        status === "review" &&
          "border-destructive/20 bg-destructive/10 text-destructive",
        status === "processed" &&
          "border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.1)] text-[var(--success)]",
      )}
    >
      {emailStatusMeta[status].label}
    </Badge>
  );
}
