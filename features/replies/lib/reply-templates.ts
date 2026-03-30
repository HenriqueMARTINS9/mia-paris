import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";
import type { ReplyDraftType } from "@/features/replies/types";

export const replyTemplateOrder = [
  "acknowledgement",
  "ownership",
  "missing_items",
  "deadline_confirmation",
  "supplier_followup",
  "production_update",
  "logistics_response",
  "validation_feedback",
  "waiting_validation",
] as const satisfies ReplyDraftType[];

export { replyTypeMeta };
