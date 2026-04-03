export const manualTaskTypeOptions = [
  { label: "Suivi dossier", value: "follow_up" },
  { label: "Chiffrage", value: "costing" },
  { label: "Validation", value: "validation" },
  { label: "Production", value: "production" },
] as const;

export const assistantTaskTypeOptions = [
  ...manualTaskTypeOptions,
  { label: "Contrôle prix", value: "price_check" },
  { label: "Contrôle délai", value: "deadline_check" },
  { label: "Envoi TDS", value: "tds_send" },
  { label: "Préparer la tirelle", value: "swatch_prepare" },
  { label: "Suivi validation", value: "validation_followup" },
  { label: "Revue interne", value: "internal_review" },
  { label: "Contrôle logistique", value: "logistics_check" },
] as const;

export type AssistantTaskType = (typeof assistantTaskTypeOptions)[number]["value"];

export const assistantTaskTypeValues = assistantTaskTypeOptions.map(
  (option) => option.value,
) as AssistantTaskType[];

const assistantTaskTypeSet = new Set<string>(assistantTaskTypeValues);

export function isAssistantTaskType(value: string): value is AssistantTaskType {
  return assistantTaskTypeSet.has(value);
}
