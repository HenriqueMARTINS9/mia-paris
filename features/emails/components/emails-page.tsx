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
import { MobileFilterSheet } from "@/components/crm/mobile-filter-sheet";
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
import { GmailAutoSyncBridge } from "@/features/emails/components/gmail-auto-sync-bridge";
import { MobileEmailDetailSheet } from "@/features/emails/components/mobile-email-detail-sheet";
import { MobileEmailList } from "@/features/emails/components/mobile-email-list";
import { EmailPreviewPanel } from "@/features/emails/components/email-preview-panel";
import { EmailsTable } from "@/features/emails/components/emails-table";
import { GmailSyncControls } from "@/features/emails/components/gmail-sync-controls";
import type { EmailListItem, EmailsPageData } from "@/features/emails/types";

export function EmailsPage({
  documentOptions,
  documentOptionsError = null,
  emails,
  gmailInbox,
  qualificationOptions,
  qualificationOptionsError = null,
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
          <Button variant="outline" className="hidden md:inline-flex">
            <ArrowDownToLine className="h-4 w-4" />
            Exporter
          </Button>
          <GmailSyncControls gmailInbox={gmailInbox} />
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
      <GmailAutoSyncBridge gmailInbox={gmailInbox} />
      {header}

      <div className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-4">
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

      <div className="md:hidden">
        <MobileFilterSheet
          title="Filtrer les emails"
          description="Affiner rapidement l’inbox par recherche ou statut de traitement."
        >
          <EmailFilters
            search={search}
            onSearchChange={setSearch}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
        </MobileFilterSheet>
      </div>

      <div className="hidden md:block">
        <EmailFilters
          search={search}
          onSearchChange={setSearch}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-3 md:hidden">
          <div className="grid grid-cols-2 gap-3 rounded-[1.25rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-3">
            <div className="rounded-[1rem] border border-black/[0.06] bg-white px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Nouveaux
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{newCount}</p>
            </div>
            <div className="rounded-[1rem] border border-black/[0.06] bg-white px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                À revoir
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{reviewCount}</p>
            </div>
            <div className="rounded-[1rem] border border-black/[0.06] bg-white px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Traités
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{processedCount}</p>
            </div>
            <div className="rounded-[1rem] border border-black/[0.06] bg-white px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Qualifiés
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{qualifiedCount}</p>
            </div>
          </div>

          <MobileEmailList
            emails={filteredEmails}
            selectedEmailId={selectedEmail?.id ?? null}
            onSelectEmail={(emailId) => {
              setSelectedEmailId(emailId);
              setMobileDetailsOpen(true);
            }}
          />
        </div>

        <Card className="hidden md:block">
          <CardHeader className="gap-4 border-b border-black/[0.06] pb-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  Flux entrant
                </Badge>
                <CardTitle className="mt-3">Inbox opérationnelle</CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Boîte de tri réelle pour ouvrir un email, le qualifier vite, rattacher ou transformer immédiatement en demande exploitable.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white">
                  {filteredEmails.length} visibles
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {newCount} nouveaux
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {reviewCount} à revoir
                </Badge>
              </div>
            </div>
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

        <div className="hidden gap-3 rounded-[1.5rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-4 md:grid md:grid-cols-3">
          {(["new", "review", "processed"] as const).map((status) => {
            const count = filteredEmails.filter((email) => email.status === status).length;

            return (
              <div
                key={status}
                className="rounded-[1.1rem] border border-black/[0.06] bg-white p-4"
              >
                <Badge variant={status === "review" ? "destructive" : "outline"}>
                  {status}
                </Badge>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="md:hidden">
        <MobileEmailDetailSheet
          key={selectedEmail?.id ?? "mobile-email-sheet"}
          documentOptions={documentOptions}
          documentOptionsError={documentOptionsError}
          email={selectedEmail}
          open={mobileDetailsOpen && Boolean(selectedEmail)}
          onOpenChange={setMobileDetailsOpen}
          qualificationOptions={qualificationOptions}
          qualificationOptionsError={qualificationOptionsError}
          requestOptions={requestOptions}
          requestOptionsError={requestOptionsError}
        />
      </div>

      <div className="hidden md:block">
        <Sheet
          open={mobileDetailsOpen && Boolean(selectedEmail)}
          onOpenChange={setMobileDetailsOpen}
        >
          <SheetContent className="inset-x-0 bottom-0 top-auto h-[min(90vh,820px)] w-full max-w-none rounded-t-[1.6rem] border-b-0 border-l-0 border-r-0 p-4 sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-2xl sm:rounded-none sm:border-b sm:border-l sm:border-r-0 sm:border-t-0 sm:p-6">
            <SheetHeader>
              <SheetTitle>Détail email</SheetTitle>
              <SheetDescription>
                Aperçu du message, qualification IA et actions de transformation CRM.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:mt-6 sm:pb-6">
              <EmailPreviewPanel
                documentOptions={documentOptions}
                documentOptionsError={documentOptionsError}
                email={selectedEmail}
                mode="sheet"
                qualificationOptions={qualificationOptions}
                qualificationOptionsError={qualificationOptionsError}
                requestOptions={requestOptions}
                requestOptionsError={requestOptionsError}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
