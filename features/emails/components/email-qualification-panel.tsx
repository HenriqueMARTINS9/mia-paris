"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { createRequestFromEmailAction } from "@/features/emails/actions/create-request-from-email";
import { EmailQualificationFields } from "@/features/emails/components/email-qualification-fields";
import { QualificationActionsBar } from "@/features/emails/components/qualification-actions-bar";
import { SuggestedFieldsCard } from "@/features/emails/components/suggested-fields-card";
import type {
  EmailListItem,
  EmailQualificationDraft,
  EmailQualificationOptions,
} from "@/features/emails/types";

export function EmailQualificationPanel({
  email,
  qualificationOptions,
  qualificationOptionsError = null,
}: Readonly<{
  email: EmailListItem;
  qualificationOptions: EmailQualificationOptions;
  qualificationOptionsError?: string | null;
}>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [currentLinkedRequestId, setCurrentLinkedRequestId] = useState<string | null>(
    email.linkedRequestId,
  );
  const [formState, setFormState] = useState<EmailQualificationDraft>(
    email.classification.suggestedFields,
  );

  function patchDraft(nextDraft: Partial<EmailQualificationDraft>) {
    setFormState((current) => ({
      ...current,
      ...nextDraft,
    }));
  }

  function handleCreateRequest() {
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

  const qualificationSourceLabel =
    email.classification.source === "stored"
      ? "Qualification existante"
      : "Préremplissage métier V1";
  const canCreateRequest = can("emails.qualify") && can("requests.create");

  return (
    <div className="space-y-4">
      <SuggestedFieldsCard fields={email.classification.suggestedFields} />

      <Card>
        <CardHeader className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{qualificationSourceLabel}</Badge>
            {email.attachments.length > 0 ? (
              <Badge variant="outline">
                {email.attachments.length} PJ Gmail synchronisée
                {email.attachments.length > 1 ? "s" : ""}
              </Badge>
            ) : null}
            {formState.requiresHumanValidation ? (
              <Badge variant="outline">Validation humaine requise</Badge>
            ) : (
              <Badge variant="outline">Prêt à transformer</Badge>
            )}
          </div>
          <CardTitle className="text-sm leading-6 sm:text-base">
            Corriger les champs avant création de la demande
          </CardTitle>
        </CardHeader>

        <EmailQualificationFields
          draft={formState}
          onChange={patchDraft}
          options={qualificationOptions}
          optionsError={qualificationOptionsError}
        />
      </Card>

      <QualificationActionsBar
        canCreate={
          canCreateRequest &&
          Boolean(formState.requestType) &&
          formState.title.trim().length > 0 &&
          !currentLinkedRequestId
        }
        currentPriority={formState.priority}
        currentRequestType={formState.requestType}
        linkedRequestId={currentLinkedRequestId}
        isPending={isCreatePending}
        onCreateRequest={handleCreateRequest}
      />
    </div>
  );
}
