"use server";

import { getCurrentUserContext } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  SaveReplyDraftInput,
  SaveReplyDraftResult,
} from "@/features/replies/types";

export async function saveReplyDraftAction(
  input: SaveReplyDraftInput,
): Promise<SaveReplyDraftResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.appUser?.id) {
    return {
      ok: false,
      message: "Profil métier requis pour enregistrer un brouillon.",
    };
  }

  if (!input.subject.trim() || !input.body.trim()) {
    return {
      ok: false,
      message: "Renseigne un objet et un corps de message avant sauvegarde.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("reply_drafts" as never)
      .upsert(
        {
          body: input.body.trim(),
          context: input.context,
          reply_type: input.replyType,
          source_id: input.context.sourceId,
          source_type: input.context.sourceType,
          subject: input.subject.trim(),
          updated_at: new Date().toISOString(),
          user_id: currentUser.appUser.id,
        } as never,
        {
          onConflict: "user_id,source_type,source_id,reply_type",
        },
      );

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message: "Brouillon enregistré pour ce compte.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Enregistrement du brouillon impossible.",
    };
  }
}
