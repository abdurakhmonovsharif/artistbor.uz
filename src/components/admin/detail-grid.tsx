"use client";

import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import { formatPhone } from "@/lib/phone-format";
import { isLocationIdKey, LocationName } from "@/components/admin/location-name";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { defaultLocale, type Locale } from "@/lib/i18n/translations";
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
  const { locale } = useI18n();
  const copy = getDetailCopy(locale);
  const entries = detailEntries(record, fields, locale);

  return (
    <div className="space-y-4">
      {entries.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map(({ key, label, value }) => (
            <div
              key={key}
              className="min-h-[86px] rounded-xl border border-artistbor-border bg-artistbor-surface p-4"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <div className="mt-4 break-words text-sm font-black leading-6 text-slate-950 dark:text-white">
                {formatDetailValue(key, value, locale)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-artistbor-border bg-artistbor-surface p-4 text-sm font-semibold text-artistbor-secondary">
          {copy.noData}
        </div>
      )}

    </div>
  );
}

export function formatDetailValue(
  key: string,
  value: unknown,
  locale: Locale = defaultLocale,
): React.ReactNode {
  const copy = getDetailCopy(locale);
  if (isLocationIdKey(key)) {
    return <LocationName fieldKey={key} value={value} fallback={toDisplay(value)} />;
  }
  if (typeof value === "boolean") return value ? copy.yes : copy.no;
  if (looksLikeDate(key, value)) return normalizeDate(value);
  if (looksLikePhone(key)) return formatPhone(value) || toDisplay(value);
  if (Array.isArray(value)) {
    const visible = value.filter((item) => !isEmptyValue(item));
    if (!visible.length) return "—";
    return visible.map((item) => compactValue(item, locale)).join(", ");
  }
  return compactValue(value, locale);
}

export function isEmptyValue(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function detailEntries(record: UnknownRecord, fields: DetailField[] | undefined, locale: Locale) {
  const used = new Set<string>();
  const ordered = fields?.flatMap((field) => {
    const value = record[field.key];
    used.add(field.key);
    return isEmptyValue(value) ? [] : [{ ...field, value }];
  }) ?? [];

  const rest = Object.entries(record)
    .filter(([key, value]) => !used.has(key) && !isEmptyValue(value) && !isInternalIdKey(key))
    .map(([key, value]) => ({ key, label: readableLabel(key, locale), value }));

  return [...ordered, ...rest];
}

function isInternalIdKey(key: string) {
  return key === "id" || key.endsWith("_id");
}

function compactValue(value: unknown, locale: Locale): string {
  if (isRecord(value)) {
    const candidate = value.name_uz ?? value.title ?? value.name ?? value.full_name ?? value.label;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (typeof value.public_id === "string" && value.public_id.trim()) return value.public_id;
    return getDetailCopy(locale).object;
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

function readableLabel(key: string, locale: Locale) {
  const labels = getDetailCopy(locale).fields;
  return labels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDetailCopy(locale: Locale) {
  if (locale === "ru") {
    return {
      noData: "Нет данных для отображения.",
      yes: "Да",
      no: "Нет",
      object: "Объект",
      fields: {
        id: "ID",
        artist_id: "ID артиста",
        client_id: "ID клиента",
        user_id: "ID пользователя",
        region_id: "Регион",
        district_id: "Район",
        title: "Заголовок",
        message: "Сообщение",
        comment: "Комментарий",
        rating: "Рейтинг",
        type: "Тип",
        status: "Статус",
        is_published: "Опубликовано",
        created_at: "Создано",
        updated_at: "Обновлено",
        deleted_at: "Удалено",
      } as Record<string, string>,
    };
  }

  return {
    noData: "Ko‘rsatiladigan ma’lumot topilmadi.",
    yes: "Ha",
    no: "Yo‘q",
    object: "Obyekt",
    fields: {
      id: "ID",
      artist_id: "San’atkor ID",
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
      is_published: "Ko‘rsatilgan",
      created_at: "Yaratilgan",
      updated_at: "Yangilangan",
      deleted_at: "O‘chirilgan",
    } as Record<string, string>,
  };
}
