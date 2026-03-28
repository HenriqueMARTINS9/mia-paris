import { FolderPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CreateRequestFromEmailButtonProps {
  disabled?: boolean;
  isPending?: boolean;
  onClick: () => void;
}

export function CreateRequestFromEmailButton({
  disabled = false,
  isPending = false,
  onClick,
}: Readonly<CreateRequestFromEmailButtonProps>) {
  return (
    <Button onClick={onClick} disabled={disabled || isPending}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Création
        </>
      ) : (
        <>
          <FolderPlus className="h-4 w-4" />
          Créer la demande
        </>
      )}
    </Button>
  );
}
