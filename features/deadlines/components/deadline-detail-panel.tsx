import type { ComponentType } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, ShieldCheck } from "lucide-react";

import { RequestPriorityBadge } from "@/components/crm/request-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeadlineStatusBadge } from "@/features/deadlines/components/deadline-badges";
import { DeadlineMutationControls } from "@/features/deadlines/components/deadline-mutation-controls";
import type { DeadlineListItem } from "@/features/deadlines/types";
import { cn, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface DeadlineDetailPanelProps {
  deadline: DeadlineListItem | null;
  mode?: "desktop" | "sheet";
}

export function DeadlineDetailPanel({
  deadline,
  mode = "desktop",
}: Readonly<DeadlineDetailPanelProps>) {
  if (!deadline) {
    return (
      <Card className={cn(mode === "desktop" && "sticky top-24")}>
        <CardContent className="flex min-h-[24rem] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold">Sélectionne une deadline</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Le panneau affichera le risque, les liens métier et les actions rapides.
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
          <DeadlineStatusBadge status={deadline.status} />
          <RequestPriorityBadge priority={deadline.priority} />
        </div>
        <div>
          <CardTitle className="text-[1.35rem]">{deadline.label}</CardTitle>
          <CardDescription className="mt-2">
            {deadline.requestTitle}
          </CardDescription>
        </div>
        {deadline.requestId ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/requests/${deadline.requestId}`}>Voir la demande</Link>
            </Button>
          </div>
        ) : null}
        <DeadlineMutationControls
          key={`${deadline.id}:${deadline.status}:${deadline.priority}`}
          deadline={deadline}
        />
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard
            icon={CalendarClock}
            title="Date critique"
            lines={[
              deadline.deadlineAt ? getDeadlineLabel(deadline.deadlineAt) : "Sans date",
              deadline.deadlineAt ? formatDateTime(deadline.deadlineAt) : "À planifier",
              deadline.isOverdue ? "Cette deadline est déjà dépassée." : "Sous contrôle.",
            ]}
          />
          <InfoCard
            icon={ShieldCheck}
            title="Objet lié"
            lines={[
              deadline.clientName,
              deadline.linkedObjectLabel,
              deadline.orderNumber ?? deadline.productionStatus ?? "Sans objet secondaire",
            ]}
          />
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
          <p className="font-semibold">Contexte risque</p>
          <div className="mt-4 space-y-3 text-sm">
            <MetaRow label="Client" value={deadline.clientName} />
            <MetaRow label="Objet lié" value={deadline.linkedObjectLabel} />
            <MetaRow label="Statut source" value={deadline.rawStatus} />
            <MetaRow label="Priorité source" value={deadline.rawPriority} />
          </div>
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
