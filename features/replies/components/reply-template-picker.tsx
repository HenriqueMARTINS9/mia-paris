"use client";

import { QuickReplyActions } from "@/features/replies/components/quick-reply-actions";
import { ReplyTypeSelect } from "@/features/replies/components/reply-type-select";
import type { ReplyDraftType } from "@/features/replies/types";

export function ReplyTemplatePicker({
  disabled = false,
  onSelect,
  value,
}: Readonly<{
  disabled?: boolean;
  onSelect: (value: ReplyDraftType) => void;
  value: ReplyDraftType;
}>) {
  return (
    <div className="grid gap-3">
      <ReplyTypeSelect value={value} onChange={onSelect} disabled={disabled} />
      <QuickReplyActions value={value} onSelect={onSelect} disabled={disabled} />
    </div>
  );
}
