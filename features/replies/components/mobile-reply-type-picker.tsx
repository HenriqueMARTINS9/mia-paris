"use client";

import { cn } from "@/lib/utils";
import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";
import { replyTemplateOrder } from "@/features/replies/lib/reply-templates";
import type { ReplyDraftType } from "@/features/replies/types";

const replyTypes = replyTemplateOrder as ReplyDraftType[];

export function MobileReplyTypePicker({
  onChange,
  value,
}: Readonly<{
  onChange: (value: ReplyDraftType) => void;
  value: ReplyDraftType;
}>) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex w-max gap-2">
        {replyTypes.map((replyType) => (
          <button
            key={replyType}
            type="button"
            onClick={() => onChange(replyType)}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
              value === replyType
                ? "border-primary/[0.14] bg-primary/10 text-primary"
                : "border-black/[0.06] bg-white text-muted-foreground",
            )}
          >
            {replyTypeMeta[replyType].label}
          </button>
        ))}
      </div>
    </div>
  );
}
