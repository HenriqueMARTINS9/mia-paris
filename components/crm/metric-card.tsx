import type { LucideIcon } from "lucide-react";

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

const accentLineStyles = {
  primary: "from-primary/85 via-primary/50 to-transparent",
  accent: "from-[var(--accent)]/85 via-[var(--accent)]/45 to-transparent",
  danger: "from-destructive/85 via-destructive/45 to-transparent",
} as const;

const accentDotStyles = {
  primary: "bg-primary",
  accent: "bg-[var(--accent)]",
  danger: "bg-destructive",
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
      <CardContent className="relative p-3.5 sm:p-5">
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
            accentLineStyles[accent],
          )}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-foreground sm:mt-3 sm:text-[2rem]">
              {value}
            </p>
          </div>

          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11",
              accentStyles[accent],
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>

        <div className="mt-3.5 flex items-start gap-3 rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2] px-3 py-3 sm:mt-5 sm:rounded-[1.1rem] sm:px-3.5">
          <span
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              accentDotStyles[accent],
            )}
          />
          <p className="line-clamp-2 text-[13px] leading-5 text-muted-foreground sm:text-sm sm:leading-6">
            {hint}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
