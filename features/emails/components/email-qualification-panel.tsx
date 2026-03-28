"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRequestFromEmailAction } from "@/features/emails/actions/create-request-from-email";
import { ClientDepartmentModelSelectors } from "@/features/emails/components/client-department-model-selectors";
import { PrioritySelect } from "@/features/emails/components/priority-select";
import { QualificationActionsBar } from "@/features/emails/components/qualification-actions-bar";
import { QualificationFieldGroup } from "@/features/emails/components/qualification-field-group";
import { RequestTypeSelect } from "@/features/emails/components/request-type-select";
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

  return (
    <div className="space-y-4">
      <SuggestedFieldsCard fields={email.classification.suggestedFields} />

      <Card>
        <CardHeader className="space-y-3">
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
          <CardTitle className="text-base">
            Corriger les champs avant création de la demande
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <QualificationFieldGroup label="Titre demande">
              <Input
                value={formState.title}
                onChange={(event) => patchDraft({ title: event.target.value })}
                placeholder="Objet métier de la demande"
              />
            </QualificationFieldGroup>

            <QualificationFieldGroup label="Responsable">
              <Select
                value={formState.assignedUserId ?? ""}
                onChange={(event) => {
                  const nextAssigneeId = event.target.value || null;
                  const selectedAssignee = qualificationOptions.assignees.find(
                    (assignee) => assignee.id === nextAssigneeId,
                  );

                  patchDraft({
                    assignedUserId: nextAssigneeId,
                    assignedUserName: selectedAssignee?.fullName ?? null,
                  });
                }}
              >
                <option value="">
                  {qualificationOptions.assignees.length > 0
                    ? "Aucun responsable"
                    : "Aucun utilisateur disponible"}
                </option>
                {qualificationOptions.assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.fullName}
                  </option>
                ))}
              </Select>
            </QualificationFieldGroup>

            <ClientDepartmentModelSelectors
              draft={formState}
              onChange={patchDraft}
              options={qualificationOptions}
            />

            <QualificationFieldGroup label="Type de demande">
              <RequestTypeSelect
                value={formState.requestType}
                onChange={(requestType) => patchDraft({ requestType })}
              />
            </QualificationFieldGroup>

            <QualificationFieldGroup label="Priorité">
              <PrioritySelect
                value={formState.priority}
                onChange={(priority) => patchDraft({ priority })}
              />
            </QualificationFieldGroup>

            <QualificationFieldGroup label="Due date">
              <Input
                type="date"
                value={formState.dueAt ?? ""}
                onChange={(event) =>
                  patchDraft({
                    dueAt: event.target.value || null,
                  })
                }
              />
            </QualificationFieldGroup>

            <QualificationFieldGroup label="Confiance règle / IA (0 à 1)">
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formState.aiConfidence ?? ""}
                onChange={(event) => {
                  const parsed = Number(event.target.value);

                  patchDraft({
                    aiConfidence:
                      event.target.value.length === 0 || Number.isNaN(parsed)
                        ? null
                        : parsed,
                  });
                }}
              />
            </QualificationFieldGroup>

            <QualificationFieldGroup label="Validation humaine">
              <Select
                value={formState.requiresHumanValidation ? "yes" : "no"}
                onChange={(event) =>
                  patchDraft({
                    requiresHumanValidation: event.target.value === "yes",
                  })
                }
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </Select>
            </QualificationFieldGroup>
          </div>

          <QualificationFieldGroup label="Résumé métier">
            <Textarea
              value={formState.summary ?? ""}
              onChange={(event) =>
                patchDraft({
                  summary: event.target.value || null,
                })
              }
              className="min-h-[120px]"
            />
          </QualificationFieldGroup>

          <QualificationFieldGroup label="Action demandée">
            <Textarea
              value={formState.requestedAction ?? ""}
              onChange={(event) =>
                patchDraft({
                  requestedAction: event.target.value || null,
                })
              }
              className="min-h-[96px]"
            />
          </QualificationFieldGroup>

          {qualificationOptionsError ? (
            <p className="text-sm text-muted-foreground">
              {qualificationOptionsError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <QualificationActionsBar
        canCreate={
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
