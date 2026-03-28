"use client";

import { Select } from "@/components/ui/select";
import type {
  EmailQualificationDraft,
  EmailQualificationOptions,
} from "@/features/emails/types";
import { QualificationFieldGroup } from "@/features/emails/components/qualification-field-group";

interface ClientDepartmentModelSelectorsProps {
  draft: EmailQualificationDraft;
  onChange: (nextDraft: Partial<EmailQualificationDraft>) => void;
  options: EmailQualificationOptions;
}

export function ClientDepartmentModelSelectors({
  draft,
  onChange,
  options,
}: Readonly<ClientDepartmentModelSelectorsProps>) {
  const clientScopedContacts = draft.clientId
    ? options.contacts.filter((contact) => contact.clientId === draft.clientId)
    : options.contacts;
  const clientScopedModels = draft.clientId
    ? options.models.filter((model) => model.clientId === draft.clientId)
    : options.models;

  return (
    <>
      <QualificationFieldGroup label="Client">
        <Select
          value={draft.clientId ?? ""}
          onChange={(event) => {
            const nextClientId = event.target.value || null;
            const selectedClient = options.clients.find(
              (client) => client.id === nextClientId,
            );

            onChange({
              clientId: nextClientId,
              clientName: selectedClient?.label ?? null,
              contactId: null,
              contactName: null,
              modelId: null,
              modelName: null,
            });
          }}
        >
          <option value="">Aucun client</option>
          {options.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.label}
            </option>
          ))}
        </Select>
      </QualificationFieldGroup>

      <QualificationFieldGroup label="Contact">
        <Select
          value={draft.contactId ?? ""}
          onChange={(event) => {
            const nextContactId = event.target.value || null;
            const selectedContact = clientScopedContacts.find(
              (contact) => contact.id === nextContactId,
            );

            onChange({
              contactId: nextContactId,
              contactName: selectedContact?.label ?? null,
            });
          }}
        >
          <option value="">Aucun contact</option>
          {clientScopedContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.label}
            </option>
          ))}
        </Select>
      </QualificationFieldGroup>

      <QualificationFieldGroup label="Département produit">
        <Select
          value={draft.productDepartmentId ?? ""}
          onChange={(event) => {
            const nextDepartmentId = event.target.value || null;
            const selectedDepartment = options.productDepartments.find(
              (department) => department.id === nextDepartmentId,
            );

            onChange({
              productDepartmentId: nextDepartmentId,
              productDepartmentName: selectedDepartment?.label ?? null,
            });
          }}
        >
          <option value="">Aucun département</option>
          {options.productDepartments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.label}
            </option>
          ))}
        </Select>
      </QualificationFieldGroup>

      <QualificationFieldGroup label="Modèle">
        <Select
          value={draft.modelId ?? ""}
          onChange={(event) => {
            const nextModelId = event.target.value || null;
            const selectedModel = clientScopedModels.find(
              (model) => model.id === nextModelId,
            );

            onChange({
              modelId: nextModelId,
              modelName: selectedModel?.label ?? null,
            });
          }}
        >
          <option value="">Aucun modèle</option>
          {clientScopedModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </Select>
      </QualificationFieldGroup>
    </>
  );
}
