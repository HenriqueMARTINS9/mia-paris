"use server";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import { buildReplyDraft } from "@/features/replies/lib/build-reply-draft";
import { logOperationalError, recordAuditEvent } from "@/lib/action-runtime";
import type {
  GenerateReplyDraftInput,
  GenerateReplyDraftResult,
} from "@/features/replies/types";

export async function generateReplyDraftAction(
  input: GenerateReplyDraftInput,
): Promise<GenerateReplyDraftResult> {
  const authorization = await authorizeServerAction("reply.generate");

  if (!authorization.ok) {
    return {
      draft: null,
      message: authorization.message,
      ok: false,
    };
  }

  if (!input.context.subject.trim()) {
    return {
      draft: null,
      message: "Objet de contexte manquant pour générer un brouillon.",
      ok: false,
    };
  }

  try {
    const draft = buildReplyDraft({
      ...input.context,
      replyType: input.replyType,
    });

    await recordAuditEvent({
      action: "generate_reply_draft",
      actorId: authorization.currentUser.appUser?.id ?? null,
      actorType: "user",
      description: "Brouillon de réponse généré.",
      entityId: `${input.context.sourceType}:${input.context.sourceId}`,
      entityType: "reply_draft",
      payload: {
        bodyPreview: draft.body.slice(0, 220),
        replyType: input.replyType,
        sourceId: input.context.sourceId,
        sourceType: input.context.sourceType,
        subject: draft.subject,
      },
      requestId: input.context.requestId,
      scope: "reply.generate",
      source: "ui",
      status: "success",
    });

    return {
      draft,
      message: "Brouillon généré avec succès.",
      ok: true,
    };
  } catch (error) {
    await logOperationalError({
      entityId: `${input.context.sourceType}:${input.context.sourceId}`,
      entityType: "reply_draft",
      error,
      message: "Génération de brouillon impossible.",
      payload: {
        replyType: input.replyType,
      },
      requestId: input.context.requestId,
      scope: "reply.generate",
      source: "ui",
    });

    return {
      draft: null,
      message:
        error instanceof Error
          ? `Brouillon impossible à générer: ${error.message}`
          : "Brouillon impossible à générer.",
      ok: false,
    };
  }
}
