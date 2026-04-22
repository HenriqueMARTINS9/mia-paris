"use client";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { emailInboxBucketMeta, emailStatusMeta } from "@/features/emails/metadata";
import type {
  EmailBucketCounts,
  EmailInboxBucket,
  EmailListStatusFilter,
} from "@/features/emails/types";
import { cn } from "@/lib/utils";

interface EmailFiltersProps {
  bucketCounts: EmailBucketCounts;
  onBucketChange: (value: "all" | EmailInboxBucket) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: EmailListStatusFilter) => void;
  search: string;
  selectedBucket: "all" | EmailInboxBucket;
  selectedStatus: EmailListStatusFilter;
}

const bucketOptions: Array<"all" | EmailInboxBucket> = [
  "all",
  "important",
  "to_review",
  "promotional",
];

const statusOptions: EmailListStatusFilter[] = [
  "all",
  "new",
  "review",
  "processed",
];

const statusLabels: Record<EmailListStatusFilter, string> = {
  all: "Tous",
  new: "Nouveaux",
  processed: "Traités",
  review: "À revoir",
};

export function EmailFilters({
  bucketCounts,
  onBucketChange,
  onSearchChange,
  onStatusChange,
  search,
  selectedBucket,
  selectedStatus,
}: Readonly<EmailFiltersProps>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Inbox</Badge>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Filtres métier
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Recherche, tri assistant et statut de traitement.
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex w-max gap-2">
          {bucketOptions.map((bucket) => {
            const count =
              bucket === "all"
                ? bucketCounts.all
                : bucket === "important"
                  ? bucketCounts.important
                  : bucket === "promotional"
                    ? bucketCounts.promotional
                    : bucketCounts.toReview;

            return (
              <button
                key={bucket}
                type="button"
                onClick={() => onBucketChange(bucket)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                  selectedBucket === bucket
                    ? "border-primary/[0.14] bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(20,79,74,0.04)]"
                    : "border-black/[0.06] bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {bucket === "all"
                  ? `Tous · ${count}`
                  : `${emailInboxBucketMeta[bucket].label} · ${count}`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un expéditeur, un objet ou un aperçu"
            className="h-11 rounded-[1rem] border-black/[0.06] bg-white pl-10 shadow-none"
          />
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1 xl:max-w-full">
          <div className="flex w-max gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange(status)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                  selectedStatus === status
                    ? "border-primary/[0.14] bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(20,79,74,0.04)]"
                    : "border-black/[0.06] bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {status === "all" ? statusLabels.all : emailStatusMeta[status].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
