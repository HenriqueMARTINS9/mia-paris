"use server";

import { getCurrentUserContext } from "@/features/auth/queries";
import { logOperationalError, recordAuditEvent } from "@/lib/action-runtime";
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
    const workflowStatus = input.workflowStatus ?? "draft";
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("reply_drafts" as never)
      .upsert(
        {
          body: input.body.trim(),
          context: {
            ...input.context,
            workflow: {
              readyAt: workflowStatus === "ready_to_send" ? timestamp : null,
              status: workflowStatus,
            },
          },
          reply_type: input.replyType,
          source_id: input.context.sourceId,
          source_type: input.context.sourceType,
          subject: input.subject.trim(),
          updated_at: timestamp,
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

    await recordAuditEvent({
      action:
        workflowStatus === "ready_to_send" ? "reply_draft_ready" : "save_reply_draft",
      actorId: currentUser.appUser.id,
      actorType: "user",
      description:
        workflowStatus === "ready_to_send"
          ? "Brouillon de réponse validé pour envoi."
          : "Brouillon de réponse enregistré.",
      entityId: `${input.context.sourceType}:${input.context.sourceId}`,
      entityType: "reply_draft",
      payload: {
        bodyPreview: input.body.slice(0, 220),
        replyType: input.replyType,
        sourceId: input.context.sourceId,
        sourceType: input.context.sourceType,
        subject: input.subject,
        workflowStatus,
      },
      requestId: input.context.requestId,
      scope: "reply.save",
      source: "ui",
      status: "success",
    });

    return {
      ok: true,
      message:
        workflowStatus === "ready_to_send"
          ? "Brouillon validé pour envoi."
          : "Brouillon enregistré pour ce compte.",
      readyAt: workflowStatus === "ready_to_send" ? timestamp : null,
      updatedAt: timestamp,
      workflowStatus,
    };
  } catch (error) {
    await logOperationalError({
      entityId: `${input.context.sourceType}:${input.context.sourceId}`,
      entityType: "reply_draft",
      error,
      message: "Enregistrement du brouillon impossible.",
      payload: {
        replyType: input.replyType,
        sourceId: input.context.sourceId,
        sourceType: input.context.sourceType,
        workflowStatus: input.workflowStatus ?? "draft",
      },
      requestId: input.context.requestId,
      scope: "reply.save",
      source: "ui",
    });

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Enregistrement du brouillon impossible.",
    };
  }
}
