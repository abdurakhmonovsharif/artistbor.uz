import type { Locale } from "@/lib/i18n/translations";

export const MONEY_CURRENCY_LABEL = "so'm";

const formatterCache = new Map<string, Intl.NumberFormat>();

function intlLocale(locale?: Locale | string) {
  return locale === "ru" ? "ru-RU" : "uz-UZ";
}

function formatterFor(locale?: Locale | string) {
  const key = intlLocale(locale);
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(key, { maximumFractionDigits: 0 });
  formatterCache.set(key, formatter);
  return formatter;
}

export function moneyAmount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .replace(/[',]/g, "");

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function positiveMoneyAmount(value: unknown) {
  const amount = moneyAmount(value);
  return amount !== null && amount > 0 ? amount : null;
}

export function formatMoneyAmount(value: unknown, locale?: Locale | string) {
  const amount = moneyAmount(value);
  if (amount === null) return "";

  return formatterFor(locale).format(Math.round(amount));
}

export function formatMoneyWithCurrency(value: unknown, locale?: Locale | string, currency = MONEY_CURRENCY_LABEL) {
  const amount = formatMoneyAmount(value, locale);
  return amount ? `${amount} ${currency}` : "";
}

export function parseMoneyInput(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? String(Math.trunc(value)) : "";
  if (typeof value !== "string") return "";

  return value.replace(/\D/g, "");
}

export function formatMoneyInput(value: unknown, locale?: Locale | string) {
  const digits = parseMoneyInput(value);
  if (!digits) return "";

  return formatMoneyAmount(digits, locale);
}

export function formatSignedMoneyInput(value: unknown, locale?: Locale | string) {
  const rawValue = String(value ?? "");
  const sign = rawValue.trimStart().startsWith("-") ? "-" : "";
  const amount = formatMoneyInput(rawValue, locale);
  return amount ? `${sign}${amount}` : sign;
}
