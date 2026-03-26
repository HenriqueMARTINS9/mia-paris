import { Layers3, Rocket, Sparkles } from "lucide-react";

import { MetricCard } from "@/components/crm/metric-card";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  focus: string[];
}

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  focus,
}: Readonly<PlaceholderPageProps>) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        badge="À venir"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Priorité produit"
          value="Shell prêt"
          hint="Le layout global et le design system sont en place."
          icon={Layers3}
        />
        <MetricCard
          label="Suivant"
          value="Écran métier"
          hint="La prochaine itération branche la logique spécifique à ce module."
          icon={Rocket}
          accent="accent"
        />
        <MetricCard
          label="IA / data"
          value="Ready"
          hint="Les briques Supabase et les composants réutilisables sont prêtes."
          icon={Sparkles}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadre prévu pour cet écran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {focus.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3"
            >
              <Badge variant="outline">Scope</Badge>
              <p className="text-sm leading-6 text-muted-foreground">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
