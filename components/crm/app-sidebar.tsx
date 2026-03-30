"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Dot, Menu } from "lucide-react";

import { useCrmSummary } from "@/components/crm/crm-summary-provider";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { primaryNavigation, secondaryNavigation } from "@/components/crm/nav-config";
import { cn } from "@/lib/utils";
import type { CrmSummary } from "@/types/crm";

export function AppSidebar() {
  const pathname = usePathname();
  const { can } = useAuthorization();
  const { summary, isLoading } = useCrmSummary();
  const visiblePrimaryNavigation = primaryNavigation.filter(
    (item) => !item.requiredPermission || can(item.requiredPermission),
  );
  const visibleSecondaryNavigation = secondaryNavigation.filter(
    (item) => !item.requiredPermission || can(item.requiredPermission),
  );

  return (
    <aside className="hidden md:block">
      <div className="sticky top-0 h-screen p-4 lg:p-5">
        <div className="flex h-full flex-col overflow-hidden rounded-[1.8rem] bg-[#17212b] text-white shadow-[0_28px_60px_rgba(15,22,29,0.28)]">
          <Link
            href="/dashboard"
            className="border-b border-white/10 px-4 py-5 lg:px-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#17212b] shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                  MIA PARIS
                </p>
                <h1 className="truncate text-base font-semibold text-white">
                  CRM textile B2B
                </h1>
              </div>
            </div>

            <div className="mt-4 hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">
              <Badge className="border-white/10 bg-white/10 text-white">
                Workspace live
              </Badge>
              <Badge className="border-[#ca8e55]/25 bg-[#ca8e55]/16 text-[#f1c08e]">
                Quotidien
              </Badge>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto px-2 py-4 lg:px-3">
            <div className="mb-3 hidden px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40 lg:block">
              Pilotage
            </div>
            <nav className="space-y-1.5">
              {visiblePrimaryNavigation.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  summary={summary}
                  isLoading={isLoading}
                />
              ))}
            </nav>

            <div className="mb-3 mt-6 hidden px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40 lg:block">
              Automatisation
            </div>
            <nav className="space-y-1.5">
              {visibleSecondaryNavigation.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  summary={summary}
                  isLoading={isLoading}
                />
              ))}
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
  summary,
  isLoading,
}: Readonly<{
  item: (typeof primaryNavigation)[number] | (typeof secondaryNavigation)[number];
  pathname: string;
  summary: CrmSummary;
  isLoading: boolean;
}>) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const metric = item.summaryKey !== undefined ? summary[item.summaryKey] : null;
  const metricLabel =
    item.summaryKey !== undefined && isLoading ? "..." : metric?.toString() ?? null;

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "group flex items-center gap-3 rounded-[1.15rem] px-3 py-3 text-sm",
        isActive
          ? "bg-white/12 text-white"
          : "text-white/70 hover:bg-white/7 hover:text-white",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors",
          isActive
            ? "bg-white text-[#17212b]"
            : "bg-white/8 text-white/70 group-hover:bg-white/12 group-hover:text-white",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="hidden min-w-0 flex-1 lg:block">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-medium">{item.label}</span>
          {metricLabel !== null ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                isActive ? "bg-white/16 text-white" : "bg-white/8 text-white/70",
              )}
            >
              {metricLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-white/42">{item.description}</p>
      </div>

      <div className="flex flex-col items-center gap-1 lg:hidden">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          {item.shortLabel}
        </span>
        {metricLabel !== null ? (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              isActive ? "bg-white/16 text-white" : "bg-white/8 text-white/65",
            )}
          >
            {metricLabel}
          </span>
        ) : (
          <Dot className="h-3 w-3 text-white/30" />
        )}
      </div>
    </Link>
  );
}

export function MobileNavigationMenu() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { can } = useAuthorization();
  const { summary, isLoading } = useCrmSummary();
  const visiblePrimaryNavigation = primaryNavigation.filter(
    (item) => !item.requiredPermission || can(item.requiredPermission),
  );
  const visibleSecondaryNavigation = secondaryNavigation.filter(
    (item) => !item.requiredPermission || can(item.requiredPermission),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/8 bg-white text-foreground shadow-[0_10px_28px_rgba(18,27,34,0.08)] transition hover:bg-[#f8f4ed] md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent className="left-0 right-auto h-full w-[86vw] max-w-sm border-l-0 border-r border-white/10 bg-[#17212b] p-0 text-white">
          <div className="flex h-full flex-col overflow-hidden">
            <SheetHeader className="border-b border-white/10 px-5 py-5 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#17212b] shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                    MIA PARIS
                  </p>
                  <SheetTitle className="truncate text-left text-base text-white">
                    Menu
                  </SheetTitle>
                </div>
              </div>
              <SheetDescription className="text-left text-white/65">
                Navigation principale du CRM et accès rapide aux modules métier.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                Pilotage
              </div>
              <nav className="space-y-2">
                {visiblePrimaryNavigation.map((item) => (
                  <SheetSidebarLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    summary={summary}
                    isLoading={isLoading}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
              </nav>

              {visibleSecondaryNavigation.length > 0 ? (
                <>
                  <div className="mb-3 mt-6 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                    Automatisation
                  </div>
                  <nav className="space-y-2">
                    {visibleSecondaryNavigation.map((item) => (
                      <SheetSidebarLink
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        summary={summary}
                        isLoading={isLoading}
                        onNavigate={() => setMobileMenuOpen(false)}
                      />
                    ))}
                  </nav>
                </>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SheetSidebarLink({
  item,
  onNavigate,
  pathname,
  summary,
  isLoading,
}: Readonly<{
  item: (typeof primaryNavigation)[number] | (typeof secondaryNavigation)[number];
  onNavigate: () => void;
  pathname: string;
  summary: CrmSummary;
  isLoading: boolean;
}>) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const metric = item.summaryKey !== undefined ? summary[item.summaryKey] : null;
  const metricLabel =
    item.summaryKey !== undefined && isLoading ? "..." : metric?.toString() ?? null;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-[1.15rem] px-3 py-3 text-sm",
        isActive
          ? "bg-white/12 text-white"
          : "text-white/70 hover:bg-white/7 hover:text-white",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors",
          isActive
            ? "bg-white text-[#17212b]"
            : "bg-white/8 text-white/70 group-hover:bg-white/12 group-hover:text-white",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-medium">{item.label}</span>
          {metricLabel !== null ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                isActive ? "bg-white/16 text-white" : "bg-white/8 text-white/70",
              )}
            >
              {metricLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-white/42">{item.description}</p>
      </div>
    </Link>
  );
}
