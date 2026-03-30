import Link from "next/link";
import { CloudOff, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Mode hors ligne",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader className="border-b border-black/[0.06] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbf8f2] text-primary">
              <CloudOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Offline shell
              </p>
              <CardTitle>MIA PARIS reste accessible hors ligne</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            L’interface principale reste installable et navigable, mais les
            données live Supabase et Gmail ne sont pas accessibles sans réseau.
            Reviens en ligne pour synchroniser les emails, les deadlines et les
            mises à jour métier.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/aujourdhui">Ouvrir Aujourd’hui</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/emails">Ouvrir les emails</Link>
            </Button>
          </div>

          <Button asChild variant="secondary" className="w-full">
            <Link href="/aujourdhui">
              <RefreshCcw className="h-4 w-4" />
              Réessayer maintenant
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
