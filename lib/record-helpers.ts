export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readValue(
  record: UnknownRecord | null | undefined,
  keys: string[],
) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
}

export function readString(
  record: UnknownRecord | null | undefined,
  keys: string[],
) {
  const value = readValue(record, keys);

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

export function readNumber(
  record: UnknownRecord | null | undefined,
  keys: string[],
) {
  const value = readValue(record, keys);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function readBoolean(
  record: UnknownRecord | null | undefined,
  keys: string[],
) {
  const value = readValue(record, keys);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }

    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }

  return null;
}

export function readObject(
  record: UnknownRecord | null | undefined,
  keys: string[],
) {
  const value = readValue(record, keys);

  return isRecord(value) ? value : null;
}

export function readArray(
  record: UnknownRecord | null | undefined,
  keys: string[],
) {
  const value = readValue(record, keys);

  return Array.isArray(value) ? value : null;
}

export function parseJsonObject(value: unknown) {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function titleCaseFromSnake(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function compactIdentifier(value: string | null | undefined, size = 8) {
  if (!value) {
    return null;
  }

  return value.slice(0, size).toUpperCase();
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
