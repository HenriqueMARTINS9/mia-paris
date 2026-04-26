import { Bot, CalendarDays, CheckCircle2, Clock3, ListChecks, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DailySummariesPageData,
  DailySummaryClientSection,
  DailySummaryListItem,
} from "@/features/daily-summaries/types";
import { formatDateTime } from "@/lib/utils";

export function DailySummariesPage({
  data,
}: Readonly<{ data: DailySummariesPageData }>) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Contrôle quotidien"
        title="Synthèses"
        badge={`${data.summaries.length} résumé(s)`}
        description="Le compte-rendu écrit par Claw pour comprendre rapidement ce qui s’est passé, client par client."
      />

      {data.error ? (
        <ErrorState
          title="Impossible de charger les synthèses"
          description={data.error}
        />
      ) : data.summaries.length > 0 ? (
        <div className="grid gap-4">
          {data.summaries.map((summary) => (
            <DailySummaryCard key={summary.id} summary={summary} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucune synthèse pour l’instant"
          description="Quand Claw aura écrit son premier résumé quotidien, il apparaîtra ici avec le détail par client."
        />
      )}
    </div>
  );
}

function DailySummaryCard({
  summary,
}: Readonly<{ summary: DailySummaryListItem }>) {
  return (
    <Card>
      <CardHeader className="gap-4 border-b border-black/[0.06] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-[#fbf8f2]">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                {summary.summaryDate}
              </Badge>
              <Badge variant="outline" className="bg-white">
                <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                {summary.summaryTime}
              </Badge>
              <Badge className="bg-primary/[0.08] text-primary">
                <Bot className="mr-1.5 h-3.5 w-3.5" />
                Claw
              </Badge>
            </div>
            <CardTitle>{summary.title}</CardTitle>
            <CardDescription>{summary.overview}</CardDescription>
          </div>
          <p className="text-xs text-muted-foreground">
            Généré le {formatDateTime(summary.generatedAt)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <SummarySignalGrid summary={summary} />

        <div className="grid gap-3 lg:grid-cols-2">
          {summary.clientSummaries.map((client) => (
            <ClientSummaryBlock
              key={`${summary.id}-${client.clientName}`}
              client={client}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SummarySignalGrid({
  summary,
}: Readonly<{ summary: DailySummaryListItem }>) {
  const sections = [
    {
      icon: CheckCircle2,
      items: summary.highlights,
      title: "Points clés",
    },
    {
      icon: TriangleAlert,
      items: summary.risks,
      title: "Risques",
    },
    {
      icon: ListChecks,
      items: summary.nextActions,
      title: "À suivre",
    },
  ];

  if (sections.every((section) => section.items.length === 0)) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {sections.map((section) => {
        const Icon = section.icon;

        return (
          <div
            key={section.title}
            className="rounded-lg border border-black/[0.06] bg-[#fbf8f2]/70 p-4"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4 text-primary" />
              {section.title}
            </div>
            {section.items.length > 0 ? (
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {section.items.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Rien à signaler.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClientSummaryBlock({
  client,
}: Readonly<{ client: DailySummaryClientSection }>) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{client.clientName}</p>
        <Badge variant="outline">{client.nextActions.length} action(s)</Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{client.summary}</p>

      <ClientList title="Décisions" items={client.decisions} />
      <ClientList title="À faire" items={client.nextActions} />
      <ClientList title="Risques" items={client.risks} />
    </div>
  );
}

function ClientList({
  items,
  title,
}: Readonly<{ items: string[]; title: string }>) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground">
        {items.slice(0, 5).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
