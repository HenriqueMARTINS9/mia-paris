import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OpenCreatedRequestLink({
  requestId,
}: Readonly<{ requestId: string }>) {
  return (
    <Button asChild variant="outline" className="w-full sm:w-auto">
      <Link href={`/requests/${requestId}`}>
        Ouvrir la demande
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}
