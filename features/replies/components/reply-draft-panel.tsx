"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { MobileReplyDraftSheet } from "@/features/replies/components/mobile-reply-draft-sheet";
import { QuickReplyActions } from "@/features/replies/components/quick-reply-actions";
import { generateReplyDraftAction } from "@/features/replies/actions/generate-reply-draft";
import { saveReplyDraftAction } from "@/features/replies/actions/save-reply-draft";
import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";
import {
  buildReplyDraftStorageKey,
  writeStoredReplyDraft,
} from "@/features/replies/lib/reply-draft-storage";
import { ReplyTypeSelect } from "@/features/replies/components/reply-type-select";
import type {
  ReplyDraft,
  ReplyDraftContext,
  ReplyDraftType,
  SavedReplyDraft,
} from "@/features/replies/types";

export function ReplyDraftPanel({
  context,
  eyebrow = "Réponse assistée",
  initialSavedDraft = null,
  title,
}: Readonly<{
  context: ReplyDraftContext;
  eyebrow?: string;
  initialSavedDraft?: SavedReplyDraft | null;
  title: string;
}>) {
  const { can } = useAuthorization();
  const storageKey = useMemo(
    () => buildReplyDraftStorageKey(context.sourceType, context.sourceId),
    [context.sourceId, context.sourceType],
  );
  const initialDraft =
    initialSavedDraft ?? {
      body: "",
      replyType: "acknowledgement" as ReplyDraftType,
      subject: "",
      updatedAt: null,
    };
  const [replyType, setReplyType] = useState<ReplyDraftType>(
    initialDraft.replyType,
  );
  const [draft, setDraft] = useState<ReplyDraft | null>(null);
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateReplyDraftAction({
        context,
        replyType,
      });

      if (!result.ok || !result.draft) {
        toast.error(result.message);
        return;
      }

      setDraft(result.draft);
      setSubject(result.draft.subject);
      setBody(result.draft.body);
      toast.success(result.message);
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      toast.success("Brouillon copié dans le presse-papiers.");
    } catch {
      toast.error("Impossible de copier le brouillon.");
    }
  }

  function handleSave() {
    startTransition(async () => {
      const savedDraft = {
        body,
        replyType,
        subject,
        updatedAt: new Date().toISOString(),
      } satisfies SavedReplyDraft;

      writeStoredReplyDraft(storageKey, savedDraft);

      const result = await saveReplyDraftAction({
        body,
        context,
        replyType,
        subject,
      });

      if (!result.ok) {
        toast.error(`${result.message} Brouillon gardé localement.`);
        return;
      }

      toast.success(result.message);
    });
  }

  if (!can("reply.generate")) {
    return null;
  }

  return (
    <>
      <div className="md:hidden">
        <MobileReplyDraftSheet
          title={title}
          draft={draft}
          isPending={isPending}
          onBodyChange={setBody}
          onCopy={handleCopy}
          onGenerate={handleGenerate}
          onReplyTypeChange={setReplyType}
          onSave={handleSave}
          onSubjectChange={setSubject}
          replyType={replyType}
          subject={subject}
          body={body}
        />
      </div>

      <Card className="hidden md:block">
        <CardHeader className="space-y-4 border-b border-black/[0.06] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-[#fbf8f2]">
              {eyebrow}
            </Badge>
            <Badge variant="outline" className="bg-white">
              {replyTypeMeta[replyType].label}
            </Badge>
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Brouillon éditable, contextualisé avec le client, le sujet, le type
              de demande et l’échéance éventuelle. Aucun email n’est envoyé
              automatiquement.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Type de réponse
              </p>
              <ReplyTypeSelect
                value={replyType}
                onChange={setReplyType}
                disabled={isPending}
              />
              <QuickReplyActions
                value={replyType}
                onSelect={setReplyType}
                disabled={isPending}
              />
              <p className="text-sm text-muted-foreground">
                {replyTypeMeta[replyType].helper}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerate}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Générer brouillon
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={body.trim().length === 0}
              >
                <Copy className="h-4 w-4" />
                Copier
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSave}
                disabled={body.trim().length === 0 || subject.trim().length === 0}
                className="border border-black/[0.06] bg-white/70"
              >
                <Save className="h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Objet
            </p>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Objet du brouillon"
              disabled={isPending && !draft}
            />
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Corps du message
            </p>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Le brouillon apparaîtra ici après génération."
              className="min-h-[260px]"
              disabled={isPending && !draft}
            />
          </div>

          {draft?.disclaimer ? (
            <div className="rounded-2xl border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-3 text-sm text-muted-foreground">
              {draft.disclaimer}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
