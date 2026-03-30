"use client";

import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EnablePushNotificationsButton({
  disabled = false,
  enabled,
  isPending = false,
  onDisable,
  onEnable,
}: Readonly<{
  disabled?: boolean;
  enabled: boolean;
  isPending?: boolean;
  onDisable: () => void;
  onEnable: () => void;
}>) {
  return enabled ? (
    <Button
      type="button"
      variant="outline"
      onClick={onDisable}
      disabled={disabled || isPending}
    >
      <BellOff className="h-4 w-4" />
      Désactiver sur cet appareil
    </Button>
  ) : (
    <Button type="button" onClick={onEnable} disabled={disabled || isPending}>
      <Bell className="h-4 w-4" />
      Activer les notifications
    </Button>
  );
}
