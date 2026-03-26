"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "border border-white/70 bg-[#fffdf8] text-foreground shadow-[0_18px_45px_rgba(20,31,41,0.12)]",
          title: "font-semibold",
          description: "text-sm text-muted-foreground",
        },
      }}
    />
  );
}
