import { type ClassValue, clsx } from "clsx";
import { format, formatDistanceToNowStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "Not scheduled";
  }

  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) {
    return "Not scheduled";
  }

  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function relativeTime(date: Date | string | null | undefined) {
  if (!date) {
    return "No recent activity";
  }

  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

export function currencyBandLabel(value?: string | null) {
  return value ?? "Not estimated";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
