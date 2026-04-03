"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  MailCheck,
  MailOpen,
  ScanSearch,
  TriangleAlert,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
import { MetricCard } from "@/components/crm/metric-card";
import { MobileFilterSheet } from "@/components/crm/mobile-filter-sheet";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
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
import { GmailAutoSyncBridge } from "@/features/emails/components/gmail-auto-sync-bridge";
import { GmailSyncControls } from "@/features/emails/components/gmail-sync-controls";
import { MobileEmailDetailSheet } from "@/features/emails/components/mobile-email-detail-sheet";
import { MobileEmailList } from "@/features/emails/components/mobile-email-list";
import type {
  EmailPageSize,
  EmailsPageData,
} from "@/features/emails/types";

const SEARCH_DEBOUNCE_MS = 280;

export function EmailsPage({
  counts,
  documentOptions,
  documentOptionsError = null,
  emails,
  error = null,
  filters,
  gmailInbox,
  pagination,
  qualificationOptions,
  qualificationOptionsError = null,
  requestOptions,
  requestOptionsError = null,
  selectedEmailId,
}: Readonly<EmailsPageData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isRoutingPending, startRoutingTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(filters.search);
  const [selectedStatus, setSelectedStatus] = useState(filters.selectedStatus);
  const [selectedEmailIdState, setSelectedEmailIdState] = useState<string | null>(
    selectedEmailId ?? emails[0]?.id ?? null,
  );
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (
        searchInput === filters.search &&
        selectedStatus === filters.selectedStatus
      ) {
        return;
      }

      navigateWithQuery({
        pathname,
        patch: {
          email: null,
          page: "1",
          search: searchInput.trim() || null,
          status: selectedStatus === "all" ? null : selectedStatus,
        },
        router,
        searchParams,
        startTransition: startRoutingTransition,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    filters.search,
    filters.selectedStatus,
    pathname,
    router,
    searchInput,
    searchParams,
    selectedStatus,
  ]);

  const selectedEmail =
    emails.find((email) => email.id === selectedEmailIdState) ?? emails[0] ?? null;
  const hasActiveFilters =
    filters.search.trim().length > 0 || filters.selectedStatus !== "all";
  const visibleCountLabel = `${emails.length}/${pagination.totalItems}`;
  const paginationSummary = useMemo(() => {
    if (pagination.totalItems === 0 || emails.length === 0) {
      return "0 email";
    }

    const from = (pagination.page - 1) * pagination.perPage + 1;
    const to = from + emails.length - 1;

    return `${from}-${to} sur ${pagination.totalItems}`;
  }, [emails.length, pagination.page, pagination.perPage, pagination.totalItems]);

  const header = (
    <PageHeader
      eyebrow="Étape 8 · Emails métier"
      title="Emails"
      badge={`${pagination.totalItems} email${pagination.totalItems > 1 ? "s" : ""}`}
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
          title={
            hasActiveFilters
              ? "Aucun email ne correspond aux filtres"
              : "Aucun email dans la table emails"
          }
          description={
            hasActiveFilters
              ? "Essaie un autre statut, réduis la recherche ou reviens à la première page."
              : "La table Supabase est accessible mais ne contient encore aucun email métier à traiter."
          }
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
          value={String(counts.new)}
          hint="Emails entrants encore non absorbés dans le CRM."
          icon={MailOpen}
        />
        <MetricCard
          label="À revoir"
          value={String(counts.review)}
          hint="Emails qui demandent un arbitrage ou une reprise de qualification."
          icon={TriangleAlert}
          accent="danger"
        />
        <MetricCard
          label="Traités"
          value={String(counts.processed)}
          hint="Emails déjà absorbés ou clôturés côté métier."
          icon={MailCheck}
        />
        <MetricCard
          label="Qualifiés IA"
          value={String(counts.qualified)}
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
            search={searchInput}
            onSearchChange={setSearchInput}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
        </MobileFilterSheet>
      </div>

      <div className="hidden md:block">
        <EmailFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-3 md:hidden">
          <div className="grid grid-cols-2 gap-3 rounded-[1.25rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-3">
            <MobileStatCard label="Nouveaux" value={counts.new} />
            <MobileStatCard label="À revoir" value={counts.review} />
            <MobileStatCard label="Traités" value={counts.processed} />
            <MobileStatCard label="Qualifiés" value={counts.qualified} />
          </div>

          <div className="rounded-[1.2rem] border border-black/[0.06] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Page
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {visibleCountLabel} visibles
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{paginationSummary}</p>
            </div>
          </div>

          <MobileEmailList
            emails={emails}
            selectedEmailId={selectedEmail?.id ?? null}
            onSelectEmail={(emailId) => {
              setSelectedEmailIdState(emailId);
              setMobileDetailsOpen(true);
              navigateWithQuery({
                pathname,
                patch: {
                  email: emailId,
                },
                router,
                searchParams,
                startTransition: startRoutingTransition,
              });
            }}
          />

          <EmailPaginationControls
            currentPage={pagination.page}
            disabled={isRoutingPending}
            onPageChange={(nextPage) =>
              navigateWithQuery({
                pathname,
                patch: {
                  email: null,
                  page: String(nextPage),
                },
                router,
                searchParams,
                startTransition: startRoutingTransition,
              })
            }
            onPerPageChange={(nextPerPage) =>
              navigateWithQuery({
                pathname,
                patch: {
                  email: null,
                  page: "1",
                  perPage: String(nextPerPage),
                },
                router,
                searchParams,
                startTransition: startRoutingTransition,
              })
            }
            perPage={pagination.perPage}
            totalPages={pagination.totalPages}
            totalSummary={paginationSummary}
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
                  {visibleCountLabel} visibles
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {counts.open} ouverts
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {counts.review} à revoir
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <EmailsTable
              emails={emails}
              selectedEmailId={selectedEmail?.id ?? null}
              onSelectEmail={(emailId) => {
                setSelectedEmailIdState(emailId);
                setMobileDetailsOpen(true);
                navigateWithQuery({
                  pathname,
                  patch: {
                    email: emailId,
                  },
                  router,
                  searchParams,
                  startTransition: startRoutingTransition,
                });
              }}
            />
          </CardContent>
        </Card>

        <div className="hidden gap-3 rounded-[1.5rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-4 md:grid md:grid-cols-3">
          {([
            ["new", counts.new],
            ["review", counts.review],
            ["processed", counts.processed],
          ] as const).map(([status, count]) => (
            <div
              key={status}
              className="rounded-[1.1rem] border border-black/[0.06] bg-white p-4"
            >
              <Badge variant={status === "review" ? "destructive" : "outline"}>
                {status}
              </Badge>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{count}</p>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <EmailPaginationControls
            currentPage={pagination.page}
            disabled={isRoutingPending}
            onPageChange={(nextPage) =>
              navigateWithQuery({
                pathname,
                patch: {
                  email: null,
                  page: String(nextPage),
                },
                router,
                searchParams,
                startTransition: startRoutingTransition,
              })
            }
            onPerPageChange={(nextPerPage) =>
              navigateWithQuery({
                pathname,
                patch: {
                  email: null,
                  page: "1",
                  perPage: String(nextPerPage),
                },
                router,
                searchParams,
                startTransition: startRoutingTransition,
              })
            }
            perPage={pagination.perPage}
            totalPages={pagination.totalPages}
            totalSummary={paginationSummary}
          />
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

function MobileStatCard({
  label,
  value,
}: Readonly<{
  label: string;
  value: number;
}>) {
  return (
    <div className="rounded-[1rem] border border-black/[0.06] bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function EmailPaginationControls({
  currentPage,
  disabled = false,
  onPageChange,
  onPerPageChange,
  perPage,
  totalPages,
  totalSummary,
}: Readonly<{
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: EmailPageSize) => void;
  perPage: EmailPageSize;
  totalPages: number;
  totalSummary: string;
}>) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.25rem] border border-black/[0.06] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-sm font-medium text-foreground">{totalSummary}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Par page
          </span>
          <Select
            value={String(perPage)}
            onChange={(event) =>
              onPerPageChange(Number(event.target.value) as EmailPageSize)
            }
            className="h-9 w-[92px] rounded-full border-black/[0.06] bg-[#fbf8f2] px-3 py-1 text-xs shadow-none"
            disabled={disabled}
          >
            <option value="10">10</option>
            <option value="15">15</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="text-sm font-semibold text-foreground">
          Page {currentPage} / {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-full"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || currentPage >= totalPages}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function navigateWithQuery(input: {
  pathname: string;
  patch: Record<string, string | null>;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  startTransition: (callback: () => void) => void;
}) {
  const nextSearchParams = new URLSearchParams(input.searchParams.toString());

  for (const [key, value] of Object.entries(input.patch)) {
    if (!value) {
      nextSearchParams.delete(key);
      continue;
    }

    nextSearchParams.set(key, value);
  }

  const query = nextSearchParams.toString();
  const href = query.length > 0 ? `${input.pathname}?${query}` : input.pathname;

  input.startTransition(() => {
    input.router.replace(href, { scroll: false });
  });
}
