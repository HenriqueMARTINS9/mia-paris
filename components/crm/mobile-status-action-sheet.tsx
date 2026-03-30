"use client";

import type { MouseEvent, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileStatusActionSheetProps {
  children: ReactNode;
  description: string;
  title: string;
  triggerLabel?: string;
}

export function MobileStatusActionSheet({
  children,
  description,
  title,
  triggerLabel = "Actions",
}: Readonly<MobileStatusActionSheetProps>) {
  function stopPropagation(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={stopPropagation}
        >
          <MoreHorizontal className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
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
  );
}
