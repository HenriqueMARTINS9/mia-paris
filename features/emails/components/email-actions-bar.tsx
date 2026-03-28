"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Clock3, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  attachEmailToRequestAction,
  ignoreEmailForNowAction,
  markEmailForReviewAction,
  markEmailProcessedAction,
} from "@/features/emails/actions/update-email";
import { ExistingRequestMatcher } from "@/features/emails/components/existing-request-matcher";
import { LinkToExistingRequestAction } from "@/features/emails/components/link-to-existing-request-action";
import { OpenCreatedRequestLink } from "@/features/emails/components/open-created-request-link";
import { ProcessingStatusBadge } from "@/features/emails/components/processing-status-badge";
import type { EmailListItem } from "@/features/emails/types";
import type { RequestLinkOption } from "@/features/requests/types";

interface EmailActionsBarProps {
  email: EmailListItem;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
}

export function EmailActionsBar({
  email,
  requestOptions,
  requestOptionsError = null,
}: Readonly<EmailActionsBarProps>) {
  const router = useRouter();
  const [linkedRequestValue, setLinkedRequestValue] = useState(
    email.linkedRequestId ?? "",
  );
  const [currentLinkedRequestId, setCurrentLinkedRequestId] = useState<string | null>(
    email.linkedRequestId,
  );
  const [isProcessedPending, startProcessedTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();
  const [isIgnorePending, startIgnoreTransition] = useTransition();
  const [isAttachPending, startAttachTransition] = useTransition();

  function handleMarkProcessed() {
    startProcessedTransition(async () => {
      const result = await markEmailProcessedAction({
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

  function handleMarkReview() {
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

  function handleAttachRequest() {
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

  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/65 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Statut de traitement</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                L’email peut rester en attente, passer à revoir, être marqué traité ou être absorbé dans une demande CRM.
              </p>
            </div>
            <ProcessingStatusBadge status={email.status} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkReview}
              disabled={isReviewPending}
            >
              {isReviewPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                <>
                  <TriangleAlert className="h-4 w-4" />
                  Marquer à revoir
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleIgnore}
              disabled={isIgnorePending}
            >
              {isIgnorePending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                <>
                  <Clock3 className="h-4 w-4" />
                  Ignorer pour l’instant
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleMarkProcessed}
              disabled={isProcessedPending}
            >
              {isProcessedPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Marquer traité
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/65 p-4">
          <div>
            <p className="text-sm font-semibold">Rattacher à une demande existante</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {requestOptionsError ??
                "Recherche rapide d’une demande déjà ouverte pour éviter un doublon."}
            </p>
          </div>

          <ExistingRequestMatcher
            requestOptions={requestOptions}
            selectedValue={linkedRequestValue}
            onSelectValue={setLinkedRequestValue}
            disabled={isAttachPending}
            error={requestOptionsError}
          />

          <div className="flex justify-end">
            <div className="flex flex-wrap gap-2">
              {currentLinkedRequestId ? (
                <OpenCreatedRequestLink requestId={currentLinkedRequestId} />
              ) : null}
              <LinkToExistingRequestAction
                onClick={handleAttachRequest}
                isPending={isAttachPending}
                disabled={
                  requestOptions.length === 0 ||
                  !linkedRequestValue ||
                  linkedRequestValue === (currentLinkedRequestId ?? "")
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
