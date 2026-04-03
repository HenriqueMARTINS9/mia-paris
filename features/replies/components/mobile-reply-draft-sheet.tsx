"use client";

import { CheckCheck, Copy, Loader2, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileReplyEditor } from "@/features/replies/components/mobile-reply-editor";
import { MobileReplyTypePicker } from "@/features/replies/components/mobile-reply-type-picker";
import type {
  ReplyDraft,
  ReplyDraftType,
  ReplyDraftWorkflowStatus,
} from "@/features/replies/types";
import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";
import { formatDateTime } from "@/lib/utils";

interface MobileReplyDraftSheetProps {
  body: string;
  draft: ReplyDraft | null;
  isPending: boolean;
  onBodyChange: (value: string) => void;
  onCopy: () => void;
  onGenerate: () => void;
  onMarkReady: () => void;
  onReplyTypeChange: (value: ReplyDraftType) => void;
  onSave: () => void;
  onSubjectChange: (value: string) => void;
  readyAt: string | null;
  replyType: ReplyDraftType;
  subject: string;
  title: string;
  workflowStatus: ReplyDraftWorkflowStatus;
}

export function MobileReplyDraftSheet({
  body,
  draft,
  isPending,
  onBodyChange,
  onCopy,
  onGenerate,
  onMarkReady,
  onReplyTypeChange,
  onSave,
  onSubjectChange,
  readyAt,
  replyType,
  subject,
  title,
  workflowStatus,
}: Readonly<MobileReplyDraftSheetProps>) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full md:hidden">
          <Sparkles className="h-4 w-4" />
          Réponse assistée
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-none border-l-0 p-0 sm:max-w-2xl sm:border-l sm:p-6">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-black/[0.06] px-4 py-4">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              Génère, édite, copie ou enregistre un brouillon directement depuis le téléphone.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Type de réponse
                </p>
                <MobileReplyTypePicker
                  value={replyType}
                  onChange={onReplyTypeChange}
                />
                <p className="text-sm text-muted-foreground">
                  {replyTypeMeta[replyType].helper}
                </p>
              </div>

              <MobileReplyEditor
                body={body}
                onBodyChange={onBodyChange}
                onSubjectChange={onSubjectChange}
                subject={subject}
              />

              {draft?.disclaimer ? (
                <div className="rounded-2xl border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-3 text-sm text-muted-foreground">
                  {draft.disclaimer}
                </div>
              ) : null}

              {workflowStatus === "ready_to_send" ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.08] px-4 py-3 text-sm text-primary">
                  Brouillon validé pour envoi
                  {readyAt ? ` · ${formatDateTime(readyAt)}` : ""}.
                </div>
              ) : null}
            </div>
          </div>

          <div className="sticky bottom-0 z-20 border-t border-black/[0.06] bg-[#fbf8f1]/95 px-4 pb-4 pt-3 backdrop-blur">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={onGenerate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Générer
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onCopy} disabled={body.trim().length === 0}>
                <Copy className="h-4 w-4" />
                Copier
              </Button>
              <Button type="button" variant="ghost" onClick={onSave} className="border border-black/[0.06] bg-white/70">
                <Save className="h-4 w-4" />
                Sauver
              </Button>
              <Button
                type="button"
                onClick={onMarkReady}
                disabled={body.trim().length === 0 || subject.trim().length === 0 || isPending}
              >
                <CheckCheck className="h-4 w-4" />
                Valider
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
