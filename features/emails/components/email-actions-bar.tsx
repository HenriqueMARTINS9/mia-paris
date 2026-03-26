"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Link2, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  attachEmailToRequestAction,
  markEmailForReviewAction,
  markEmailProcessedAction,
} from "@/features/emails/actions/update-email";
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
  const [isProcessedPending, startProcessedTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();
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

  function handleAttachRequest() {
    startAttachTransition(async () => {
      const result = await attachEmailToRequestAction({
        emailId: email.id,
        requestId: linkedRequestValue,
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
    <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold">Statut de traitement</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Basculer rapidement cet email en traité ou à revoir selon la qualification métier.
            </p>
          </div>
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
          <Button size="sm" onClick={handleMarkProcessed} disabled={isProcessedPending}>
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

        <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 lg:grid-cols-[140px_minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold">Rattachement</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {requestOptionsError ?? "Lier cet email à une demande existante du CRM."}
            </p>
          </div>
          <Select
            value={linkedRequestValue}
            onChange={(event) => setLinkedRequestValue(event.target.value)}
            disabled={isAttachPending || requestOptions.length === 0}
          >
            <option value="">
              {requestOptions.length > 0
                ? "Sélectionner une demande"
                : "Aucune demande disponible"}
            </option>
            {requestOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAttachRequest}
              disabled={
                isAttachPending ||
                requestOptions.length === 0 ||
                !linkedRequestValue ||
                linkedRequestValue === (email.linkedRequestId ?? "")
              }
            >
              {isAttachPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Liaison
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Rattacher
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
