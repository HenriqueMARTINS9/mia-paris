import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";

import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUserContext, normalizeRedirectPath } from "@/features/auth/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LoginPageProps {
  searchParams?: Promise<{
    next?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Connexion",
};

export default async function LoginPage({
  searchParams,
}: Readonly<LoginPageProps>) {
  const currentUser = await getCurrentUserContext();
  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectTo = normalizeRedirectPath(resolvedSearchParams.next);

  if (currentUser) {
    redirect(redirectTo);
  }

  return (
    <main className="min-h-screen bg-[#f7f3eb] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <section className="relative hidden overflow-hidden border-r border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(20,79,74,0.18),transparent_42%),linear-gradient(180deg,#f7f3eb_0%,#efe6d7_100%)] px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.5),transparent_45%,rgba(20,79,74,0.06))]" />
          <div className="relative z-10 max-w-xl">
            <Badge className="border-primary/10 bg-primary/[0.08] text-primary">
              MIA PARIS CRM
            </Badge>
            <h1 className="mt-6 max-w-lg text-4xl font-semibold tracking-tight text-balance">
              Le cockpit métier textile B2B pour absorber les emails entrants et piloter chaque demande jusqu&apos;à la production.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Le login Supabase active maintenant la vraie session SSR pour les
              routes privées, la lecture métier et les futures policies RLS sur
              `requests`.
            </p>
          </div>

          <div className="relative z-10 grid gap-4">
            <div className="rounded-[1.75rem] border border-white/70 bg-white/65 p-5 shadow-[0_24px_60px_rgba(20,33,43,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Demandes, tâches, deadlines</p>
                  <p className="text-sm text-muted-foreground">
                    Les vues Supabase restent servies côté serveur avec session persistante.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <FeatureCard
                icon={ShieldCheck}
                title="RLS prêt"
                description="Les server actions peuvent maintenant s’exécuter avec l’utilisateur authentifié."
              />
              <FeatureCard
                icon={Sparkles}
                title="Base future IA"
                description="Le layout privé expose le contexte utilisateur pour la suite des workflows métier."
              />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Badge className="border-primary/10 bg-primary/[0.08] text-primary">
                MIA PARIS CRM
              </Badge>
            </div>

            <Card className="border-white/70 bg-white/72 shadow-[0_30px_80px_rgba(20,33,43,0.08)]">
              <CardHeader className="space-y-3">
                <Badge variant="outline" className="w-fit border-white/80 bg-white/80">
                  Connexion sécurisée Supabase
                </Badge>
                <CardTitle className="text-2xl">Se connecter</CardTitle>
                <CardDescription>
                  Utilise ton compte Supabase pour accéder aux écrans privés MIA
                  PARIS et débloquer les mutations protégées par RLS.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <LoginForm redirectTo={redirectTo} />

                <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Après connexion
                  </div>
                  <p className="mt-2 leading-6">
                    La session reste active au refresh, les routes privées sont
                    protégées et les server actions pourront s’appuyer sur
                    `auth.uid()`.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

interface FeatureCardProps {
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}

function FeatureCard({ description, icon: Icon, title }: Readonly<FeatureCardProps>) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/65 p-5 shadow-[0_20px_50px_rgba(20,33,43,0.06)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
