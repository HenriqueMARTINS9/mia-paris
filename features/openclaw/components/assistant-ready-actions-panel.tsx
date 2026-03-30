import Link from "next/link";
import { Bot, CheckCircle2, Compass, Wrench } from "lucide-react";

import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssistantReadyWorkspaceData } from "@/features/openclaw/types";

export function AssistantReadyActionsPanel({
  data,
}: Readonly<{
  data: AssistantReadyWorkspaceData;
}>) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Assistant opérationnel"
        title="Assistant OpenClaw"
        badge="Ready actions"
        description="Couche d’actions CRM exposable proprement à un assistant texte ou voix, sans dépendre des écrans React."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.previews.map((preview) => (
          <Card key={preview.id}>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium text-muted-foreground">{preview.label}</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {preview.count}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{preview.description}</p>
              <Button asChild variant="outline" className="w-full">
                <Link href={preview.href}>Ouvrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Catalogue d’actions exposables</CardTitle>
            </div>
            <CardDescription>
              Fonctions métiers déjà typées, réutilisables et prêtes à être appelées par OpenClaw plus tard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.actions.map((action) => (
              <div
                key={action.key}
                className="rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={action.kind === "write" ? "default" : "outline"}>
                    {action.kind === "write" ? "Mutation" : "Lecture"}
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    {action.exposure === "safe" ? "OpenClaw safe" : "Sous contrôle"}
                  </Badge>
                  {action.safeForOpenClaw ? (
                    <Badge variant="outline" className="bg-white">
                      Exposable V1
                    </Badge>
                  ) : null}
                  {action.permission ? (
                    <Badge variant="outline" className="bg-white">
                      {action.permission}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-3 font-semibold text-foreground">{action.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {action.description}
                </p>
                <div className="mt-3 rounded-2xl border border-black/[0.06] bg-white/80 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Commande
                  </p>
                  <p className="mt-2 font-mono text-sm text-foreground">{action.command}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{action.example}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-muted-foreground" />
                <CardTitle>État de préparation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--success)]" />
                <div>
                  <p className="font-medium text-foreground">Lecture CRM prête</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Urgences, emails non traités, productions bloquées, demandes sans owner et historique sont déjà requêtables proprement.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-[1.1rem] border border-black/[0.06] bg-[#fbf8f2]/85 px-4 py-4">
                <Wrench className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                <div>
                  <p className="font-medium text-foreground">Mutations encadrées</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Les actions safe sont découpées dans une vraie couche serveur typée, avec permissions métier et audit unifiés avant branchement OpenClaw.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.error ? (
            <Card className="border-[rgba(202,142,85,0.2)] bg-[rgba(202,142,85,0.08)]">
              <CardContent className="p-4 text-sm leading-6 text-foreground/80">
                Le workspace assistant reste visible, mais une partie des previews remonte une erreur de chargement : {data.error}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
