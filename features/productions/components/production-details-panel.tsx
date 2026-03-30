import { CalendarRange, Factory, History, ShieldAlert, TimerReset } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductionEditForm } from "@/features/productions/components/production-edit-form";
import { ProductionLinkedDocuments } from "@/features/productions/components/production-linked-documents";
import { ProductionLinkedRequests } from "@/features/productions/components/production-linked-requests";
import { buildProductionHistoryPanelData } from "@/features/history/builders";
import { ProductionHistoryPanel } from "@/features/history/components/production-history-panel";
import {
  ProductionStatusBadge,
  RiskBadge,
} from "@/features/productions/components/production-badges";
import type { ProductionDetailItem, ProductionListItem } from "@/features/productions/types";
import { cn, formatDateTime, getDeadlineLabel } from "@/lib/utils";

interface ProductionDetailsPanelProps {
  allProductions?: ProductionListItem[];
  mode?: "desktop" | "sheet";
  production: ProductionDetailItem | null;
}

export function ProductionDetailsPanel({
  allProductions = [],
  mode = "desktop",
  production,
}: Readonly<ProductionDetailsPanelProps>) {
  if (!production) {
    return (
      <Card className={cn(mode === "desktop" && "sticky top-24")}>
        <CardContent className="flex min-h-[24rem] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/[0.08] text-primary">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold">Sélectionne une production</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Le panneau affichera le planning, les documents liés, les demandes CRM et l&apos;historique atelier.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-5", mode === "desktop" && "sticky top-24")}>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ProductionStatusBadge status={production.status} />
            <RiskBadge risk={production.risk} />
            {production.isBlocked ? <Badge variant="destructive">Blocage actif</Badge> : null}
          </div>

          <div>
            <CardTitle className="text-[1.35rem]">{production.orderNumber}</CardTitle>
            <CardDescription className="mt-2">
              {production.clientName} · {production.modelName} · {production.productionModeLabel}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={CalendarRange}
              title="Planning"
              lines={[
                production.plannedStartAt
                  ? `Début ${formatDateTime(production.plannedStartAt)}`
                  : "Début non planifié",
                production.plannedEndAt
                  ? `${getDeadlineLabel(production.plannedEndAt)} · ${formatDateTime(production.plannedEndAt)}`
                  : "Fin non planifiée",
                production.productionModeLabel,
              ]}
            />
            <InfoCard
              icon={ShieldAlert}
              title="Risque"
              lines={[
                `Niveau ${production.risk}`,
                `Statut source ${production.rawStatus}`,
                `Risque source ${production.rawRisk}`,
              ]}
            />
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
            <p className="font-semibold">Blocage éventuel</p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">
              {production.blockingReason ??
                "Aucun blocage explicite renseigné pour cette production."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
            <p className="font-semibold">Notes atelier</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/80">
              {production.notes ?? "Aucune note interne renseignée."}
            </p>
          </div>
        </CardContent>
      </Card>

      <ProductionEditForm production={production} />

      <ProductionLinkedRequests requests={production.linkedRequests} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TimerReset className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Suivi opérationnel</CardTitle>
          </div>
          <CardDescription>
            Tâches et deadlines déjà reliées à ce flux de production.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <LinkedListCard
            title="Tâches liées"
            emptyMessage="Aucune tâche liée."
            items={production.linkedTasks.map((task) => ({
              id: task.id,
              title: task.title,
              subtitle: [task.status, task.priority, task.ownerName].filter(Boolean).join(" · "),
              meta: task.dueAt ? formatDateTime(task.dueAt) : "Pas de date",
            }))}
          />
          <LinkedListCard
            title="Deadlines liées"
            emptyMessage="Aucune deadline liée."
            items={production.linkedDeadlines.map((deadline) => ({
              id: deadline.id,
              title: deadline.label,
              subtitle: [deadline.status, deadline.priority].filter(Boolean).join(" · "),
              meta: deadline.deadlineAt
                ? formatDateTime(deadline.deadlineAt)
                : "Pas de date",
            }))}
          />
        </CardContent>
      </Card>

      <ProductionLinkedDocuments documents={production.linkedDocuments} />

      <ProductionHistoryPanel
        data={buildProductionHistoryPanelData({
          allProductions,
          production,
        })}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Historique d&apos;activité</CardTitle>
          </div>
          <CardDescription>
            Chronologie simple des signaux disponibles autour de cette production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {production.history.length > 0 ? (
            production.history.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {event.type.slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{event.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(event.date)}
                  </p>
                  {event.description ? (
                    <p className="mt-2 text-sm leading-6 text-foreground/80">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun historique exploitable n&apos;est disponible pour cette production.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  lines,
  title,
}: Readonly<{
  icon: typeof CalendarRange | typeof ShieldAlert;
  lines: string[];
  title: string;
}>) {
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

function LinkedListCard({
  emptyMessage,
  items,
  title,
}: Readonly<{
  emptyMessage: string;
  items: Array<{ id: string; meta: string; subtitle: string; title: string }>;
  title: string;
}>) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
      <p className="font-semibold">{title}</p>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/70 bg-white/70 p-3"
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
              <p className="mt-2 text-sm text-foreground/80">{item.meta}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
