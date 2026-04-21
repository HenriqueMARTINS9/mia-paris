"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientDepartmentModelSelectors } from "@/features/emails/components/client-department-model-selectors";
import { PrioritySelect } from "@/features/emails/components/priority-select";
import { QualificationFieldGroup } from "@/features/emails/components/qualification-field-group";
import { RequestTypeSelect } from "@/features/emails/components/request-type-select";
import type {
  EmailQualificationDraft,
  EmailQualificationOptions,
} from "@/features/emails/types";

interface EmailQualificationFieldsProps {
  canCreateClient?: boolean;
  draft: EmailQualificationDraft;
  onChange: (nextDraft: Partial<EmailQualificationDraft>) => void;
  onCreateClient?: (input: { code: string | null; name: string }) => Promise<boolean>;
  options: EmailQualificationOptions;
  optionsError?: string | null;
}

export function EmailQualificationFields({
  canCreateClient = false,
  draft,
  onChange,
  onCreateClient,
  options,
  optionsError = null,
}: Readonly<EmailQualificationFieldsProps>) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <QualificationFieldGroup label="Titre demande">
          <Input
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Objet métier de la demande"
          />
        </QualificationFieldGroup>

        <QualificationFieldGroup label="Responsable">
          <Select
            value={draft.assignedUserId ?? ""}
            onChange={(event) => {
              const nextAssigneeId = event.target.value || null;
              const selectedAssignee = options.assignees.find(
                (assignee) => assignee.id === nextAssigneeId,
              );

              onChange({
                assignedUserId: nextAssigneeId,
                assignedUserName: selectedAssignee?.fullName ?? null,
              });
            }}
          >
            <option value="">
              {options.assignees.length > 0
                ? "Aucun responsable"
                : "Aucun utilisateur disponible"}
            </option>
            {options.assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.fullName}
              </option>
            ))}
          </Select>
        </QualificationFieldGroup>

        <ClientDepartmentModelSelectors
          canCreateClient={canCreateClient}
          draft={draft}
          onChange={onChange}
          onCreateClient={onCreateClient}
          options={options}
        />

        <QualificationFieldGroup label="Type de demande">
          <RequestTypeSelect
            value={draft.requestType}
            onChange={(requestType) => onChange({ requestType })}
          />
        </QualificationFieldGroup>

        <QualificationFieldGroup label="Priorité">
          <PrioritySelect
            value={draft.priority}
            onChange={(priority) => onChange({ priority })}
          />
        </QualificationFieldGroup>

        <QualificationFieldGroup label="Due date">
          <Input
            type="date"
            value={draft.dueAt ?? ""}
            onChange={(event) =>
              onChange({
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
            value={draft.aiConfidence ?? ""}
            onChange={(event) => {
              const parsed = Number(event.target.value);

              onChange({
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
            value={draft.requiresHumanValidation ? "yes" : "no"}
            onChange={(event) =>
              onChange({
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
          value={draft.summary ?? ""}
          onChange={(event) =>
            onChange({
              summary: event.target.value || null,
            })
          }
          className="min-h-[120px]"
        />
      </QualificationFieldGroup>

      <QualificationFieldGroup label="Action demandée">
        <Textarea
          value={draft.requestedAction ?? ""}
          onChange={(event) =>
            onChange({
              requestedAction: event.target.value || null,
            })
          }
          className="min-h-[96px]"
        />
      </QualificationFieldGroup>

      {optionsError ? (
        <p className="text-sm text-muted-foreground">{optionsError}</p>
      ) : null}
    </div>
  );
}
