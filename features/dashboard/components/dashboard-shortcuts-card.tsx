import Link from "next/link";
import { ArrowUpRight, Factory, FolderKanban, Inbox, Sun } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const shortcuts = [
  {
    description: "Ouvrir l’inbox importante pour vérifier ce que Claw a laissé visible.",
    href: "/emails?bucket=important",
    icon: Inbox,
    label: "Vérifier les emails",
  },
  {
    description: "Reprendre les dossiers sans responsable ou sans arbitrage clair.",
    href: "/demandes",
    icon: FolderKanban,
    label: "Voir les demandes",
  },
  {
    description: "Contrôler les blocages atelier et les productions sous tension.",
    href: "/productions",
    icon: Factory,
    label: "Surveiller la production",
  },
  {
    description: "Basculer vers le cockpit du jour pour gérer le reste des urgences.",
    href: "/aujourdhui",
    icon: Sun,
    label: "Ouvrir Aujourd’hui",
  },
] as const;

export function DashboardShortcutsCard() {
  return (
    <Card>
      <CardHeader className="border-b border-black/[0.06] pb-4">
        <CardTitle>Raccourcis utiles</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;

          return (
            <Link
              key={shortcut.label}
              href={shortcut.href}
              className="rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4 transition hover:border-primary/15 hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{shortcut.label}</p>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {shortcut.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        <p className="text-xs leading-5 text-muted-foreground">
          Tout ce qui est plus technique ou moins quotidien reste accessible dans
          la rubrique <span className="font-medium text-foreground">Compléments</span>.
        </p>
      </CardContent>
    </Card>
  );
}
