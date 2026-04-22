"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/crm/empty-state";
import { ErrorState } from "@/components/crm/error-state";
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
import { EmailPreviewPanel } from "@/features/emails/components/email-preview-panel";
import { EmailsTable } from "@/features/emails/components/emails-table";
import { GmailAutoSyncBridge } from "@/features/emails/components/gmail-auto-sync-bridge";
import { GmailSyncControls } from "@/features/emails/components/gmail-sync-controls";
import { MobileEmailDetailSheet } from "@/features/emails/components/mobile-email-detail-sheet";
import { MobileEmailList } from "@/features/emails/components/mobile-email-list";
import { emailInboxBucketMeta } from "@/features/emails/metadata";
import type { EmailsPageData } from "@/features/emails/types";

const SEARCH_DEBOUNCE_MS = 280;

export function EmailsPage({
  bucketCounts,
  emails,
  error = null,
  filters,
  gmailInbox,
  pagination,
  requestOptions,
  requestOptionsError = null,
  selectedEmailId,
  oauthFeedbackMessage = null,
}: Readonly<
  EmailsPageData & {
    oauthFeedbackMessage?: string | null;
  }
>) {
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
  const [optimisticSelectedEmailId, setOptimisticSelectedEmailId] = useOptimistic<
    string | null,
    string | null
  >(
    selectedEmailQueryId ?? selectedEmailId ?? null,
    (_, nextValue) => nextValue,
  );
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
          bucket: selectedBucket === "important" ? null : selectedBucket,
          email: null,
          page: null,
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

  const selectedEmail = optimisticSelectedEmailId
    ? emails.find((email) => email.id === optimisticSelectedEmailId) ?? null
    : null;
  const shouldRenderDesktopSheet = isDesktopViewport && Boolean(selectedEmail);
  const highlightedEmailId =
    selectedEmail?.id ?? optimisticSelectedEmailId ?? selectedEmailId ?? null;
  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.selectedBucket !== "important" ||
    filters.selectedStatus !== "all";
  const paginationSummary = useMemo(() => {
    if (pagination.totalItems === 0 || emails.length === 0) {
      return "Aucun email";
    }

    const from = (pagination.page - 1) * pagination.perPage + 1;
    const to = from + emails.length - 1;

    return `${from}-${to} sur ${pagination.totalItems}`;
  }, [emails.length, pagination.page, pagination.perPage, pagination.totalItems]);

  function closeEmailDetail() {
    setOptimisticSelectedEmailId(null);
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
      eyebrow="Flux client"
      title="Emails"
      badge={`${pagination.totalItems} visibles`}
      description="Une inbox métier courte et claire : Claw trie, le CRM résume, vous validez ou corrigez si besoin."
      actions={<GmailSyncControls gmailInbox={gmailInbox} />}
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

  const emptyStateTitle = hasActiveFilters
    ? "Aucun email ne correspond à ce filtre"
    : filters.selectedBucket === "promotional"
      ? "Aucun email publicitaire visible"
      : filters.selectedBucket === "to_review"
        ? "Aucun email à vérifier pour l’instant"
        : "Aucun email important à vérifier";
  const emptyStateDescription = hasActiveFilters
    ? "Ajuste la recherche ou reviens à un tri plus large."
    : filters.selectedBucket === "promotional"
      ? "Claw n’a pas laissé de newsletter ou de promotion à cet endroit."
      : filters.selectedBucket === "to_review"
        ? "Les cas incertains ont déjà été absorbés ou déplacés."
        : "L’inbox principale est vide pour le moment.";

  return (
    <div className="flex flex-col gap-6">
      <GmailAutoSyncBridge gmailInbox={gmailInbox} />
      {header}
      {oauthFeedbackMessage ? (
        <ErrorState
          title="Connexion Gmail partagée"
          description={oauthFeedbackMessage}
        />
      ) : null}

      {areFiltersLoading ? (
        <FiltersLoadingCard />
      ) : (
        <>
          <div className="md:hidden">
            <MobileFilterSheet
              title="Filtrer les emails"
              description="Choisir l’onglet assistant et retrouver vite un message utile."
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

      <InboxSummaryCard
        bucketCounts={bucketCounts}
        paginationSummary={paginationSummary}
        selectedBucket={filters.selectedBucket}
        selectedStatus={filters.selectedStatus}
      />

      <div className="grid gap-4 md:hidden">
        <Card>
          <CardHeader className="gap-2 border-b border-black/[0.06] pb-4">
            <CardTitle>Liste des emails</CardTitle>
            <p className="text-sm text-muted-foreground">
              10 emails au maximum, pour garder une lecture rapide.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {emails.length > 0 ? (
              <>
                <MobileEmailList
                  emails={emails}
                  selectedEmailId={highlightedEmailId}
                  onSelectEmail={(emailId) => {
                    setOptimisticSelectedEmailId(emailId);
                    navigateWithQuery({
                      pathname,
                      patch: { email: emailId },
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
                  totalPages={pagination.totalPages}
                  totalSummary={paginationSummary}
                />
              </>
            ) : (
              <EmptyState
                title={emptyStateTitle}
                description={emptyStateDescription}
              />
            )}
          </CardContent>
        </Card>

        {isMobileViewport ? (
          <MobileEmailDetailSheet
            key={`${selectedEmail?.id ?? "mobile-email-sheet"}:${selectedEmail?.linkedRequestId ?? "none"}`}
            email={selectedEmail}
            open={Boolean(selectedEmail)}
            onOpenChange={(open) => {
              if (!open) {
                closeEmailDetail();
              }
            }}
            requestOptions={requestOptions}
            requestOptionsError={requestOptionsError}
          />
        ) : null}
      </div>

      <div className="hidden md:block">
        <Card>
          <CardHeader className="gap-2 border-b border-black/[0.06] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="outline" className="bg-[#fbf8f2]">
                  Inbox métier
                </Badge>
                <CardTitle className="mt-2">Liste des emails</CardTitle>
              </div>
              <Badge variant="outline" className="bg-white">
                {paginationSummary}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Vue courte et lisible, 10 emails seulement par page.
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {emails.length > 0 ? (
              <EmailsTable
                emails={emails}
                selectedEmailId={highlightedEmailId}
                onSelectEmail={(emailId) => {
                  setOptimisticSelectedEmailId(emailId);
                  navigateWithQuery({
                    pathname,
                    patch: { email: emailId },
                    router,
                    searchParams,
                    startTransition: startRoutingTransition,
                  });
                }}
              />
            ) : (
              <div className="p-6">
                <EmptyState
                  title={emptyStateTitle}
                  description={emptyStateDescription}
                />
              </div>
            )}
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
              totalPages={pagination.totalPages}
              totalSummary={paginationSummary}
            />
          </CardContent>
        </Card>
      </div>

      {shouldRenderDesktopSheet ? (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) {
              closeEmailDetail();
            }
          }}
        >
          <SheetContent className="hidden w-full max-w-none border-l-0 p-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 md:flex md:max-w-[42rem] md:border-l">
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader className="border-b border-black/[0.06] px-6 py-5">
                <SheetTitle>Email métier</SheetTitle>
                <SheetDescription>
                  Vue courte pour décider vite, avec le fil complet seulement si vous l’ouvrez.
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <EmailPreviewPanel
                  email={selectedEmail}
                  mode="sheet"
                  requestOptions={requestOptions}
                  requestOptionsError={requestOptionsError}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

function InboxSummaryCard({
  bucketCounts,
  paginationSummary,
  selectedBucket,
  selectedStatus,
}: Readonly<{
  bucketCounts: EmailsPageData["bucketCounts"];
  paginationSummary: string;
  selectedBucket: EmailsPageData["filters"]["selectedBucket"];
  selectedStatus: EmailsPageData["filters"]["selectedStatus"];
}>) {
  const selectedBucketLabel =
    selectedBucket === "all"
      ? "Tous les emails"
      : emailInboxBucketMeta[selectedBucket].label;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {selectedBucketLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedStatus === "all"
              ? "Tous statuts"
              : selectedStatus === "review"
                ? "Emails à revoir"
                : "Emails déjà traités"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-white">
            {paginationSummary}
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
      </CardContent>
    </Card>
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
  totalPages,
  totalSummary,
}: Readonly<{
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  totalPages: number;
  totalSummary: string;
}>) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.25rem] border border-black/[0.06] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{totalSummary}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Pagination fixe 10 / 10
        </p>
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
