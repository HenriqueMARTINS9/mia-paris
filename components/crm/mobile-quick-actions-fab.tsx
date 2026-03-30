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
      className="fixed bottom-5 right-4 z-40 h-14 w-14 rounded-full shadow-[0_18px_36px_rgba(20,79,74,0.28)] md:hidden"
      onClick={onClick}
      aria-label="Ouvrir les actions rapides"
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}
