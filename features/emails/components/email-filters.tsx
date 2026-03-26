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
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un expéditeur, un sujet, un client ou un thread"
            className="pl-10"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Traitement</Badge>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Inbox métier
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange(status)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                  selectedStatus === status
                    ? "border-primary/[0.15] bg-primary/10 text-primary"
                    : "border-white/70 bg-white/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {status === "all" ? "Tous" : emailStatusMeta[status].label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
