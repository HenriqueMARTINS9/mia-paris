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
        <SheetContent className="inset-x-0 bottom-0 top-auto h-[min(86vh,760px)] w-full max-w-none rounded-t-[1.6rem] border-b-0 border-l-0 border-r-0 p-0 sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-lg sm:rounded-none sm:border-b sm:border-l sm:border-r-0 sm:border-t-0 sm:p-6">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-black/[0.06] px-4 py-4 sm:px-0 sm:py-0">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:px-0 sm:py-6">
              {children}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
