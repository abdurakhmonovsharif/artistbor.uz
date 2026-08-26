import { getDashboardStatus } from "@/lib/i18n/dashboard-copy";
import { defaultLocale, type Locale } from "@/lib/i18n/translations";

export type OrderUiStatusKey =
  | "pending"
  | "payment_pending"
  | "payment_verification"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled"
  | "unknown";

export type OrderUiStatusTone = "amber" | "emerald" | "blue" | "violet" | "red" | "slate" | "neutral";

export type OrderUiStatus = {
  key: OrderUiStatusKey;
  label: string;
  tone: OrderUiStatusTone;
};

export type OrderStatusInput = {
  status?: unknown;
  status_label?: unknown;
  status_code?: unknown;
  payment_status?: unknown;
  payment_status_label?: unknown;
  payment_expires_at?: unknown;
};

const orderStatusKeys = new Set<OrderUiStatusKey>([
  "pending",
  "payment_pending",
  "payment_verification",
  "confirmed",
  "rejected",
  "completed",
  "cancelled",
  "unknown",
]);

export function getOrderUiStatus(
  order: OrderStatusInput,
  locale: Locale = defaultLocale,
): OrderUiStatus {
  const primary = getDashboardStatus("order", order.status ?? order.status_code, locale);
  const status = primary.key === "unknown" && order.status_label
    ? getDashboardStatus("order", order.status_label, locale)
    : primary;
  const key = orderStatusKeys.has(status.key as OrderUiStatusKey)
    ? status.key as OrderUiStatusKey
    : "unknown";

  return {
    key,
    label: status.label,
    tone: toOrderTone(status.tone),
  };
}

function toOrderTone(tone: ReturnType<typeof getDashboardStatus>["tone"]): OrderUiStatusTone {
  if (tone === "success") return "emerald";
  if (tone === "danger") return "red";
  if (tone === "info") return "blue";
  if (tone === "warning") return "amber";
  return "neutral";
}
