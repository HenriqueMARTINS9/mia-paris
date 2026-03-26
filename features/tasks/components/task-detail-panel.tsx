import type { ComponentType } from "react";
import Link from "next/link";
import {
  CalendarClock,
  FolderKanban,
  Package2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TaskStatusBadge } from "@/features/tasks/components/task-badges";
import { TaskMutationControls } from "@/features/tasks/components/task-mutation-controls";
import type { TaskListItem } from "@/features/tasks/types";
import type { RequestAssigneeOption } from "@/features/requests/types";
import { cn, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface TaskDetailPanelProps {
  task: TaskListItem | null;
  assignees?: RequestAssigneeOption[];
  assigneesError?: string | null;
  mode?: "desktop" | "sheet" | "page";
}

export function TaskDetailPanel({
  task,
  assignees = [],
  assigneesError = null,
  mode = "desktop",
}: Readonly<TaskDetailPanelProps>) {
  if (!task) {
    return (
      <Card className={cn(mode === "desktop" && "sticky top-24")}>
        <CardContent className="flex min-h-[26rem] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/[0.08] text-primary">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold">Sélectionne une tâche</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Le panneau affichera le contexte, l&apos;échéance et les actions de mise à jour.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(mode === "desktop" && "sticky top-24")}>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <RequestPriorityBadge priority={task.priority} />
          <Badge variant="outline">{task.taskTypeLabel}</Badge>
        </div>

        <div>
          <CardTitle className="text-[1.35rem]">{task.title}</CardTitle>
          <CardDescription className="mt-2">
            {task.requestTitle}
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/taches/${task.id}`}>Ouvrir la fiche tâche</Link>
          </Button>
          {task.requestId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/requests/${task.requestId}`}>Voir la demande</Link>
            </Button>
          ) : null}
        </div>

        <TaskMutationControls
          key={`${task.id}:${task.status}:${task.priority}:${task.assignedUserId ?? "none"}:${task.dueAt ?? "none"}`}
          task={task}
          assignees={assignees}
          assigneesError={assigneesError}
        />
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard
            icon={Package2}
            title="Client / production"
            lines={[
              task.clientName,
              task.productionStatus ?? "Sans statut production",
              task.orderNumber ?? "Sans ordre de prod",
            ]}
          />
          <InfoCard
            icon={CalendarClock}
            title="Échéance"
            lines={[
              task.dueAt ? getDeadlineLabel(task.dueAt) : "Sans date",
              task.dueAt ? formatDateTime(task.dueAt) : "À planifier",
              task.isOverdue ? "Cette tâche est actuellement en retard." : "Rythme nominal.",
            ]}
          />
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Contexte opérationnel</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <MetaRow label="Responsable" value={task.owner} />
            <MetaRow label="Demande liée" value={task.requestTitle} />
            <MetaRow label="Type" value={task.taskTypeLabel} />
            <MetaRow label="Statut source" value={task.rawStatus} />
            <MetaRow label="Priorité source" value={task.rawPriority} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Note de pilotage</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Utilise les actions rapides pour repositionner la tâche, réaffecter le bon owner et ajuster l&apos;échéance selon le rythme textile du dossier.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface InfoCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  lines: string[];
}

function InfoCard({ icon: Icon, title, lines }: Readonly<InfoCardProps>) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="font-semibold">{title}</p>
      </div>
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm text-foreground/80">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

interface MetaRowProps {
  label: string;
  value: string;
}

function MetaRow({ label, value }: Readonly<MetaRowProps>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
