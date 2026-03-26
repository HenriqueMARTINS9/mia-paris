import { Bell, Search, Sparkles, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { CurrentUserContext } from "@/features/auth/types";
import type { CrmSummary } from "@/types/crm";

interface AppTopbarProps {
  currentUser: CurrentUserContext;
  summary: CrmSummary;
}

export function AppTopbar({
  currentUser,
  summary,
}: Readonly<AppTopbarProps>) {
  const displayName =
    currentUser.appUser?.full_name ??
    currentUser.authUser.user_metadata.full_name ??
    currentUser.authUser.email ??
    "Utilisateur";
  const displayEmail =
    currentUser.appUser?.email ?? currentUser.authUser.email ?? null;

  const summaryItems = [
    {
      label: "emails entrants",
      value: summary.inboundEmails,
    },
    {
      label: "validations à revoir",
      value: summary.pendingValidations,
    },
    {
      label: "productions actives",
      value: summary.activeProductions,
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-[#f7f3eb]/90 shadow-[0_10px_40px_rgba(20,31,41,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 max-w-2xl flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Rechercher dans le CRM"
                className="h-10 rounded-2xl border-white/70 bg-white/75 pl-10"
                placeholder="Rechercher une demande, un client, un email ou une production"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/70 bg-white/65 text-foreground/80"
              >
                PE26 / AH26
              </Badge>
              <Badge className="border-primary/10 bg-primary/[0.08] text-primary">
                Sync Supabase
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Notifications"
              className="shrink-0 rounded-2xl border-white/70 bg-white/65"
            >
              <Bell className="h-4 w-4" />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="hidden rounded-2xl md:inline-flex"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden xl:inline">Import brief</span>
              <span className="xl:hidden">Import</span>
            </Button>

            <Button size="sm" className="rounded-2xl">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Qualifier avec IA</span>
              <span className="sm:hidden">IA</span>
            </Button>

            <LogoutButton />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-2 text-xs font-semibold text-muted-foreground"
              >
                <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-primary">
                  {item.value}
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-white/70 bg-white/70 px-3 py-2.5 shadow-[0_10px_30px_rgba(24,33,43,0.04)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-sm font-semibold text-primary">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {displayEmail ?? "Session Supabase active"}
              </p>
            </div>
            <Badge variant="outline" className="border-white/80 bg-white/80">
              Connecté
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
