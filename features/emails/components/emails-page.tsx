"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  MailCheck,
  MailOpen,
  ScanSearch,
  TriangleAlert,
} from "lucide-react";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmailFilters } from "@/features/emails/components/email-filters";
import { EmailPreviewPanel } from "@/features/emails/components/email-preview-panel";
import { EmailsTable } from "@/features/emails/components/emails-table";
import type { EmailListItem, EmailsPageData } from "@/features/emails/types";

export function EmailsPage({
  emails,
  requestOptions,
  requestOptionsError = null,
  error = null,
}: Readonly<EmailsPageData>) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | EmailListItem["status"]
  >("all");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(
    emails[0]?.id ?? null,
  );
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const filteredEmails = useMemo(
    () =>
      emails.filter((email) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          query.length === 0 ||
          [
            email.fromName,
            email.fromEmail,
            email.subject,
            email.threadLabel,
            email.clientName,
            email.detectedType ?? "",
            email.previewText,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          selectedStatus === "all" || email.status === selectedStatus;

        return matchesSearch && matchesStatus;
      }),
    [emails, search, selectedStatus],
  );

  const selectedEmail =
    filteredEmails.find((email) => email.id === selectedEmailId) ??
    filteredEmails[0] ??
    null;

  const newCount = filteredEmails.filter((email) => email.status === "new").length;
  const reviewCount = filteredEmails.filter(
    (email) => email.status === "review",
  ).length;
  const processedCount = filteredEmails.filter(
    (email) => email.status === "processed",
  ).length;
  const qualifiedCount = filteredEmails.filter(
    (email) => email.detectedType || email.summary || email.confidence !== null,
  ).length;

  const header = (
    <PageHeader
      eyebrow="Étape 8 · Emails métier"
      title="Emails"
      badge={`${filteredEmails.length} email${filteredEmails.length > 1 ? "s" : ""}`}
      description="Inbox métier textile pour absorber le flux entrant, le qualifier vite et le transformer en demandes CRM exploitables."
      actions={
        <>
          <Button variant="outline">
            <ArrowDownToLine className="h-4 w-4" />
            Exporter
          </Button>
          <Button variant="secondary">
            <ScanSearch className="h-4 w-4" />
            Lancer qualification
          </Button>
        </>
      }
    />
  );

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Connexion Supabase impossible pour Emails"
          description={error}
        />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="Aucun email dans la table emails"
          description="La table Supabase est accessible mais ne contient encore aucun email métier à traiter."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Nouveaux"
          value={String(newCount)}
          hint="Emails entrants encore non absorbés dans le CRM."
          icon={MailOpen}
        />
        <MetricCard
          label="À revoir"
          value={String(reviewCount)}
          hint="Emails qui demandent un arbitrage ou une reprise de qualification."
          icon={TriangleAlert}
          accent="danger"
        />
        <MetricCard
          label="Traités"
          value={String(processedCount)}
          hint="Emails déjà absorbés ou clôturés côté métier."
          icon={MailCheck}
        />
        <MetricCard
          label="Qualifiés IA"
          value={String(qualifiedCount)}
          hint="Emails avec détection client, type, résumé ou score exploitable."
          icon={ScanSearch}
          accent="accent"
        />
      </div>

      <EmailFilters
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline">Flux entrant</Badge>
              <CardTitle className="mt-3">Inbox opérationnelle</CardTitle>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Lecture dense des emails entrants avec statut de traitement, qualification IA et rattachement CRM.
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <EmailsTable
              emails={filteredEmails}
              selectedEmailId={selectedEmail?.id ?? null}
              onSelectEmail={(emailId) => {
                setSelectedEmailId(emailId);
                setMobileDetailsOpen(true);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Pilotage de l’inbox</p>
              <p className="mt-1 text-sm text-muted-foreground">
                La sélection ouvre un panneau d’aperçu avec résumé IA, champs suggérés et actions de transformation CRM.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["new", "review", "processed"] as const).map((status) => {
                const count = filteredEmails.filter((email) => email.status === status).length;

                return (
                  <div key={status} className="inline-flex items-center gap-2">
                    <Badge variant={status === "review" ? "destructive" : "outline"}>
                      {status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={mobileDetailsOpen && Boolean(selectedEmail)}
        onOpenChange={setMobileDetailsOpen}
      >
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Détail email</SheetTitle>
            <SheetDescription>
              Aperçu du message, qualification IA et actions de transformation CRM.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto pb-6">
            <EmailPreviewPanel
              email={selectedEmail}
              mode="sheet"
              requestOptions={requestOptions}
              requestOptionsError={requestOptionsError}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
