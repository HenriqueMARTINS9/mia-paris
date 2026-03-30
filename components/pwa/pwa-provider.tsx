"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface PwaContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  promptInstall: () => Promise<boolean>;
  serviceWorkerReady: boolean;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [isOffline, setIsOffline] = useState(() =>
    typeof window === "undefined" ? false : !window.navigator.onLine,
  );
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in window.navigator) {
      window.navigator.serviceWorker
        .register("/service-worker.js", {
          scope: "/",
        })
        .then(() => {
          setServiceWorkerReady(true);
        })
        .catch(() => {
          setServiceWorkerReady(false);
        });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) {
      return false;
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setIsInstalled(true);
      return true;
    }

    return false;
  }, [installPrompt]);

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: Boolean(installPrompt) && !isInstalled,
      isInstalled,
      isOffline,
      promptInstall,
      serviceWorkerReady,
    }),
    [installPrompt, isInstalled, isOffline, promptInstall, serviceWorkerReady],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    return {
      canInstall: false,
      isInstalled: false,
      isOffline: false,
      promptInstall: async () => false,
      serviceWorkerReady: false,
    };
  }

  return context;
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}
