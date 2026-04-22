"use client";

import { useState, useTransition } from "react";
import { Link2, Mail, MessageSquareText, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { createRequestFromEmailAction } from "@/features/emails/actions/create-request-from-email";
import {
  attachEmailToRequestAction,
  ignoreEmailForNowAction,
  markEmailForReviewAction,
} from "@/features/emails/actions/update-email";
import { EmailAttachmentsCard } from "@/features/emails/components/email-attachments-card";
import { EmailInboxBucketBadge } from "@/features/emails/components/email-inbox-bucket-badge";
import { ExistingRequestMatcher } from "@/features/emails/components/existing-request-matcher";
import { MobileEmailActionBar } from "@/features/emails/components/mobile-email-action-bar";
import { OpenCreatedRequestLink } from "@/features/emails/components/open-created-request-link";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import type { RequestLinkOption } from "@/features/requests/types";
import { EmailReplyCard } from "@/features/replies/components/email-reply-card";
import { cn, formatDateTime } from "@/lib/utils";

type MobileEmailSection = "attachments" | "linking" | "preview" | "reply";

interface MobileEmailDetailSheetProps {
  email: EmailListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
}

const sectionMeta = [
  { id: "preview", label: "Aperçu", icon: Mail },
  { id: "linking", label: "Demande", icon: Link2 },
  { id: "reply", label: "Réponse", icon: MessageSquareText },
  { id: "attachments", label: "Pièces jointes", icon: Paperclip },
] as const satisfies ReadonlyArray<{
  id: MobileEmailSection;
  label: string;
  icon: typeof Mail;
}>;

export function MobileEmailDetailSheet({
  email,
  open,
  onOpenChange,
  requestOptions,
  requestOptionsError = null,
}: Readonly<MobileEmailDetailSheetProps>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [activeSection, setActiveSection] = useState<MobileEmailSection>("preview");
  const [linkedRequestValue, setLinkedRequestValue] = useState(
    email?.linkedRequestId ?? "",
  );
  const [currentLinkedRequestId, setCurrentLinkedRequestId] = useState<string | null>(
    email?.linkedRequestId ?? null,
  );
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isAttachPending, startAttachTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();
  const [isIgnorePending, startIgnoreTransition] = useTransition();

  const canCreateRequest = can("emails.qualify") && can("requests.create");
  const canAttachRequest = can("emails.qualify");
  const canCreate =
    Boolean(email) &&
    canCreateRequest &&
    !currentLinkedRequestId &&
    (email?.classification.suggestedFields.title.trim().length ?? 0) > 0 &&
    Boolean(email?.classification.suggestedFields.requestType);
  const canAttach =
    Boolean(email) &&
    canAttachRequest &&
    Boolean(linkedRequestValue) &&
    linkedRequestValue !== (currentLinkedRequestId ?? "");

  function handleCreateRequest() {
    if (!email) {
      return;
    }

    startCreateTransition(async () => {
      const result = await createRequestFromEmailAction({
        emailId: email.id,
        qualification: email.classification.suggestedFields,
      });

      if (result.ok) {
        setCurrentLinkedRequestId(result.requestId ?? email.linkedRequestId);
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleAttach() {
    if (!email) {
      return;
    }

    startAttachTransition(async () => {
      const result = await attachEmailToRequestAction({
        emailId: email.id,
        requestId: linkedRequestValue,
      });

      if (result.ok) {
        setCurrentLinkedRequestId(result.requestId ?? linkedRequestValue);
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleMarkReview() {
    if (!email) {
      return;
    }

    startReviewTransition(async () => {
      const result = await markEmailForReviewAction({
        emailId: email.id,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleIgnore() {
    if (!email) {
      return;
    }

    startIgnoreTransition(async () => {
      const result = await ignoreEmailForNowAction({
        emailId: email.id,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="inset-x-0 bottom-0 top-auto h-[100dvh] w-full max-w-none rounded-none border-b-0 border-l-0 border-r-0 p-0 sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-2xl sm:border-b sm:border-l sm:border-r-0 sm:border-t-0 sm:p-6">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-black/[0.06] px-4 py-4">
            <SheetTitle>Email métier</SheetTitle>
            <SheetDescription>
              Claw résume et prépare. Tu vérifies, tu rattaches ou tu crées la demande si besoin.
            </SheetDescription>
            {currentLinkedRequestId ? (
              <div className="pt-2">
                <OpenCreatedRequestLink requestId={currentLinkedRequestId} />
              </div>
            ) : null}
          </SheetHeader>

          <div className="border-b border-black/[0.06] px-4 py-3">
            <div className="-mx-1 overflow-x-auto px-1">
              <div className="flex w-max gap-2">
                {sectionMeta.map((section) => {
                  const Icon = section.icon;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
                        activeSection === section.id
                          ? "border-primary/[0.14] bg-primary/10 text-primary"
                          : "border-black/[0.06] bg-white text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
            {email ? (
              activeSection === "preview" ? (
                <PreviewSection email={email} />
              ) : activeSection === "linking" ? (
                <LinkingSection
                  currentLinkedRequestId={currentLinkedRequestId}
                  isAttachPending={isAttachPending}
                  linkedRequestValue={linkedRequestValue}
                  onSelectLinkedRequest={setLinkedRequestValue}
                  requestOptions={requestOptions}
                  requestOptionsError={requestOptionsError}
                />
              ) : activeSection === "reply" ? (
                <Card className="rounded-[1.35rem]">
                  <CardContent className="p-4">
                    <EmailReplyCard email={email} />
                  </CardContent>
                </Card>
              ) : (
                <EmailAttachmentsCard attachments={email.attachments} />
              )
            ) : null}
          </div>

          <MobileEmailActionBar
            canAttach={canAttach}
            canCreate={canCreate}
            isAttachPending={isAttachPending}
            isCreatePending={isCreatePending}
            isIgnorePending={isIgnorePending}
            isReviewPending={isReviewPending}
            onAttach={handleAttach}
            onCreate={handleCreateRequest}
            onIgnore={handleIgnore}
            onReview={handleMarkReview}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PreviewSection({
  email,
}: Readonly<{
  email: EmailListItem;
}>) {
  return (
    <div className="space-y-4">
      <Card className="rounded-[1.35rem]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <EmailInboxBucketBadge bucket={email.triage.bucket} />
            <ProcessingStatusBadge status={email.status} />
            {email.detectedType ? <Badge variant="outline">{email.detectedType}</Badge> : null}
            <RequestPriorityBadge
              priority={email.classification.suggestedFields.priority}
              className="normal-case tracking-normal"
            />
            {email.isUnread ? <Badge>Non lu</Badge> : null}
          </div>
          <p className="mt-4 break-words text-lg font-semibold tracking-tight">
            {email.subject}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {email.fromName} · {email.fromEmail}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(email.receivedAt)}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-[1.35rem] border border-primary/10 bg-primary/[0.04]">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryPill label="Client détecté" value={email.clientName} />
            <SummaryPill label="Type détecté" value={email.detectedType ?? "À confirmer"} />
            <SummaryPill label="Priorité" value={getPriorityLabel(email)} />
            <SummaryPill label="État CRM" value={getCrmStateLabel(email)} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Résumé métier
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">
              {email.summary ?? "Aucun résumé métier disponible pour cet email."}
            </p>
          </div>
          <SummaryPill
            label="Action recommandée"
            value={getRecommendedAction(email)}
          />
        </CardContent>
      </Card>

      <details className="rounded-[1.35rem] border border-black/[0.06] bg-white">
        <summary className="cursor-pointer list-none px-4 py-4">
          <p className="text-sm font-semibold text-foreground">
            Voir la conversation complète
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Le corps complet du message reste masqué par défaut.
          </p>
        </summary>
        <div className="border-t border-black/[0.06] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Corps du message
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">
            {email.bodyText ?? email.previewText}
          </p>
        </div>
      </details>
    </div>
  );
}

function LinkingSection({
  currentLinkedRequestId,
  isAttachPending,
  linkedRequestValue,
  onSelectLinkedRequest,
  requestOptions,
  requestOptionsError,
}: Readonly<{
  currentLinkedRequestId: string | null;
  isAttachPending: boolean;
  linkedRequestValue: string;
  onSelectLinkedRequest: (value: string) => void;
  requestOptions: RequestLinkOption[];
  requestOptionsError: string | null;
}>) {
  return (
    <Card className="rounded-[1.35rem]">
      <CardContent className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold">Rattacher à une demande</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {requestOptionsError ??
              (requestOptions.length === 0
                ? "Suggestions de rattachement en cours ou aucune demande pertinente ouverte."
                : "Choisis une demande existante si tu veux éviter de créer un doublon.")}
          </p>
        </div>

        <ExistingRequestMatcher
          requestOptions={requestOptions}
          selectedValue={linkedRequestValue}
          onSelectValue={onSelectLinkedRequest}
          disabled={isAttachPending}
          error={requestOptionsError}
        />

        {currentLinkedRequestId ? (
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Demande liée
            </p>
            <OpenCreatedRequestLink requestId={currentLinkedRequestId} />
          </div>
        ) : null}

        <p className="text-xs leading-5 text-muted-foreground">
          Si rien ne correspond, utilise simplement le bouton “Créer” en bas. Claw a déjà préparé les données CRM utiles.
        </p>
      </CardContent>
    </Card>
  );
}

function SummaryPill({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/75 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function getPriorityLabel(email: EmailListItem) {
  const value = email.classification.suggestedFields.priority;

  if (value === "critical") {
    return "Critique";
  }

  if (value === "high") {
    return "Haute";
  }

  return "Normale";
}

function getCrmStateLabel(email: EmailListItem) {
  if (email.linkedRequestId) {
    return "Déjà relié";
  }

  if (email.status === "processed") {
    return "Traité";
  }

  if (email.status === "review") {
    return "À arbitrer";
  }

  return "À qualifier";
}

function getRecommendedAction(email: EmailListItem) {
  const requestedAction = email.classification.suggestedFields.requestedAction?.trim();

  if (requestedAction) {
    return requestedAction;
  }

  if (email.linkedRequestId) {
    return "Vérifier la demande liée et confirmer que le mail est bien absorbé.";
  }

  if (email.triage.bucket === "promotional") {
    return "Laisser dans l’onglet Pub sauf si un vrai signal métier apparaît.";
  }

  if (email.triage.bucket === "to_review") {
    return "Relire vite le contexte et confirmer le client ou le type demandé.";
  }

  return "Valider le résumé puis créer ou rattacher la bonne demande CRM.";
}
