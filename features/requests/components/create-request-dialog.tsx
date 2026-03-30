"use client";

import { useMemo, useState, useTransition } from "react";
import { ClipboardPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { createRequestAction } from "@/features/requests/actions/create-request";
import {
  requestPriorityMeta,
  requestPriorityOptions,
  requestStatusMeta,
} from "@/features/requests/metadata";
import type {
  RequestFormOptions,
  RequestPriority,
  RequestStatus,
} from "@/features/requests/types";

interface CreateRequestDialogProps {
  defaultAssignedUserId?: string | null;
  defaultClientId?: string | null;
  defaultContactId?: string | null;
  defaultDueAt?: string | null;
  defaultModelId?: string | null;
  defaultProductDepartmentId?: string | null;
  defaultRequestType?: string | null;
  defaultSummary?: string | null;
  defaultTitle?: string | null;
  options: RequestFormOptions;
  optionsError?: string | null;
  triggerLabel?: string;
}

const requestTypeOptions = [
  { label: "Demande de prix", value: "price_request" },
  { label: "Demande de délai", value: "deadline_request" },
  { label: "TDS / Tech pack", value: "tds_request" },
  { label: "Swatch / tirelle", value: "swatch_request" },
  { label: "Validation trim", value: "trim_validation" },
  { label: "Suivi production", value: "production_followup" },
  { label: "Logistique", value: "logistics" },
  { label: "Développement", value: "development" },
  { label: "Conformité", value: "compliance" },
] as const;

export function CreateRequestDialog({
  defaultAssignedUserId = null,
  defaultClientId = null,
  defaultContactId = null,
  defaultDueAt = null,
  defaultModelId = null,
  defaultProductDepartmentId = null,
  defaultRequestType = "price_request",
  defaultSummary = null,
  defaultTitle = null,
  options,
  optionsError = null,
  triggerLabel = "Nouvelle demande",
}: Readonly<CreateRequestDialogProps>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [requestType, setRequestType] = useState(defaultRequestType ?? "price_request");
  const [status, setStatus] = useState<RequestStatus>("qualification");
  const [priority, setPriority] = useState<RequestPriority>("normal");
  const [assignedUserId, setAssignedUserId] = useState(defaultAssignedUserId ?? "");
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [contactId, setContactId] = useState(defaultContactId ?? "");
  const [productDepartmentId, setProductDepartmentId] = useState(
    defaultProductDepartmentId ?? "",
  );
  const [modelId, setModelId] = useState(defaultModelId ?? "");
  const [dueAt, setDueAt] = useState(defaultDueAt ? defaultDueAt.slice(0, 10) : "");
  const [summary, setSummary] = useState(defaultSummary ?? "");
  const [requestedAction, setRequestedAction] = useState("");
  const [isPending, startTransition] = useTransition();

  const clientScopedContacts = useMemo(
    () =>
      clientId
        ? options.contacts.filter((contact) => contact.clientId === clientId)
        : options.contacts,
    [clientId, options.contacts],
  );
  const clientScopedModels = useMemo(
    () =>
      clientId
        ? options.models.filter((model) => model.clientId === clientId)
        : options.models,
    [clientId, options.models],
  );

  function resetForm() {
    setTitle(defaultTitle ?? "");
    setRequestType(defaultRequestType ?? "price_request");
    setStatus("qualification");
    setPriority("normal");
    setAssignedUserId(defaultAssignedUserId ?? "");
    setClientId(defaultClientId ?? "");
    setContactId(defaultContactId ?? "");
    setProductDepartmentId(defaultProductDepartmentId ?? "");
    setModelId(defaultModelId ?? "");
    setDueAt(defaultDueAt ? defaultDueAt.slice(0, 10) : "");
    setSummary(defaultSummary ?? "");
    setRequestedAction("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createRequestAction({
        assignedUserId: assignedUserId || null,
        clientId: clientId || null,
        contactId: contactId || null,
        dueAt: dueAt || null,
        modelId: modelId || null,
        priority,
        productDepartmentId: productDepartmentId || null,
        requestType,
        requestedAction: requestedAction || null,
        status,
        summary: summary || null,
        title,
      });

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        resetForm();
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  if (!can("requests.create")) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ClipboardPlus className="h-4 w-4" />
        {triggerLabel}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Créer une demande manuelle</SheetTitle>
            <SheetDescription>
              Ouvre un dossier métier sans passer par l’inbox quand le besoin arrive par téléphone, réunion ou arbitrage interne.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Titre dossier
              </p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex. Caroll - demande de prix robe crochetée"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Select
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
                disabled={isPending}
              >
                {requestTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as RequestStatus)}
                disabled={isPending}
              >
                {Object.entries(requestStatusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value as RequestPriority)}
                disabled={isPending}
              >
                {requestPriorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {requestPriorityMeta[option].label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={clientId}
                onChange={(event) => {
                  setClientId(event.target.value);
                  setContactId("");
                  setModelId("");
                }}
                disabled={isPending}
              >
                <option value="">Client non renseigné</option>
                {options.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.label}
                  </option>
                ))}
              </Select>
              <Select
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Contact non renseigné</option>
                {clientScopedContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.label}
                  </option>
                ))}
              </Select>
              <Select
                value={productDepartmentId}
                onChange={(event) => setProductDepartmentId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Département non renseigné</option>
                {options.productDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.label}
                  </option>
                ))}
              </Select>
              <Select
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Modèle non renseigné</option>
                {clientScopedModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={assignedUserId}
                onChange={(event) => setAssignedUserId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Sans assignation initiale</option>
                {options.assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.fullName}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                disabled={isPending}
              />
            </div>

            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Résumé opérationnel de la demande"
              className="min-h-[120px]"
              disabled={isPending}
            />

            <Textarea
              value={requestedAction}
              onChange={(event) => setRequestedAction(event.target.value)}
              placeholder="Action attendue côté MIA PARIS"
              className="min-h-[96px]"
              disabled={isPending}
            />

            {optionsError ? (
              <p className="text-sm text-muted-foreground">{optionsError}</p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || title.trim().length < 3}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création
                  </>
                ) : (
                  "Créer la demande"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
