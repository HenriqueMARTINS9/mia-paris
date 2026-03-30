"use client";

import { useMemo, useState, useTransition } from "react";
import { Bell, BellDot, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EnablePushNotificationsButton } from "@/features/notifications/components/enable-push-notifications-button";
import {
  removePushSubscriptionAction,
  updateNotificationPreferencesAction,
  upsertPushSubscriptionAction,
} from "@/features/notifications/actions/push-subscriptions";
import type { NotificationPreferencesState } from "@/features/notifications/types";
import { Badge } from "@/components/ui/badge";

export function PushSubscriptionManager({
  initialState,
}: Readonly<{
  initialState: NotificationPreferencesState;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(initialState);

  const isSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
    [],
  );

  function handleEnable() {
    startTransition(async () => {
      if (!isSupported) {
        toast.error("Les notifications push ne sont pas disponibles sur cet appareil.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        toast.error("Autorise les notifications navigateur pour continuer.");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        toast.error("Clé VAPID publique absente côté front.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      });
      const currentSubscription = await registration.pushManager.getSubscription();
      const subscription =
        currentSubscription ??
        (await registration.pushManager.subscribe({
          applicationServerKey: base64UrlToUint8Array(publicKey),
          userVisibleOnly: true,
        }));
      const subscriptionJson = subscription.toJSON();

      if (
        !subscription.endpoint ||
        !subscriptionJson.keys?.auth ||
        !subscriptionJson.keys?.p256dh
      ) {
        toast.error("Impossible de lire les clés de subscription push.");
        return;
      }

      const result = await upsertPushSubscriptionAction({
        endpoint: subscription.endpoint,
        keys: {
          auth: subscriptionJson.keys.auth,
          p256dh: subscriptionJson.keys.p256dh,
        },
        userAgent: navigator.userAgent,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setState((current) => ({
        ...current,
        hasSubscription: true,
        pushEnabled: true,
        subscriptionCount: Math.max(1, current.subscriptionCount),
      }));
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleDisable() {
    startTransition(async () => {
      let endpoint: string | null = null;

      if (isSupported) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        endpoint = subscription?.endpoint ?? null;
        await subscription?.unsubscribe();
      }

      const result = await removePushSubscriptionAction(endpoint);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setState((current) => ({
        ...current,
        hasSubscription: false,
        pushEnabled: false,
        subscriptionCount: 0,
      }));
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleTogglePreference(
    key: keyof Omit<NotificationPreferencesState, "error" | "hasSubscription" | "subscriptionCount">,
  ) {
    startTransition(async () => {
      const nextState = {
        ...state,
        [key]: !state[key],
      };
      const result = await updateNotificationPreferencesAction({
        deadline24h: nextState.deadline24h,
        emailNewUnprocessed: nextState.emailNewUnprocessed,
        gmailSyncFailed: nextState.gmailSyncFailed,
        productionBlocked: nextState.productionBlocked,
        pushEnabled: nextState.pushEnabled,
        taskCritical: nextState.taskCritical,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setState(nextState);
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-[#fbf8f2]">
          <Smartphone className="h-3.5 w-3.5" />
          {isSupported ? "Push disponible" : "Push non disponible"}
        </Badge>
        {state.hasSubscription ? (
          <Badge
            variant="outline"
            className="border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.08)] text-[var(--success)]"
          >
            <BellDot className="h-3.5 w-3.5" />
            {state.subscriptionCount} appareil
            {state.subscriptionCount > 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-white">
            <Bell className="h-3.5 w-3.5" />
            Aucun appareil abonné
          </Badge>
        )}
      </div>

      <EnablePushNotificationsButton
        disabled={!isSupported}
        enabled={state.pushEnabled && state.hasSubscription}
        isPending={isPending}
        onDisable={handleDisable}
        onEnable={handleEnable}
      />

      <div className="grid gap-3">
        <PreferenceToggle
          checked={state.emailNewUnprocessed}
          description="Alerter quand de nouveaux emails Gmail arrivent dans la boîte partagée."
          disabled={!state.hasSubscription || isPending}
          label="Nouveaux emails non traités"
          onClick={() => handleTogglePreference("emailNewUnprocessed")}
        />
        <PreferenceToggle
          checked={state.deadline24h}
          description="Alerter quand une deadline ouverte tombe à moins de 24h."
          disabled={!state.hasSubscription || isPending}
          label="Deadlines < 24h"
          onClick={() => handleTogglePreference("deadline24h")}
        />
        <PreferenceToggle
          checked={state.taskCritical}
          description="Alerter pour les tâches critiques ou nouvellement passées en critique."
          disabled={!state.hasSubscription || isPending}
          label="Tâches critiques"
          onClick={() => handleTogglePreference("taskCritical")}
        />
        <PreferenceToggle
          checked={state.productionBlocked}
          description="Alerter lorsqu’une production est bloquée ou passe en risque critique."
          disabled={!state.hasSubscription || isPending}
          label="Productions bloquées"
          onClick={() => handleTogglePreference("productionBlocked")}
        />
        <PreferenceToggle
          checked={state.gmailSyncFailed}
          description="Alerter immédiatement en cas d’échec de la sync Gmail."
          disabled={!state.hasSubscription || isPending}
          label="Échec sync Gmail"
          onClick={() => handleTogglePreference("gmailSyncFailed")}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-muted-foreground">{state.error}</p>
      ) : null}
    </div>
  );
}

function PreferenceToggle({
  checked,
  description,
  disabled,
  label,
  onClick,
}: Readonly<{
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start justify-between gap-4 rounded-[1.15rem] border border-black/[0.06] bg-[#fbf8f2]/88 px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <span
        className={`mt-1 inline-flex h-6 min-w-11 items-center rounded-full px-1 ${
          checked ? "bg-primary" : "bg-black/10"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const normalized = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);

  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}
