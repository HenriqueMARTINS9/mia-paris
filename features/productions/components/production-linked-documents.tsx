import { ExternalLink, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProductionLinkedDocumentItem } from "@/features/productions/types";
import { formatDateTime } from "@/lib/utils";

export function ProductionLinkedDocuments({
  documents,
}: Readonly<{ documents: ProductionLinkedDocumentItem[] }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Documents liés</CardTitle>
        </div>
        <CardDescription>
          Documents métier disponibles pour la commande, le modèle, la demande ou la production.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.length > 0 ? (
          documents.map((document) => (
            <div
              key={document.id}
              className="rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{document.name}</p>
                    <Badge variant="secondary" className="normal-case tracking-normal">
                      {document.type}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {document.updatedAt
                      ? `Mis à jour ${formatDateTime(document.updatedAt)}`
                      : "Aucune date disponible"}
                  </p>
                </div>

                {document.url && /^https?:\/\//i.test(document.url) ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={document.url} target="_blank" rel="noreferrer">
                      Ouvrir
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucun document métier n&apos;est relié à cette production pour l&apos;instant.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
