"use client";

import { useMemo, useState, useTransition } from "react";
import { Link2, Mail, Paperclip, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { ClassificationSummaryCard } from "@/features/emails/components/classification-summary-card";
import { EmailAttachmentsCard } from "@/features/emails/components/email-attachments-card";
import { EmailQualificationFields } from "@/features/emails/components/email-qualification-fields";
import { ExistingRequestMatcher } from "@/features/emails/components/existing-request-matcher";
import { MobileEmailActionBar } from "@/features/emails/components/mobile-email-action-bar";
import { OpenCreatedRequestLink } from "@/features/emails/components/open-created-request-link";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type {
  EmailListItem,
  EmailQualificationDraft,
  EmailQualificationOptions,
} from "@/features/emails/types";
import type { DocumentFormOptions } from "@/features/documents/types";
import type { RequestLinkOption } from "@/features/requests/types";
import { cn, formatDateTime } from "@/lib/utils";

type MobileEmailSection = "attachments" | "linking" | "preview" | "qualification";

interface MobileEmailDetailSheetProps {
  documentOptions: DocumentFormOptions;
  documentOptionsError?: string | null;
  email: EmailListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qualificationOptions: EmailQualificationOptions;
  qualificationOptionsError?: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
}

const sectionMeta = [
  { id: "preview", label: "Aperçu", icon: Mail },
  { id: "qualification", label: "Qualification", icon: Sparkles },
  { id: "linking", label: "Rattachement", icon: Link2 },
  { id: "attachments", label: "Pièces jointes", icon: Paperclip },
] as const satisfies ReadonlyArray<{
  id: MobileEmailSection;
  label: string;
  icon: typeof Mail;
}>;

export function MobileEmailDetailSheet({
  documentOptions,
  documentOptionsError = null,
  email,
  open,
  onOpenChange,
  qualificationOptions,
  qualificationOptionsError = null,
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
  const [formState, setFormState] = useState<EmailQualificationDraft | null>(
    email?.classification.suggestedFields ?? null,
  );

  const [isCreatePending, startCreateTransition] = useTransition();
  const [isAttachPending, startAttachTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();
  const [isIgnorePending, startIgnoreTransition] = useTransition();

  const canCreateRequest = can("emails.qualify") && can("requests.create");
  const canAttachRequest = can("emails.qualify");

  const canCreate =
    email !== null &&
    formState !== null &&
    canCreateRequest &&
    (formState?.title.trim().length ?? 0) > 0 &&
    Boolean(formState?.requestType) &&
    !currentLinkedRequestId;

  const canAttach =
    Boolean(email) &&
    canAttachRequest &&
    Boolean(linkedRequestValue) &&
    linkedRequestValue !== (currentLinkedRequestId ?? "");

  function patchDraft(nextDraft: Partial<EmailQualificationDraft>) {
    setFormState((current) =>
      current
        ? {
            ...current,
            ...nextDraft,
          }
        : current,
    );
  }

  function handleCreateRequest() {
    if (!email || !formState) {
      return;
    }

    startCreateTransition(async () => {
      const result = await createRequestFromEmailAction({
        emailId: email.id,
        qualification: formState,
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

  const content = useMemo(() => {
    if (!email || !formState) {
      return null;
    }

    if (activeSection === "preview") {
      return (
        <div className="space-y-4">
          <Card className="rounded-[1.35rem]">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <ProcessingStatusBadge status={email.status} />
                {email.detectedType ? (
                  <Badge variant="outline">{email.detectedType}</Badge>
                ) : null}
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
              <div className="mt-4 rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Corps du message
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">
                  {email.bodyText ?? email.previewText}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.35rem]">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Résumé métier
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">
                {email.summary ?? "Aucun résumé IA disponible pour cet email."}
              </p>
            </CardContent>
          </Card>

          <ClassificationSummaryCard email={email} />
        </div>
      );
    }

    if (activeSection === "qualification") {
      return (
        <Card className="rounded-[1.35rem]">
          <CardContent className="p-4">
            <EmailQualificationFields
              draft={formState}
              onChange={patchDraft}
              options={qualificationOptions}
              optionsError={qualificationOptionsError}
            />
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "linking") {
      return (
        <Card className="rounded-[1.35rem]">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold">Suggestions de rattachement</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Recherche une demande existante pour éviter un doublon et absorber l’email dans le bon dossier.
              </p>
            </div>

            <ExistingRequestMatcher
              requestOptions={requestOptions}
              selectedValue={linkedRequestValue}
              onSelectValue={setLinkedRequestValue}
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
          </CardContent>
        </Card>
      );
    }

    return (
      <EmailAttachmentsCard
        attachments={email.attachments}
        defaultModelId={formState.modelId}
        defaultRequestId={currentLinkedRequestId}
        documentOptions={documentOptions}
        documentOptionsError={documentOptionsError}
      />
    );
  }, [
    activeSection,
    currentLinkedRequestId,
    documentOptions,
    documentOptionsError,
    email,
    formState,
    isAttachPending,
    linkedRequestValue,
    qualificationOptions,
    qualificationOptionsError,
    requestOptions,
    requestOptionsError,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-none border-l-0 p-0 sm:max-w-2xl sm:border-l sm:p-6">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-black/[0.06] px-4 py-4">
            <SheetTitle>Email métier</SheetTitle>
            <SheetDescription>
              Qualification, rattachement et transformation CRM en quelques taps.
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
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
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
            {email && formState ? content : null}
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
