"use client";

import { Button } from "@/components/ui/button";
import { replyTemplateOrder } from "@/features/replies/lib/reply-templates";
import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";
import type { ReplyDraftType } from "@/features/replies/types";

export function QuickReplyActions({
  disabled = false,
  onSelect,
  value,
}: Readonly<{
  disabled?: boolean;
  onSelect: (value: ReplyDraftType) => void;
  value: ReplyDraftType;
}>) {
  return (
    <div className="flex flex-wrap gap-2">
      {replyTemplateOrder.map((replyType) => (
        <Button
          key={replyType}
          type="button"
          variant={value === replyType ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(replyType)}
        >
          {replyTypeMeta[replyType].label}
        </Button>
      ))}
    </div>
  );
}
