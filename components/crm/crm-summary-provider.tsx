"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { fallbackCrmSummary } from "@/lib/data/crm-summary";
import type { CrmSummary } from "@/types/crm";

interface CrmSummaryContextValue {
  summary: CrmSummary;
  isLoading: boolean;
}

const CrmSummaryContext = createContext<CrmSummaryContextValue>({
  summary: fallbackCrmSummary,
  isLoading: true,
});

interface CrmSummaryProviderProps {
  children: React.ReactNode;
  initialSummary?: CrmSummary;
}

export function CrmSummaryProvider({
  children,
  initialSummary = fallbackCrmSummary,
}: Readonly<CrmSummaryProviderProps>) {
  const pathname = usePathname();
  const [summary, setSummary] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const response = await fetch("/api/crm/summary", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load CRM summary (${response.status})`);
        }

        const payload = (await response.json()) as { summary?: CrmSummary };

        if (payload.summary) {
          setSummary(payload.summary);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => controller.abort();
  }, [pathname]);

  return (
    <CrmSummaryContext.Provider value={{ summary, isLoading }}>
      {children}
    </CrmSummaryContext.Provider>
  );
}

export function useCrmSummary() {
  return useContext(CrmSummaryContext);
}
