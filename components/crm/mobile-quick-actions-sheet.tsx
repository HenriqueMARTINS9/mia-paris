"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { MobileQuickActionsFab } from "@/components/crm/mobile-quick-actions-fab";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileQuickActionsSheetProps {
  children: ReactNode;
  description: string;
  title?: string;
}

export function MobileQuickActionsSheet({
  children,
  description,
  title = "Actions rapides",
}: Readonly<MobileQuickActionsSheetProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <MobileQuickActionsFab onClick={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full max-w-none border-l-0 p-0 sm:max-w-lg sm:border-l sm:p-6">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-black/[0.06] px-4 py-4 sm:px-0 sm:py-0">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-0 sm:py-6">
              {children}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
