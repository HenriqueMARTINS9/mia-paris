"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2, PlusSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createTaskAction } from "@/features/tasks/actions/create-request-task";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import type {
  RequestAssigneeOption,
  RequestLinkOption,
  RequestPriority,
} from "@/features/requests/types";
import { requestPriorityMeta } from "@/features/requests/metadata";
import { manualTaskTypeOptions } from "@/features/tasks/task-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface CreateRequestTaskFormProps {
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  defaultAssignedUserId?: string | null;
  defaultDueAt?: string | null;
  defaultRequestId?: string | null;
  formTitle?: string;
  requestId?: string | null;
  requestOptions?: RequestLinkOption[];
  requestOptionsError?: string | null;
  sectionId?: string;
}

export function CreateRequestTaskForm({
  assignees,
  assigneesError = null,
  defaultAssignedUserId = null,
  defaultDueAt = null,
  defaultRequestId = null,
  formTitle = "Créer une tâche liée",
  requestId = null,
  requestOptions = [],
  requestOptionsError = null,
  sectionId,
}: Readonly<CreateRequestTaskFormProps>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const fixedRequestId = requestId;
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] =
    useState<(typeof manualTaskTypeOptions)[number]["value"]>("follow_up");
  const [priority, setPriority] = useState<RequestPriority>("normal");
  const [assignedUserId, setAssignedUserId] = useState(defaultAssignedUserId ?? "");
  const [dueAt, setDueAt] = useState(defaultDueAt ? defaultDueAt.slice(0, 10) : "");
  const [selectedRequestId, setSelectedRequestId] = useState(
    fixedRequestId ?? defaultRequestId ?? "",
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await createTaskAction({
        assignedUserId: assignedUserId || null,
        dueAt: dueAt || null,
        priority,
        requestId: fixedRequestId ?? (selectedRequestId || null),
        taskType,
        title,
      });

      if (result.ok) {
        toast.success(result.message);
        setTitle("");
        setTaskType("follow_up");
        setPriority("normal");
        setSelectedRequestId(fixedRequestId ?? defaultRequestId ?? "");
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  if (!can("tasks.create")) {
    return null;
  }

  return (
    <div
      id={sectionId}
      className="rounded-3xl border border-white/70 bg-white/60 p-4"
    >
      <div className="flex items-center gap-2">
        <PlusSquare className="h-4 w-4 text-muted-foreground" />
        <p className="font-semibold">{formTitle}</p>
      </div>

      <div className="mt-4 grid gap-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex. Consolider le chiffrage matière avant retour client"
          disabled={isPending}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={taskType}
            onChange={(event) =>
              setTaskType(
                event.target.value as (typeof manualTaskTypeOptions)[number]["value"],
              )
            }
            disabled={isPending}
          >
            {manualTaskTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as RequestPriority)
            }
            disabled={isPending}
          >
            {(["critical", "high", "normal"] as const).map((option) => (
              <option key={option} value={option}>
                {requestPriorityMeta[option].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={assignedUserId}
            onChange={(event) => setAssignedUserId(event.target.value)}
            disabled={isPending}
          >
            <option value="">
              {assignees.length > 0
                ? "Affectation facultative"
                : "Aucun utilisateur disponible"}
            </option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.fullName}
              </option>
            ))}
          </Select>

          <div className="relative">
            <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="pl-10"
              disabled={isPending}
            />
          </div>
        </div>

        {fixedRequestId ? (
          <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
            Tâche liée automatiquement à cette demande.
          </div>
        ) : (
          <Select
            value={selectedRequestId}
            onChange={(event) => setSelectedRequestId(event.target.value)}
            disabled={isPending}
          >
            <option value="">
              {requestOptions.length > 0
                ? "Aucune demande liée"
                : "Aucune demande disponible"}
            </option>
            {requestOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        )}

        {assigneesError || requestOptionsError ? (
          <p className="text-sm text-muted-foreground">
            {[assigneesError, requestOptionsError].filter(Boolean).join(" · ")}
          </p>
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
              "Créer la tâche"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
