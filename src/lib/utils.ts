import { clsx, type ClassValue } from "clsx";
import type { UnknownRecord } from "@/types/api";

export function cn(...values: ClassValue[]) {
  return clsx(values);
}

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getValue(record: UnknownRecord, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, record);
}

export function toDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ha" : "Yo'q";
  if (Array.isArray(value)) return value.length ? `${value.length} ta` : "—";
  if (isRecord(value)) {
    if (typeof value.name_uz === "string") return value.name_uz;
    if (typeof value.title === "string") return value.title;
    if (typeof value.id === "number") return `#${value.id}`;
    return JSON.stringify(value);
  }
  return String(value);
}

export function normalizeDate(value: unknown): string {
  if (typeof value === "number") {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
    }).format(new Date(milliseconds));
  }
  return toDisplay(value);
}

export function extractId(row: UnknownRecord): number | string | undefined {
  const id = row.id ?? row.user_id ?? row.artist_id ?? row.notification_id;
  if (typeof id === "number" || typeof id === "string") return id;
  return undefined;
}
