"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { primaryNavigation, secondaryNavigation } from "@/components/crm/nav-config";
import type { CrmSummary } from "@/types/crm";

interface AppSidebarProps {
  summary: CrmSummary;
}

export function AppSidebar({ summary }: Readonly<AppSidebarProps>) {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen border-r border-white/60 bg-[var(--sidebar)] md:flex md:flex-col">
      <div className="flex h-full flex-col gap-6 px-4 py-5 xl:px-5">
        <div className="glass-panel rounded-[1.5rem] border border-white/70 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(20,79,74,0.22)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="hidden min-w-0 xl:block">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                MIA PARIS
              </p>
              <h1 className="truncate text-base font-semibold">
                CRM textile B2B
              </h1>
            </div>
          </div>

          <div className="mt-4 hidden xl:flex xl:flex-col xl:gap-3">
            <Badge className="w-fit border-primary/[0.15] bg-primary/[0.08] text-primary">
              PE26 live
            </Badge>
            <p className="text-sm leading-6 text-muted-foreground">
              Demandes, validations, production et email entrant dans un seul
              cockpit métier.
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {primaryNavigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const metric =
              item.summaryKey !== undefined ? summary[item.summaryKey] : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm",
                  isActive
                    ? "border-primary/15 bg-primary/[0.08] text-primary shadow-[0_12px_30px_rgba(20,79,74,0.08)]"
                    : "border-transparent text-foreground/80 hover:border-white/70 hover:bg-white/50 hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/75 text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="hidden min-w-0 flex-1 xl:block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-semibold">{item.label}</span>
                    {metric !== null ? (
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {metric}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <div className="xl:hidden">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.shortLabel}
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="my-3 hidden xl:block px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Automatisation
          </div>

          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const metric =
              item.summaryKey !== undefined ? summary[item.summaryKey] : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm",
                  isActive
                    ? "border-primary/15 bg-primary/[0.08] text-primary"
                    : "border-transparent text-foreground/80 hover:border-white/70 hover:bg-white/50 hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/75 text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="hidden min-w-0 flex-1 xl:block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-semibold">{item.label}</span>
                    {metric !== null ? (
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {metric}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <div className="xl:hidden">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.shortLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="glass-panel rounded-[1.5rem] border border-white/70 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgba(202,142,85,0.14)] text-[var(--accent)]">
              <CircleAlert className="h-4 w-4" />
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-semibold">Urgences du jour</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {summary.criticalDeadlines} jalons critiques à traiter avant
                relance client ou production.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full justify-between xl:justify-center"
          >
            <span className="hidden xl:inline">Ouvrir la vue urgences</span>
            <span className="xl:hidden">Urgences</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
