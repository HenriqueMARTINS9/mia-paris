"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  EmailQualificationDraft,
  EmailQualificationOptions,
} from "@/features/emails/types";
import { QualificationFieldGroup } from "@/features/emails/components/qualification-field-group";

interface ClientDepartmentModelSelectorsProps {
  canCreateClient?: boolean;
  draft: EmailQualificationDraft;
  onChange: (nextDraft: Partial<EmailQualificationDraft>) => void;
  onCreateClient?: (input: { code: string | null; name: string }) => Promise<boolean>;
  options: EmailQualificationOptions;
}

export function ClientDepartmentModelSelectors({
  canCreateClient = false,
  draft,
  onChange,
  onCreateClient,
  options,
}: Readonly<ClientDepartmentModelSelectorsProps>) {
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCode, setNewClientCode] = useState("");
  const [isCreatePending, startCreateTransition] = useTransition();
  const clientScopedContacts = draft.clientId
    ? options.contacts.filter((contact) => contact.clientId === draft.clientId)
    : options.contacts;
  const clientScopedModels = draft.clientId
    ? options.models.filter((model) => model.clientId === draft.clientId)
    : options.models;

  function handleCreateClient() {
    if (!onCreateClient || newClientName.trim().length < 2) {
      return;
    }

    startCreateTransition(async () => {
      const ok = await onCreateClient({
        code: newClientCode.trim() || null,
        name: newClientName.trim(),
      });

      if (!ok) {
        return;
      }

      setNewClientName("");
      setNewClientCode("");
      setIsCreateMode(false);
    });
  }

  return (
    <>
      <QualificationFieldGroup label="Client">
        <div className="space-y-3">
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

          {canCreateClient && onCreateClient ? (
            <div className="rounded-2xl border border-black/[0.06] bg-[#fbf8f2]/75 p-3">
              {!isCreateMode ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateMode(true)}
                  className="w-full sm:w-auto"
                >
                  Créer un nouveau client
                </Button>
              ) : (
                <div className="grid gap-3">
                  <Input
                    value={newClientName}
                    onChange={(event) => setNewClientName(event.target.value)}
                    placeholder="Nom du client"
                  />
                  <Input
                    value={newClientCode}
                    onChange={(event) => setNewClientCode(event.target.value)}
                    placeholder="Code client (optionnel)"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateClient}
                      disabled={isCreatePending || newClientName.trim().length < 2}
                      className="sm:w-auto"
                    >
                      {isCreatePending ? "Création..." : "Créer et sélectionner"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsCreateMode(false);
                        setNewClientName("");
                        setNewClientCode("");
                      }}
                      disabled={isCreatePending}
                      className="sm:w-auto"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
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
