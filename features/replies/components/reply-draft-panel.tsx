"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCheck, Copy, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { MobileReplyDraftSheet } from "@/features/replies/components/mobile-reply-draft-sheet";
import { generateReplyDraftAction } from "@/features/replies/actions/generate-reply-draft";
import { saveReplyDraftAction } from "@/features/replies/actions/save-reply-draft";
import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";
import {
  buildReplyDraftStorageKey,
  writeStoredReplyDraft,
} from "@/features/replies/lib/reply-draft-storage";
import { ReplyTemplatePicker } from "@/features/replies/components/reply-template-picker";
import type {
  ReplyDraft,
  ReplyDraftContext,
  ReplyDraftType,
  SavedReplyDraft,
} from "@/features/replies/types";
import { formatDateTime } from "@/lib/utils";

export function ReplyDraftPanel({
  context,
  eyebrow = "Réponse assistée",
  initialReplyType = "acknowledgement",
  initialSavedDraft = null,
  title,
}: Readonly<{
  context: ReplyDraftContext;
  eyebrow?: string;
  initialReplyType?: ReplyDraftType;
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
      readyAt: null,
      replyType: initialReplyType,
      subject: "",
      updatedAt: null,
      workflowStatus: "draft" as const,
    };
  const [replyType, setReplyType] = useState<ReplyDraftType>(
    initialDraft.replyType,
  );
  const [draft, setDraft] = useState<ReplyDraft | null>(null);
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [workflowStatus, setWorkflowStatus] = useState(initialDraft.workflowStatus);
  const [readyAt, setReadyAt] = useState(initialDraft.readyAt);
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
      setWorkflowStatus("draft");
      setReadyAt(null);
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
    persistDraft("draft");
  }

  function handleMarkReady() {
    persistDraft("ready_to_send");
  }

  function persistDraft(nextWorkflowStatus: SavedReplyDraft["workflowStatus"]) {
    startTransition(async () => {
      const savedDraft = {
        body,
        readyAt: nextWorkflowStatus === "ready_to_send" ? new Date().toISOString() : null,
        replyType,
        subject,
        updatedAt: new Date().toISOString(),
        workflowStatus: nextWorkflowStatus,
      } satisfies SavedReplyDraft;

      writeStoredReplyDraft(storageKey, savedDraft);

      const result = await saveReplyDraftAction({
        body,
        context,
        replyType,
        subject,
        workflowStatus: nextWorkflowStatus,
      });

      if (!result.ok) {
        toast.error(`${result.message} Brouillon gardé localement.`);
        return;
      }

      setWorkflowStatus(result.workflowStatus ?? nextWorkflowStatus);
      setReadyAt(result.readyAt ?? null);
      toast.success(result.message);
    });
  }

  function handleSubjectChange(value: string) {
    setSubject(value);

    if (workflowStatus === "ready_to_send") {
      setWorkflowStatus("draft");
      setReadyAt(null);
    }
  }

  function handleBodyChange(value: string) {
    setBody(value);

    if (workflowStatus === "ready_to_send") {
      setWorkflowStatus("draft");
      setReadyAt(null);
    }
  }

  function handleReplyTypeChange(value: ReplyDraftType) {
    setReplyType(value);

    if (workflowStatus === "ready_to_send") {
      setWorkflowStatus("draft");
      setReadyAt(null);
    }
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
          onBodyChange={handleBodyChange}
          onCopy={handleCopy}
          onGenerate={handleGenerate}
          onMarkReady={handleMarkReady}
          onReplyTypeChange={handleReplyTypeChange}
          onSave={handleSave}
          onSubjectChange={handleSubjectChange}
          readyAt={readyAt}
          replyType={replyType}
          subject={subject}
          body={body}
          workflowStatus={workflowStatus}
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
            {workflowStatus === "ready_to_send" ? (
              <Badge className="border-primary/10 bg-primary/[0.08] text-primary">
                Prêt à envoyer
              </Badge>
            ) : null}
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
              <ReplyTemplatePicker
                value={replyType}
                onSelect={handleReplyTypeChange}
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
              <Button
                type="button"
                onClick={handleMarkReady}
                disabled={body.trim().length === 0 || subject.trim().length === 0 || isPending}
              >
                <CheckCheck className="h-4 w-4" />
                Valider pour envoi
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Objet
            </p>
            <Input
              value={subject}
              onChange={(event) => handleSubjectChange(event.target.value)}
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
              onChange={(event) => handleBodyChange(event.target.value)}
              placeholder="Le brouillon apparaîtra ici après génération."
              className="min-h-[260px]"
              disabled={isPending && !draft}
            />
          </div>

          {workflowStatus === "ready_to_send" ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.08] px-4 py-3 text-sm text-primary">
              Brouillon validé pour envoi
              {readyAt ? ` · ${formatDateTime(readyAt)}` : ""}. L’équipe peut maintenant l’utiliser comme réponse prête à partir du CRM.
            </div>
          ) : null}

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
