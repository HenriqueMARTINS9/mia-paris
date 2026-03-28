import { ExternalLink, FileText, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailAttachmentToDocumentDialog } from "@/features/documents/components/email-attachment-to-document-dialog";
import type { DocumentFormOptions } from "@/features/documents/types";
import type { EmailAttachmentListItem } from "@/features/emails/types";

export function EmailAttachmentsCard({
  attachments,
  defaultModelId = null,
  defaultRequestId = null,
  documentOptions,
  documentOptionsError = null,
}: Readonly<{
  attachments: EmailAttachmentListItem[];
  defaultModelId?: string | null;
  defaultRequestId?: string | null;
  documentOptions: DocumentFormOptions;
  documentOptionsError?: string | null;
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Pièces jointes</Badge>
          <Paperclip className="h-4 w-4 text-primary" />
        </div>
        <CardTitle className="text-base">
          {attachments.length} pièce{attachments.length > 1 ? "s" : ""} jointe
          {attachments.length > 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {attachments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucune pièce jointe détectée sur cet email.
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="rounded-2xl border border-white/70 bg-white/65 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="truncate text-sm font-semibold">
                      {attachment.fileName}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachment.mimeType ? (
                      <Badge variant="outline">{attachment.mimeType}</Badge>
                    ) : null}
                    {attachment.sizeBytes !== null ? (
                      <Badge variant="outline">
                        {formatFileSize(attachment.sizeBytes)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {attachment.storagePath ? (
                    isExternalAttachmentUrl(attachment.storagePath) ? (
                      <a
                        href={attachment.storagePath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:text-primary/80"
                      >
                        Ouvrir
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="max-w-full truncate text-xs text-muted-foreground">
                        {attachment.storagePath}
                      </span>
                    )
                  ) : null}
                  <EmailAttachmentToDocumentDialog
                    attachment={attachment}
                    defaultModelId={defaultModelId}
                    defaultRequestId={defaultRequestId}
                    options={documentOptions}
                    optionsError={documentOptionsError}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function formatFileSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const kbValue = value / 1024;

  if (kbValue < 1024) {
    return `${kbValue.toFixed(kbValue >= 100 ? 0 : 1)} KB`;
  }

  const mbValue = kbValue / 1024;
  return `${mbValue.toFixed(mbValue >= 100 ? 0 : 1)} MB`;
}

function isExternalAttachmentUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
