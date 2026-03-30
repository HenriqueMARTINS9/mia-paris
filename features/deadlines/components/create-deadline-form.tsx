"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2, PlusSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createDeadlineAction } from "@/features/deadlines/actions/create-deadline";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import type { DeadlinePriority } from "@/features/deadlines/types";
import { requestPriorityMeta } from "@/features/requests/metadata";
import type { RequestLinkOption } from "@/features/requests/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface CreateDeadlineFormProps {
  defaultDeadlineAt?: string | null;
  defaultRequestId?: string | null;
  formTitle?: string;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
  sectionId?: string;
}

export function CreateDeadlineForm({
  defaultDeadlineAt = null,
  defaultRequestId = null,
  formTitle = "Créer une deadline manuelle",
  requestOptions,
  requestOptionsError = null,
  sectionId,
}: Readonly<CreateDeadlineFormProps>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState<DeadlinePriority>("critical");
  const [requestId, setRequestId] = useState(defaultRequestId ?? "");
  const [deadlineAt, setDeadlineAt] = useState(
    defaultDeadlineAt ? defaultDeadlineAt.slice(0, 10) : "",
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await createDeadlineAction({
        deadlineAt,
        label,
        priority,
        requestId: requestId || null,
      });

      if (result.ok) {
        toast.success(result.message);
        setLabel("");
        setPriority("critical");
        setRequestId(defaultRequestId ?? "");
        setDeadlineAt(defaultDeadlineAt ? defaultDeadlineAt.slice(0, 10) : "");
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  if (!can("deadlines.create")) {
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
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ex. GO réception tissu validé avant coupe"
          disabled={isPending}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as DeadlinePriority)
            }
            disabled={isPending}
          >
            {(["critical", "high", "normal"] as const).map((option) => (
              <option key={option} value={option}>
                {requestPriorityMeta[option].label}
              </option>
            ))}
          </Select>

          <div className="relative">
            <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={deadlineAt}
              onChange={(event) => setDeadlineAt(event.target.value)}
              className="pl-10"
              disabled={isPending}
            />
          </div>
        </div>

        <Select
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
          disabled={isPending}
        >
          <option value="">
            {requestOptions.length > 0
              ? "Sans demande liée"
              : "Aucune demande disponible"}
          </option>
          {requestOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>

        {requestOptionsError ? (
          <p className="text-sm text-muted-foreground">{requestOptionsError}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || label.trim().length < 3 || !deadlineAt}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création
              </>
            ) : (
              "Créer la deadline"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
