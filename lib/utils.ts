import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  input: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
  },
) {
  return new Intl.DateTimeFormat("fr-FR", options).format(new Date(input));
}

export function formatDateTime(input: string) {
  return formatDate(input, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function getDaysUntil(input: string) {
  const target = new Date(input);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function getDeadlineLabel(input: string) {
  const days = getDaysUntil(input);

  if (days < 0) {
    return `${Math.abs(days)} j de retard`;
  }

  if (days === 0) {
    return "Aujourd'hui";
  }

  if (days === 1) {
    return "Demain";
  }

  return `J-${days}`;
}
