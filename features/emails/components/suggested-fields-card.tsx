import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailQualificationFields } from "@/features/emails/types";

export function SuggestedFieldsCard({
  fields,
}: Readonly<{ fields: EmailQualificationFields }>) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Champs suggérés</Badge>
        </div>
        <CardTitle className="text-base">
          Validation / correction de l’analyse IA
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <FieldItem label="Client détecté" value={fields.clientName} />
        <FieldItem label="Contact détecté" value={fields.contactName} />
        <FieldItem
          label="Département produit"
          value={fields.productDepartmentName}
        />
        <FieldItem label="Modèle détecté" value={fields.modelName} />
        <FieldItem label="Type détecté" value={fields.requestType} />
        <FieldItem label="Priorité" value={fields.priority} />
        <FieldItem label="Deadline" value={fields.dueAt} />
        <FieldItem label="Action attendue" value={fields.requestedAction} />
        <FieldItem
          label="Confiance IA"
          value={
            fields.aiConfidence !== null
              ? `${Math.round(fields.aiConfidence * 100)}%`
              : null
          }
        />
        <FieldItem
          label="Résumé"
          value={fields.summary}
          className="sm:col-span-2"
        />
      </CardContent>
    </Card>
  );
}

function FieldItem({
  className,
  label,
  value,
}: Readonly<{ className?: string; label: string; value: string | null }>) {
  return (
    <div className={className}>
      <div className="rounded-2xl border border-white/70 bg-white/65 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-3 text-sm leading-6 text-foreground/80">
          {value ?? "À compléter"}
        </p>
      </div>
    </div>
  );
}
