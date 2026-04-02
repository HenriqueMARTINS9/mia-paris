import "server-only";

const openClawCrmToken = process.env.OPENCLAW_CRM_TOKEN?.trim() ?? "";

export const hasOpenClawCrmToken = openClawCrmToken.length > 0;

export function getOpenClawEnv() {
  if (!hasOpenClawCrmToken) {
    throw new Error(
      "Configuration OpenClaw manquante. Renseigne OPENCLAW_CRM_TOKEN côté serveur.",
    );
  }

  return {
    openClawCrmToken,
  };
}
