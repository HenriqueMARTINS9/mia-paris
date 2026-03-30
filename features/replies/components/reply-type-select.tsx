"use client";

import { Select } from "@/components/ui/select";
import {
  replyTypeMeta,
} from "@/features/replies/lib/build-reply-draft";
import { replyTemplateOrder } from "@/features/replies/lib/reply-templates";
import type { ReplyDraftType } from "@/features/replies/types";

const replyTypeOptions = replyTemplateOrder as ReplyDraftType[];

export function ReplyTypeSelect({
  disabled = false,
  onChange,
  value,
}: Readonly<{
  disabled?: boolean;
  onChange: (value: ReplyDraftType) => void;
  value: ReplyDraftType;
}>) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as ReplyDraftType)}
      disabled={disabled}
    >
      {replyTypeOptions.map((replyType) => (
        <option key={replyType} value={replyType}>
          {replyTypeMeta[replyType].label}
        </option>
      ))}
    </Select>
  );
}
