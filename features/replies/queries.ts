import "server-only";

import { getCurrentUserContext } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readString } from "@/lib/record-helpers";
import type { ReplyDraftRecord } from "@/types/crm";
import type {
  ReplyDraftSourceType,
  SavedReplyDraft,
} from "@/features/replies/types";

export async function getSavedReplyDraft(
  sourceType: ReplyDraftSourceType,
  sourceId: string,
): Promise<SavedReplyDraft | null> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.appUser?.id) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("reply_drafts" as never)
      .select("*")
      .eq("user_id", currentUser.appUser.id)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as ReplyDraftRecord;

    return {
      body: readString(row, ["body"]) ?? "",
      replyType:
        (readString(row, ["reply_type"]) as SavedReplyDraft["replyType"] | null) ??
        "acknowledgement",
      subject: readString(row, ["subject"]) ?? "",
      updatedAt: readString(row, ["updated_at"]) ?? null,
    };
  } catch {
    return null;
  }
}
