"use client";

import { PlusSquare } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { CreateDeadlineForm } from "@/features/deadlines/components/create-deadline-form";
import type { RequestLinkOption } from "@/features/requests/types";

export function CreateDeadlineDialog(props: Readonly<{
  defaultDeadlineAt?: string | null;
  defaultRequestId?: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
  triggerLabel?: string;
}>) {
  const { can } = useAuthorization();
  const [open, setOpen] = useState(false);

  if (!can("deadlines.create")) {
    return null;
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <PlusSquare className="h-4 w-4" />
        {props.triggerLabel ?? "Nouvelle deadline"}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Créer une deadline</SheetTitle>
            <SheetDescription>
              Ajoute une échéance manuelle pour piloter un engagement métier ou client.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CreateDeadlineForm {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
