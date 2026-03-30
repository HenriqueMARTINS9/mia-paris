"use server";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import { buildReplyDraft } from "@/features/replies/lib/build-reply-draft";
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

  return {
    draft: buildReplyDraft({
      ...input.context,
      replyType: input.replyType,
    }),
    message: "Brouillon généré avec succès.",
    ok: true,
  };
}
