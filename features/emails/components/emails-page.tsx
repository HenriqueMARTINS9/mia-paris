"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
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
  bucketCounts,
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
  const [selectedBucket, setSelectedBucket] = useState(filters.selectedBucket);
  const [selectedStatus, setSelectedStatus] = useState(filters.selectedStatus);
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile" | "unknown">(
    "unknown",
  );
  const selectedEmailQueryId = searchParams.get("email");
  const isDesktopViewport = viewportMode === "desktop";
  const isMobileViewport = viewportMode === "mobile";
  const areFiltersLoading = viewportMode === "unknown";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleChange = () =>
      setViewportMode(mediaQuery.matches ? "desktop" : "mobile");

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (
        searchInput === filters.search &&
        selectedBucket === filters.selectedBucket &&
        selectedStatus === filters.selectedStatus
      ) {
        return;
      }

      navigateWithQuery({
        pathname,
        patch: {
          email: null,
          bucket: selectedBucket === "important" ? null : selectedBucket,
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
    filters.selectedBucket,
    filters.selectedStatus,
    pathname,
    router,
    searchInput,
    searchParams,
    selectedBucket,
    selectedStatus,
  ]);

  const selectedEmail = selectedEmailQueryId
    ? emails.find((email) => email.id === selectedEmailQueryId) ?? null
    : null;
  const highlightedEmailId = selectedEmail?.id ?? selectedEmailId ?? null;
  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.selectedBucket !== "important" ||
    filters.selectedStatus !== "all";
  const visibleCountLabel = `${emails.length}/${pagination.totalItems}`;
  const paginationSummary = useMemo(() => {
    if (pagination.totalItems === 0 || emails.length === 0) {
      return "0 email";
    }

    const from = (pagination.page - 1) * pagination.perPage + 1;
    const to = from + emails.length - 1;

    return `${from}-${to} sur ${pagination.totalItems}`;
  }, [emails.length, pagination.page, pagination.perPage, pagination.totalItems]);

  function closeEmailDetail() {
    navigateWithQuery({
      pathname,
      patch: {
        email: null,
      },
      router,
      searchParams,
      startTransition: startRoutingTransition,
    });
  }

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
              : filters.selectedBucket === "promotional"
                ? "Aucun email publicitaire détecté"
                : filters.selectedBucket === "to_review"
                  ? "Aucun email en attente de vérification"
                  : "Aucun email important dans l’inbox"
          }
          description={
            hasActiveFilters
              ? "Essaie un autre statut, réduis la recherche ou reviens à la première page."
              : filters.selectedBucket === "promotional"
                ? "L’assistant n’a pas encore classé de newsletters ou promotions dans cet onglet."
                : filters.selectedBucket === "to_review"
                  ? "Tous les emails visibles ont déjà été classés comme importants ou publicitaires."
                  : "L’inbox principale est vide pour l’instant ou les nouveaux emails attendent encore un tri assistant."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GmailAutoSyncBridge gmailInbox={gmailInbox} />
      {header}

      {areFiltersLoading ? (
        <FiltersLoadingCard />
      ) : (
        <>
          <div className="md:hidden">
            <MobileFilterSheet
              title="Filtrer les emails"
              description="Affiner rapidement l’inbox par recherche ou statut de traitement."
            >
              <EmailFilters
                bucketCounts={bucketCounts}
                search={searchInput}
                onBucketChange={setSelectedBucket}
                onSearchChange={setSearchInput}
                selectedStatus={selectedStatus}
                selectedBucket={selectedBucket}
                onStatusChange={setSelectedStatus}
              />
            </MobileFilterSheet>
          </div>

          <div className="hidden md:block">
            <EmailFilters
              bucketCounts={bucketCounts}
              search={searchInput}
              onBucketChange={setSelectedBucket}
              onSearchChange={setSearchInput}
              selectedStatus={selectedStatus}
              selectedBucket={selectedBucket}
              onStatusChange={setSelectedStatus}
            />
          </div>
        </>
      )}
      <div className="grid gap-4 md:hidden">
        <div className="grid grid-cols-2 gap-3 rounded-[1.25rem] border border-black/[0.06] bg-[#fbf8f2]/95 p-3">
          <MobileStatCard label="Important" value={bucketCounts.important} />
          <MobileStatCard label="À vérifier" value={bucketCounts.toReview} />
          <MobileStatCard label="Pub" value={bucketCounts.promotional} />
          <MobileStatCard label="Traités" value={counts.processed} />
        </div>

        <Card>
          <CardHeader className="gap-3 border-b border-black/[0.06] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  Inbox
                </Badge>
                <CardTitle className="mt-2">Emails visibles</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white">
                  {visibleCountLabel}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {paginationSummary}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <MobileEmailList
              emails={emails}
              selectedEmailId={highlightedEmailId}
              onSelectEmail={(emailId) => {
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
          </CardContent>
        </Card>

        {isMobileViewport ? (
          <MobileEmailDetailSheet
            key={selectedEmail?.id ?? "mobile-email-sheet"}
            documentOptions={documentOptions}
            documentOptionsError={documentOptionsError}
            email={selectedEmail}
            open={Boolean(selectedEmail)}
            onOpenChange={(open) => {
              if (!open) {
                closeEmailDetail();
              }
            }}
            qualificationOptions={qualificationOptions}
            qualificationOptionsError={qualificationOptionsError}
            requestOptions={requestOptions}
            requestOptionsError={requestOptionsError}
          />
        ) : null}
      </div>

      <div className="hidden md:block">
        <Card>
          <CardHeader className="gap-3 border-b border-black/[0.06] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  Inbox opérationnelle
                </Badge>
                <CardTitle className="mt-2">Liste des emails</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white">
                  {visibleCountLabel}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {bucketCounts.important} importants
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {bucketCounts.toReview} à vérifier
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {bucketCounts.promotional} pub
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <EmailsTable
              emails={emails}
              selectedEmailId={highlightedEmailId}
              onSelectEmail={(emailId) => {
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
          <CardContent className="border-t border-black/[0.06] p-4">
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
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={isDesktopViewport && Boolean(selectedEmail)}
        onOpenChange={(open) => {
          if (!open) {
            closeEmailDetail();
          }
        }}
      >
        <SheetContent className="hidden w-full max-w-none border-l-0 p-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 md:flex md:max-w-[46rem] md:border-l">
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b border-black/[0.06] px-6 py-5">
              <SheetTitle>Email métier</SheetTitle>
              <SheetDescription>
                Aperçu complet, qualification, rattachement CRM et pièces jointes sans réduire la largeur de la liste.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
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
          </div>
        </SheetContent>
      </Sheet>
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

function FiltersLoadingCard() {
  return (
    <Card>
      <CardContent className="flex min-h-32 flex-col items-center justify-center gap-3 p-5 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Chargement des filtres emails</p>
          <p className="text-xs text-muted-foreground">
            On prépare l’inbox et ses contrôles de tri.
          </p>
        </div>
      </CardContent>
    </Card>
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
