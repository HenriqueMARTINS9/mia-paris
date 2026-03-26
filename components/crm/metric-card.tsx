import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "danger";
}

const accentStyles = {
  primary:
    "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(20,79,74,0.12)]",
  accent:
    "bg-[rgba(202,142,85,0.12)] text-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(202,142,85,0.15)]",
  danger:
    "bg-destructive/10 text-destructive shadow-[inset_0_0_0_1px_rgba(178,75,54,0.15)]",
} as const;

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
}: Readonly<MetricCardProps>) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          </div>

          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              accentStyles[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2">
          <p className="text-sm text-muted-foreground">{hint}</p>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
