import { Link2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface LinkToExistingRequestActionProps {
  disabled?: boolean;
  isPending?: boolean;
  onClick: () => void;
}

export function LinkToExistingRequestAction({
  disabled = false,
  isPending = false,
  onClick,
}: Readonly<LinkToExistingRequestActionProps>) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled || isPending}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Liaison
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" />
          Rattacher
        </>
      )}
    </Button>
  );
}
