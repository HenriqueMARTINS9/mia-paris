"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCheck, Loader2, MessageCircleReply, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { ActionPriorityBadge } from "@/features/action-center/components/action-priority-badge";
import { ActionReasonBadge } from "@/features/action-center/components/action-reason-badge";
import type { ActionCenterItem } from "@/features/action-center/types";
import { markDeadlineAsDoneAction } from "@/features/deadlines/actions/update-deadline";
import { markEmailForReviewAction } from "@/features/emails/actions/update-email";
import { assignRequestAction } from "@/features/requests/actions/update-request";
import type { RequestAssigneeOption } from "@/features/requests/types";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { updateTaskStatusAction } from "@/features/tasks/actions/update-task";
import { formatDateTime } from "@/lib/utils";

export function ActionCenterCard({
  assignees,
  assigneesError = null,
  currentAppUserId,
  item,
}: Readonly<{
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  currentAppUserId: string | null;
  item: ActionCenterItem;
}>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [isPending, startTransition] = useTransition();

  function runQuickAction(
    action:
      | "assign_to_me"
      | "mark_deadline_done"
      | "mark_email_review"
      | "task_in_progress",
  ) {
    startTransition(async () => {
      if (action === "assign_to_me") {
        if (!currentAppUserId || !item.requestId) {
          toast.error("Aucun profil métier disponible pour l’assignation.");
          return;
        }

        const result = await assignRequestAction({
          assignedUserId: currentAppUserId,
          requestId: item.requestId,
        });

        if (result.ok) {
          toast.success(result.message);
          router.refresh();
          return;
        }

        toast.error(result.message);
        return;
      }

      if (action === "mark_deadline_done") {
        const result = await markDeadlineAsDoneAction({
          deadlineId: item.entityId,
          requestId: item.requestId ?? null,
        });

        if (result.ok) {
          toast.success(result.message);
          router.refresh();
          return;
        }

        toast.error(result.message);
        return;
      }

      if (action === "mark_email_review") {
        const result = await markEmailForReviewAction({
          emailId: item.entityId,
        });

        if (result.ok) {
          toast.success(result.message);
          router.refresh();
          return;
        }

        toast.error(result.message);
        return;
      }

      const result = await updateTaskStatusAction({
        requestId: item.requestId ?? null,
        status: "in_progress",
        taskId: item.entityId,
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
    <Card className="border-black/[0.06] bg-white/88">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ActionReasonBadge label={item.ruleLabel} />
          <ActionPriorityBadge priority={item.priority} />
          <ActionReasonBadge label={item.objectTypeLabel} />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            {item.clientName ?? "Contexte global"}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{item.title}</p>
          {item.subtitle ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.subtitle}
            </p>
          ) : null}
        </div>

        <div className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-3">
          <p className="text-sm font-medium">Pourquoi maintenant</p>
          <p className="mt-2 text-sm leading-6 text-foreground/80">{item.reason}</p>
        </div>

        <div className="grid gap-2 rounded-[1.15rem] border border-black/[0.06] bg-white px-4 py-3 text-sm">
          <MetaRow label="Prochaine action" value={item.nextAction} />
          <MetaRow label="Dernier signal" value={formatDateTime(item.lastSeenAt)} />
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {item.linkHref ? (
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href={item.linkHref}>
                <ArrowUpRight className="h-4 w-4" />
                Ouvrir la fiche
              </Link>
            </Button>
          ) : null}

          {item.entityType === "request" &&
          item.ruleKey === "request_unassigned" &&
          currentAppUserId &&
          can("requests.update") ? (
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => runQuickAction("assign_to_me")}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Attribution
                </>
              ) : (
                <>
                  <UserRound className="h-4 w-4" />
                  M&apos;assigner
                </>
              )}
            </Button>
          ) : null}

          {item.entityType === "task" && can("tasks.update") ? (
            <Button
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => runQuickAction("task_in_progress")}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mise à jour
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Passer en cours
                </>
              )}
            </Button>
          ) : null}

          {item.entityType === "deadline" && can("deadlines.update") ? (
            <Button
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => runQuickAction("mark_deadline_done")}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Clôture
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Marquer traité
                </>
              )}
            </Button>
          ) : null}

          {item.entityType === "email" && can("emails.qualify") ? (
            <Button
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => runQuickAction("mark_email_review")}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours
                </>
              ) : (
                "Marquer à revoir"
              )}
            </Button>
          ) : null}

          {(item.requestId ?? null) && can("tasks.create") ? (
            <CreateTaskDialog
              assignees={assignees}
              assigneesError={assigneesError}
              requestId={item.requestId}
              triggerLabel="Créer tâche"
            />
          ) : null}

          {(item.entityType === "email" || item.entityType === "request") &&
          can("reply.generate") ? (
            <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
              <Link href={item.linkHref ?? (item.entityType === "email" ? "/emails" : "/demandes")}>
                <MessageCircleReply className="h-4 w-4" />
                Préparer réponse
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MetaRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
