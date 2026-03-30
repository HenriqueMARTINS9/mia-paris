import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { emailRequestTypeMeta } from "@/features/emails/metadata";
import { CreateRequestFromEmailButton } from "@/features/emails/components/create-request-from-email-button";
import { OpenCreatedRequestLink } from "@/features/emails/components/open-created-request-link";

interface QualificationActionsBarProps {
  canCreate: boolean;
  currentPriority: string;
  currentRequestType: string | null;
  isPending: boolean;
  linkedRequestId: string | null;
  onCreateRequest: () => void;
}

export function QualificationActionsBar({
  canCreate,
  currentPriority,
  currentRequestType,
  isPending,
  linkedRequestId,
  onCreateRequest,
}: Readonly<QualificationActionsBarProps>) {
  const requestTypeLabel =
    currentRequestType && currentRequestType in emailRequestTypeMeta
      ? emailRequestTypeMeta[currentRequestType as keyof typeof emailRequestTypeMeta].label
      : currentRequestType ?? "Type à confirmer";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Préremplissage métier V1</Badge>
            <Badge variant="outline">{requestTypeLabel}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold">
            Créer une demande depuis cet email
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            La demande reprend le titre, le type, la priorité, le résumé, le responsable et les champs métier validés dans le panneau.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Priorité · {currentPriority}
          </p>
        </div>

        <div className="grid w-full gap-2 md:w-auto md:flex md:flex-wrap">
          {linkedRequestId ? <OpenCreatedRequestLink requestId={linkedRequestId} /> : null}
          <CreateRequestFromEmailButton
            disabled={!canCreate}
            isPending={isPending}
            onClick={onCreateRequest}
          />
        </div>
      </CardContent>
    </Card>
  );
}
