import "server-only";

import { getCurrentUserContext } from "@/features/auth/queries";
import { supabaseRestSelectList } from "@/lib/supabase/rest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readObject, readString } from "@/lib/record-helpers";
import type { ActivityLogRecord, ReplyDraftRecord } from "@/types/crm";
import type {
  ReplyDraftHistoryItem,
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

export async function getReplyDraftHistory(
  sourceType: ReplyDraftSourceType,
  sourceId: string,
  limit = 6,
): Promise<ReplyDraftHistoryItem[]> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return [];
  }

  try {
    const result = await supabaseRestSelectList<ActivityLogRecord>("activity_logs", {
      entity_id: `eq.${sourceType}:${sourceId}`,
      entity_type: "eq.reply_draft",
      limit,
      order: "created_at.desc.nullslast",
      select: "id,action,action_type,created_at,description,payload,metadata",
    });

    if (result.error || !result.data) {
      return [];
    }

    return result.data.map((log) => {
      const payload =
        readObject(log, ["payload", "metadata"]) ??
        readObject(readObject(log, ["payload"]), ["payload", "metadata"]);
      const action = readString(log, ["action", "action_type"]);

      return {
        action: action === "reply_draft_saved" ? "saved" : "generated",
        bodyPreview:
          readString(payload, ["bodyPreview", "body_preview"]) ??
          readString(log, ["description"]) ??
          null,
        createdAt: readString(log, ["created_at"]) ?? new Date().toISOString(),
        id: log.id,
        replyType:
          (readString(payload, ["replyType", "reply_type"]) as
            | ReplyDraftHistoryItem["replyType"]
            | null) ?? null,
        subject: readString(payload, ["subject"]) ?? null,
      };
    });
  } catch {
    return [];
  }
}
