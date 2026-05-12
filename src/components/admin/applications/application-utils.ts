import type { ArtistApplication, Category, Service, UnknownRecord } from "@/types/api";
import type { Locale } from "@/lib/i18n/translations";
import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";

export type ApplicationStatusKey = "all" | "pending" | "approved" | "rejected" | "unknown";
export type CategoryMap = Map<number, Category>;

export const APPLICATION_STATUS_FILTERS = {
  all: "",
  pending: 10,
  approved: 20,
  rejected: 30,
} as const;

export function applicationStatusKey(application: ArtistApplication): ApplicationStatusKey {
  const numericStatus = numberValue(application.status);
  if (numericStatus === 10) return "pending";
  if (numericStatus === 20) return "approved";
  if (numericStatus === 30) return "rejected";

  const text = [application.status, application.status_label]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!text) return "pending";
  if (hasAny(text, ["reject", "rad", "bekor", "cancel", "decline", "denied"])) return "rejected";
  if (hasAny(text, ["approve", "accepted", "tasdiq", "qabul"])) return "approved";
  if (hasAny(text, ["pending", "review", "new", "kutil"])) return "pending";
  return "unknown";
}

export function applicationStatusLabel(status: ApplicationStatusKey, locale: Locale = "uz") {
  if (locale === "ru") {
    if (status === "pending") return "Ожидает";
    if (status === "approved") return "Подтверждена";
    if (status === "rejected") return "Отклонена";
    if (status === "all") return "Все";
    return "—";
  }

  if (status === "pending") return "Kutilmoqda";
  if (status === "approved") return "Tasdiqlangan";
  if (status === "rejected") return "Bekor qilingan";
  if (status === "all") return "Barchasi";
  return "—";
}

export function canApproveApplication(application: ArtistApplication) {
  const status = applicationStatusKey(application);
  return Boolean(application.id) && (status === "pending" || status === "rejected");
}

export function canRejectApplication(application: ArtistApplication) {
  const status = applicationStatusKey(application);
  return Boolean(application.id) && (status === "pending" || status === "approved");
}

export function getApplicationTitle(
  application: ArtistApplication,
  categoryMap: CategoryMap,
  locale: Locale = "uz",
) {
  const category = getPrimaryCategoryLabel(application, categoryMap, locale);
  if (category !== "—") return category;

  const userName = getApplicationUserName(application);
  if (userName !== "—") return userName;

  const bio = getString(application.bio);
  if (bio) return bio.length > 42 ? `${bio.slice(0, 42).trim()}...` : bio;

  return `${locale === "ru" ? "Заявка" : "Ariza"} #${toDisplay(application.id)}`;
}

export function getApplicationUserName(application: ArtistApplication) {
  const user = getApplicationUser(application);
  if (!user) return "—";

  const fullName = getStringValue(user, "full_name");
  if (fullName) return fullName;

  const name = [getStringValue(user, "first_name"), getStringValue(user, "last_name")]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || getStringValue(user, "phone") || getStringValue(user, "email") || "—";
}

export function getApplicationUser(application: ArtistApplication) {
  return isRecord(application.user) ? application.user : undefined;
}

export function getApplicationAvatar(application: ArtistApplication) {
  const fromApplication = getString(application.profile_photo_url);
  if (fromApplication) return fromApplication;

  const user = getApplicationUser(application);
  return user
    ? getStringValue(user, "avatar_url") ??
        getStringValue(user, "photo_url") ??
        getStringValue(user, "profile_photo_url")
    : undefined;
}

export function getPrimaryCategoryLabel(
  application: ArtistApplication,
  categoryMap: CategoryMap,
  locale: Locale = "uz",
) {
  return getCategoryList(application.category_ids, categoryMap, locale)[0] ?? "—";
}

export function getPrimarySubcategoryLabel(
  application: ArtistApplication,
  categoryMap: CategoryMap,
  locale: Locale = "uz",
) {
  return getCategoryList(application.sub_category_ids, categoryMap, locale)[0] ?? "—";
}

export function getCategoryList(values: number[] | undefined, categoryMap: CategoryMap, locale: Locale = "uz") {
  return values?.length ? values.map((value) => getCategoryLabel(value, categoryMap, locale)) : [];
}

export function getCategoryLabel(id: number, categoryMap: CategoryMap, locale: Locale = "uz") {
  const category = categoryMap.get(id);
  return category ? getLocalizedCategoryName(category, locale) || `#${id}` : `#${id}`;
}

export function getLocalizedCategoryName(category: Category, locale: Locale = "uz") {
  return locale === "ru"
    ? category.name_ru || category.name_uz || category.name_en
    : category.name_uz || category.name_ru || category.name_en;
}

export function formatDateParts(value: unknown, locale: Locale = "uz") {
  if (typeof value !== "number" && typeof value !== "string") {
    return { date: "—", time: "—", full: "—" };
  }

  const date = toDate(value);
  if (!date) {
    const fallback = normalizeDate(value);
    return { date: fallback, time: "—", full: fallback };
  }

  const formatterLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const dateText = new Intl.DateTimeFormat(formatterLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const timeText = new Intl.DateTimeFormat(formatterLocale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return { date: dateText, time: timeText, full: `${dateText} ${timeText}` };
}

export function formatDateOnly(value: unknown) {
  return formatDateParts(value).date;
}

export function toDate(value: unknown) {
  if (typeof value === "number") {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

export function getServiceName(service: Service, locale: Locale = "uz") {
  const localizedName =
    locale === "ru"
      ? service.name_ru || service.name_uz || service.name_en
      : service.name_uz || service.name_ru || service.name_en;

  return localizedName || service.slug || `${locale === "ru" ? "Услуга" : "Xizmat"} #${toDisplay(service.id)}`;
}

export function getServiceDescription(service: Service, locale: Locale = "uz") {
  return locale === "ru"
    ? service.description_ru || service.description_uz || service.description_en || "—"
    : service.description_uz || service.description_ru || service.description_en || "—";
}

export function getContactValue(application: ArtistApplication, keys: string[]) {
  const user = getApplicationUser(application);
  for (const key of keys) {
    const applicationValue = getStringValue(application as UnknownRecord, key);
    if (applicationValue) return applicationValue;
    const userValue = user ? getStringValue(user, key) : undefined;
    if (userValue) return userValue;
  }
  return "—";
}

export function getStringValue(record: UnknownRecord, key: string) {
  return getString(record[key]);
}

export function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function hasAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}
