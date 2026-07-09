"use client";

import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import { formatPhone } from "@/lib/phone-format";
import { isLocationIdKey, LocationName } from "@/components/admin/location-name";
import type { UnknownRecord } from "@/types/api";

export type DetailField = {
  key: string;
  label: string;
};

export function DetailGrid({
  record,
  fields,
}: {
  record: UnknownRecord;
  fields?: DetailField[];
}) {
  const entries = detailEntries(record, fields);

  return (
    <div className="space-y-4">
      {entries.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map(({ key, label, value }) => (
            <div
              key={key}
              className="min-h-[86px] rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#334057] dark:bg-[#172033]"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <div className="mt-4 break-words text-sm font-black leading-6 text-slate-950 dark:text-white">
                {formatDetailValue(key, value)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 dark:border-[#334057] dark:bg-[#172033]">
          Ko&apos;rsatiladigan ma&apos;lumot topilmadi.
        </div>
      )}

    </div>
  );
}

export function formatDetailValue(key: string, value: unknown): React.ReactNode {
  if (isLocationIdKey(key)) {
    return <LocationName fieldKey={key} value={value} fallback={toDisplay(value)} />;
  }
  if (typeof value === "boolean") return value ? "Ha" : "Yo'q";
  if (looksLikeDate(key, value)) return normalizeDate(value);
  if (looksLikePhone(key)) return formatPhone(value) || toDisplay(value);
  if (Array.isArray(value)) {
    const visible = value.filter((item) => !isEmptyValue(item));
    if (!visible.length) return "—";
    return visible.map((item) => compactValue(item)).join(", ");
  }
  return compactValue(value);
}

export function isEmptyValue(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function detailEntries(record: UnknownRecord, fields?: DetailField[]) {
  const used = new Set<string>();
  const ordered = fields?.flatMap((field) => {
    const value = record[field.key];
    used.add(field.key);
    return isEmptyValue(value) ? [] : [{ ...field, value }];
  }) ?? [];

  const rest = Object.entries(record)
    .filter(([key, value]) => !used.has(key) && !isEmptyValue(value))
    .map(([key, value]) => ({ key, label: readableLabel(key), value }));

  return [...ordered, ...rest];
}

function compactValue(value: unknown): string {
  if (isRecord(value)) {
    const candidate = value.name_uz ?? value.title ?? value.name ?? value.full_name ?? value.label;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (typeof value.id === "number" || typeof value.id === "string") return `#${value.id}`;
    return "Obyekt";
  }
  return toDisplay(value);
}

function looksLikePhone(key: string) {
  const normalizedKey = key.toLowerCase();
  return normalizedKey === "phone" || normalizedKey.endsWith("_phone") || normalizedKey.includes("phone_number");
}

function looksLikeDate(key: string, value: unknown) {
  const normalizedKey = key.toLowerCase();
  const keyLooksDate =
    normalizedKey.includes("date") ||
    normalizedKey.endsWith("_at") ||
    normalizedKey.includes("created") ||
    normalizedKey.includes("updated") ||
    normalizedKey.includes("deleted");

  if (!keyLooksDate) return false;
  if (typeof value === "number") return value > 1_000_000_000;
  if (typeof value === "string") return !Number.isNaN(Date.parse(value));
  return false;
}

function readableLabel(key: string) {
  const labels: Record<string, string> = {
    id: "ID",
    artist_id: "Sanatkor ID",
    client_id: "Mijoz ID",
    user_id: "Foydalanuvchi ID",
    region_id: "Viloyat",
    district_id: "Tuman",
    title: "Sarlavha",
    message: "Xabar",
    comment: "Izoh",
    rating: "Reyting",
    type: "Turi",
    status: "Holat",
    is_published: "Ko'rsatilgan",
    created_at: "Yaratilgan",
    updated_at: "Yangilangan",
    deleted_at: "O'chirilgan",
  };

  return labels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
