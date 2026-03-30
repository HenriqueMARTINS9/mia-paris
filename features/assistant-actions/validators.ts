import type {
  AssistantActionCode,
  AssistantActionResult,
} from "@/features/assistant-actions/types";

export function createAssistantActionSuccess<TData>(
  data: TData,
  message: string,
): AssistantActionResult<TData> {
  return {
    code: "ok",
    data,
    message,
    ok: true,
  };
}

export function createAssistantActionFailure<TData>(
  code: Exclude<AssistantActionCode, "ok">,
  message: string,
): AssistantActionResult<TData> {
  return {
    code,
    data: null,
    message,
    ok: false,
  };
}

export function validateRequiredText(
  value: string | null | undefined,
  fieldLabel: string,
  minimumLength = 1,
) {
  const normalized = value?.trim() ?? "";

  if (normalized.length < minimumLength) {
    return {
      ok: false as const,
      message:
        minimumLength > 1
          ? `${fieldLabel} doit contenir au moins ${minimumLength} caractères.`
          : `${fieldLabel} est requis.`,
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}

export function validateLookupTerm(term: string, fieldLabel: string) {
  const result = validateRequiredText(term, fieldLabel, 2);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    value: result.value.toLowerCase(),
  };
}

export function normalizeAssistantSource(
  source: "assistant" | "system" | "ui" | null | undefined,
) {
  if (source === "assistant" || source === "system" || source === "ui") {
    return source;
  }

  return "assistant";
}
