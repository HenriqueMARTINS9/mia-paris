"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileFilterSheetProps {
  children: ReactNode;
  description: string;
  title: string;
  triggerLabel?: string;
}

export function MobileFilterSheet({
  children,
  description,
  title,
  triggerLabel = "Filtres",
}: Readonly<MobileFilterSheetProps>) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-full rounded-[1rem] border-black/8 bg-white shadow-none sm:w-auto"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
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
  );
}
