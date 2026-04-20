"use client";

import { Badge } from "@/components/ui/badge";
import { emailInboxBucketMeta } from "@/features/emails/metadata";
import type { EmailInboxBucket } from "@/features/emails/types";
import { cn } from "@/lib/utils";

export function EmailInboxBucketBadge({
  bucket,
}: Readonly<{ bucket: EmailInboxBucket }>) {
  return (
    <Badge
      className={cn(
        bucket === "important" &&
          "border-primary/[0.15] bg-primary/[0.08] text-primary",
        bucket === "promotional" &&
          "border-black/[0.08] bg-black/[0.04] text-foreground/80",
        bucket === "to_review" &&
          "border-amber-500/20 bg-amber-500/10 text-amber-700",
      )}
    >
      {emailInboxBucketMeta[bucket].label}
    </Badge>
  );
}
