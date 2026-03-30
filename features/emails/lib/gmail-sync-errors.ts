export interface GmailSyncErrorState {
  description: string;
  reconnectRecommended: boolean;
  title: string;
}

export function resolveGmailSyncFailureMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid_grant") ||
    normalized.includes("token has been expired") ||
    normalized.includes("token expired") ||
    normalized.includes("refresh token") ||
    normalized.includes("reauth") ||
    normalized.includes("unauthorized_client")
  ) {
    return "Le token Gmail partagé semble expiré. Reconnecte la boîte Gmail partagée puis relance la synchronisation.";
  }

  if (normalized.includes("permission") || normalized.includes("insufficient")) {
    return "La sync Gmail n’a pas les permissions nécessaires. Vérifie le scope Google configuré puis reconnecte la boîte partagée.";
  }

  return message;
}

export function getGmailSyncErrorState(
  message: string | null | undefined,
): GmailSyncErrorState | null {
  if (!message) {
    return null;
  }

  const resolved = resolveGmailSyncFailureMessage(message);
  const normalized = resolved.toLowerCase();
  const reconnectRecommended =
    normalized.includes("reconnecte") || normalized.includes("token gmail partagé");

  return {
    description: resolved,
    reconnectRecommended,
    title: reconnectRecommended
      ? "Reconnecte la boîte Gmail partagée"
      : "Erreur de synchronisation Gmail",
  };
}
