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
import { CreateRequestTaskForm } from "@/features/tasks/components/create-request-task-form";
import type { RequestAssigneeOption, RequestLinkOption } from "@/features/requests/types";

export function CreateTaskDialog(props: Readonly<{
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  defaultAssignedUserId?: string | null;
  defaultDueAt?: string | null;
  defaultRequestId?: string | null;
  requestId?: string | null;
  requestOptions?: RequestLinkOption[];
  requestOptionsError?: string | null;
  triggerLabel?: string;
}>) {
  const { can } = useAuthorization();
  const [open, setOpen] = useState(false);

  if (!can("tasks.create")) {
    return null;
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <PlusSquare className="h-4 w-4" />
        {props.triggerLabel ?? "Nouvelle tâche"}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Créer une tâche</SheetTitle>
            <SheetDescription>
              Ajoute une action manuelle liée à une demande ou à un besoin transversal.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CreateRequestTaskForm {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
