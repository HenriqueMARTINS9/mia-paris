"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function MobileQuickActionsFab({
  onClick,
}: Readonly<{
  onClick: () => void;
}>) {
  return (
    <Button
      type="button"
      size="icon"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-40 h-[3.25rem] w-[3.25rem] rounded-full shadow-[0_18px_36px_rgba(20,79,74,0.28)] md:hidden"
      onClick={onClick}
      aria-label="Ouvrir les actions rapides"
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}
