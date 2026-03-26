"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createRequestFromEmailAction } from "@/features/emails/actions/update-email";
import { RequestCreationActions } from "@/features/emails/components/request-creation-actions";
import { SuggestedFieldsCard } from "@/features/emails/components/suggested-fields-card";
import type { EmailListItem } from "@/features/emails/types";

export function EmailQualificationPanel({
  email,
}: Readonly<{ email: EmailListItem }>) {
  const router = useRouter();
  const [isCreatePending, startCreateTransition] = useTransition();

  function handleCreateRequest() {
    startCreateTransition(async () => {
      const result = await createRequestFromEmailAction({
        deadline: email.classification.suggestedFields.deadline,
        detectedType: email.classification.suggestedFields.requestType,
        emailId: email.id,
        previewText: email.previewText,
        priority: email.classification.suggestedFields.priority,
        subject: email.subject,
        summary: email.summary,
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
    <div className="space-y-4">
      <SuggestedFieldsCard fields={email.classification.suggestedFields} />
      <RequestCreationActions
        email={email}
        isPending={isCreatePending}
        onCreateRequest={handleCreateRequest}
      />
    </div>
  );
}
