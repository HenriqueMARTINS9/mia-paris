"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createRequestFromEmailAction } from "@/features/emails/actions/update-email";
import {
  emailRequestTypeMeta,
  emailRequestTypeOptions,
} from "@/features/emails/metadata";
import { RequestCreationActions } from "@/features/emails/components/request-creation-actions";
import { SuggestedFieldsCard } from "@/features/emails/components/suggested-fields-card";
import type {
  EmailListItem,
  EmailQualificationFields,
  EmailQualificationOptions,
} from "@/features/emails/types";
import { requestPriorityMeta } from "@/features/requests/metadata";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  const [formState, setFormState] = useState<EmailQualificationFields>(
    email.classification.suggestedFields,
  );

  const clientScopedContacts = useMemo(() => {
    if (!formState.clientId) {
      return qualificationOptions.contacts;
    }

    return qualificationOptions.contacts.filter(
      (contact) => contact.clientId === formState.clientId,
    );
  }, [formState.clientId, qualificationOptions.contacts]);

  const clientScopedModels = useMemo(() => {
    if (!formState.clientId) {
      return qualificationOptions.models;
    }

    return qualificationOptions.models.filter(
      (model) => model.clientId === formState.clientId,
    );
  }, [formState.clientId, qualificationOptions.models]);

  function handleCreateRequest() {
    startCreateTransition(async () => {
      const result = await createRequestFromEmailAction({
        emailId: email.id,
        previewText: email.previewText,
        qualification: formState,
        subject: email.subject,
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
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Qualification validée</Badge>
          </div>
          <CardTitle className="text-base">
            Corriger les champs avant création de la demande
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client">
              <Select
                value={formState.clientId ?? ""}
                onChange={(event) => {
                  const nextClientId = event.target.value || null;
                  const selectedClient = qualificationOptions.clients.find(
                    (client) => client.id === nextClientId,
                  );

                  setFormState((current) => ({
                    ...current,
                    clientId: nextClientId,
                    clientName: selectedClient?.label ?? current.clientName,
                    contactId: null,
                    modelId: null,
                  }));
                }}
              >
                <option value="">Aucun client</option>
                {qualificationOptions.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Contact">
              <Select
                value={formState.contactId ?? ""}
                onChange={(event) => {
                  const nextContactId = event.target.value || null;
                  const selectedContact = clientScopedContacts.find(
                    (contact) => contact.id === nextContactId,
                  );

                  setFormState((current) => ({
                    ...current,
                    contactId: nextContactId,
                    contactName: selectedContact?.label ?? current.contactName,
                  }));
                }}
              >
                <option value="">Aucun contact</option>
                {clientScopedContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Département produit">
              <Select
                value={formState.productDepartmentId ?? ""}
                onChange={(event) => {
                  const nextDepartmentId = event.target.value || null;
                  const selectedDepartment =
                    qualificationOptions.productDepartments.find(
                      (department) => department.id === nextDepartmentId,
                    );

                  setFormState((current) => ({
                    ...current,
                    productDepartmentId: nextDepartmentId,
                    productDepartmentName:
                      selectedDepartment?.label ?? current.productDepartmentName,
                  }));
                }}
              >
                <option value="">Aucun département</option>
                {qualificationOptions.productDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Modèle">
              <Select
                value={formState.modelId ?? ""}
                onChange={(event) => {
                  const nextModelId = event.target.value || null;
                  const selectedModel = clientScopedModels.find(
                    (model) => model.id === nextModelId,
                  );

                  setFormState((current) => ({
                    ...current,
                    modelId: nextModelId,
                    modelName: selectedModel?.label ?? current.modelName,
                  }));
                }}
              >
                <option value="">Aucun modèle</option>
                {clientScopedModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Type de demande">
              <Select
                value={formState.requestType ?? ""}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    requestType: event.target.value || null,
                  }))
                }
              >
                <option value="">Sélectionner un type</option>
                {emailRequestTypeOptions.map((requestType) => (
                  <option key={requestType} value={requestType}>
                    {emailRequestTypeMeta[requestType].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Priorité">
              <Select
                value={formState.priority}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    priority: event.target.value as EmailQualificationFields["priority"],
                  }))
                }
              >
                {(["critical", "high", "normal"] as const).map((priority) => (
                  <option key={priority} value={priority}>
                    {requestPriorityMeta[priority].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Due date">
              <Input
                type="date"
                value={formState.dueAt ?? ""}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    dueAt: event.target.value || null,
                  }))
                }
              />
            </Field>

            <Field label="Confiance IA (0 à 1)">
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formState.aiConfidence ?? ""}
                onChange={(event) => {
                  const parsed = Number(event.target.value);

                  setFormState((current) => ({
                    ...current,
                    aiConfidence:
                      event.target.value.length === 0 || Number.isNaN(parsed)
                        ? null
                        : parsed,
                  }));
                }}
              />
            </Field>
          </div>

          <Field label="Résumé métier">
            <Textarea
              value={formState.summary ?? ""}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  summary: event.target.value || null,
                }))
              }
              className="min-h-[120px]"
            />
          </Field>

          <Field label="Action demandée">
            <Textarea
              value={formState.requestedAction ?? ""}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  requestedAction: event.target.value || null,
                }))
              }
              className="min-h-[96px]"
            />
          </Field>

          {qualificationOptionsError ? (
            <p className="text-sm text-muted-foreground">
              {qualificationOptionsError}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <RequestCreationActions
        canCreate={Boolean(formState.requestType) && !email.linkedRequestId}
        currentPriority={formState.priority}
        currentRequestType={formState.requestType}
        linkedRequestId={email.linkedRequestId}
        isPending={isCreatePending}
        onCreateRequest={handleCreateRequest}
      />
    </div>
  );
}

function Field({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
