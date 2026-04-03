import { Search } from "lucide-react";

import { MobileNavigationMenu } from "@/components/crm/app-sidebar";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  appRoleLabels,
  normalizeAppUserRole,
} from "@/features/auth/authorization";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { CurrentUserContext } from "@/features/auth/types";

interface AppTopbarProps {
  currentUser: CurrentUserContext;
}

export function AppTopbar({ currentUser }: Readonly<AppTopbarProps>) {
  const displayName =
    currentUser.appUser?.full_name ??
    currentUser.authUser.user_metadata.full_name ??
    currentUser.authUser.email ??
    "Utilisateur";
  const displayEmail =
    currentUser.appUser?.email ?? currentUser.authUser.email ?? null;
  const currentRole = normalizeAppUserRole(currentUser.appUser?.role ?? null);

  return (
    <header className="sticky top-0 z-30 px-3 pt-2 sm:px-5 sm:pt-3 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="rounded-[1rem] border border-black/8 bg-white/82 px-3 py-2.5 shadow-[0_14px_34px_rgba(18,27,34,0.055)] backdrop-blur-xl sm:rounded-[1.2rem] sm:px-4 sm:py-3">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3 md:hidden">
              <div className="flex min-w-0 items-center gap-2.5">
                <MobileNavigationMenu />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    MIA PARIS
                  </p>
                  <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                    CRM opérationnel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-xs font-semibold text-primary-foreground">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <LogoutButton />
              </div>
            </div>

            <div className="md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher dans le CRM"
                  className="h-10 rounded-[0.95rem] border-black/8 bg-white pl-11 text-sm shadow-none"
                  placeholder="Rechercher un client, une demande ou un email"
                />
              </div>
            </div>

            <div className="hidden md:flex md:items-center md:justify-between md:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="shrink-0 rounded-full border border-black/8 bg-[#fbf8f2] px-3 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    MIA PARIS
                  </p>
                </div>
                <div className="relative min-w-0 max-w-3xl flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Rechercher dans le CRM"
                    className="h-10 rounded-[0.95rem] border-black/8 bg-white pl-11 shadow-none"
                    placeholder="Rechercher une demande, un client ou un email"
                  />
                </div>
              </div>

              <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-[0.95rem] border border-black/8 bg-[#f7f3eb] px-2.5 py-2">
                <PwaInstallButton compact />
                <div className="flex h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-2xl bg-primary text-[11px] font-semibold text-primary-foreground">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {displayEmail ?? "Session active"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="hidden shrink-0 border-black/8 bg-white text-[10px] uppercase tracking-[0.16em] text-foreground/70 2xl:inline-flex"
                >
                  {appRoleLabels[currentRole]}
                </Badge>
                <div className="shrink-0">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
