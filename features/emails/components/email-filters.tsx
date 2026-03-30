"use client";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { emailStatusMeta } from "@/features/emails/metadata";
import type { EmailProcessingStatus } from "@/features/emails/types";
import { cn } from "@/lib/utils";

interface EmailFiltersProps {
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "all" | EmailProcessingStatus) => void;
  search: string;
  selectedStatus: "all" | EmailProcessingStatus;
}

const statusOptions: Array<"all" | EmailProcessingStatus> = [
  "all",
  "new",
  "review",
  "processed",
];

export function EmailFilters({
  onSearchChange,
  onStatusChange,
  search,
  selectedStatus,
}: Readonly<EmailFiltersProps>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Recherche</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Inbox réelle
              </p>
            </div>
            <div className="relative max-w-none xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Rechercher un expéditeur, un sujet, un client ou un thread"
                className="h-11 rounded-[1rem] border-black/[0.06] bg-white pl-10 shadow-none"
              />
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-black/[0.06] bg-[#fbf8f2] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline">Traitement</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Inbox métier
              </p>
            </div>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
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
                    {status === "all" ? "Tous" : emailStatusMeta[status].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
