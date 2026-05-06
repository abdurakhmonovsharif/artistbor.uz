import { isExpired } from "@/lib/order-format";

export type OrderUiStatusKey =
  | "awaiting_payment"
  | "pending_review"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
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

const UI_STATUS: Record<OrderUiStatusKey, OrderUiStatus> = {
  awaiting_payment: { key: "awaiting_payment", label: "To'lov kutilmoqda", tone: "amber" },
  pending_review: { key: "pending_review", label: "Jarayonda", tone: "amber" },
  confirmed: { key: "confirmed", label: "Tasdiqlangan", tone: "emerald" },
  in_progress: { key: "in_progress", label: "Jarayonda", tone: "blue" },
  completed: { key: "completed", label: "Yakunlangan", tone: "violet" },
  cancelled: { key: "cancelled", label: "Bekor qilingan", tone: "red" },
  expired: { key: "expired", label: "Muddati o'tgan", tone: "slate" },
  unknown: { key: "unknown", label: "Noma'lum", tone: "neutral" },
};

export function getOrderUiStatus(order: OrderStatusInput, nowMs = Date.now()): OrderUiStatus {
  const orderStatus = normalizeStatus(order.status ?? order.status_code, order.status_label);
  const paymentStatus = normalizePaymentStatus(order.payment_status, order.payment_status_label);
  const paymentExpired = isExpired(order.payment_expires_at, nowMs);
  const hasPaymentDeadline = hasPositiveTimestamp(order.payment_expires_at);

  if (paymentExpired && paymentStatus === "pending") return UI_STATUS.expired;
  if (orderStatus === "payment_pending" && paymentStatus !== "paid") return UI_STATUS.awaiting_payment;
  if (orderStatus === "pending" && paymentStatus === "pending" && hasPaymentDeadline) {
    return UI_STATUS.awaiting_payment;
  }
  if (orderStatus === "pending") return UI_STATUS.pending_review;
  if (orderStatus === "confirmed") return UI_STATUS.confirmed;
  if (orderStatus === "in_progress") return UI_STATUS.in_progress;
  if (orderStatus === "completed") return UI_STATUS.completed;
  if (orderStatus === "cancelled") return UI_STATUS.cancelled;

  return UI_STATUS.unknown;
}

function normalizeStatus(status: unknown, label: unknown) {
  const numericStatus = numberValue(status);
  if (numericStatus === 10) return "pending";
  if (numericStatus === 20) return "payment_pending";
  if (numericStatus === 30) return "confirmed";
  if (numericStatus === 40) return "cancelled";
  if (numericStatus === 50) return "completed";

  const text = normalizeText([status, label]);
  if (hasAny(text, ["cancel", "reject"])) return "cancelled";
  if (hasAny(text, ["complete", "done", "finished"])) return "completed";
  if (hasAny(text, ["progress", "process", "working"])) return "in_progress";
  if (hasAny(text, ["confirm", "approved", "accepted"])) return "confirmed";
  if (hasAny(text, ["payment", "unpaid"])) return "payment_pending";
  if (hasAny(text, ["pending", "review", "new"])) return "pending";

  return "unknown";
}

function normalizePaymentStatus(status: unknown, label: unknown) {
  const numericStatus = numberValue(status);
  if (numericStatus === 10) return "pending";
  if (numericStatus === 20) return "paid";
  if (numericStatus === 30) return "refunded";

  const text = normalizeText([status, label]);
  if (hasAny(text, ["refund", "returned"])) return "refunded";
  if (hasAny(text, ["paid", "success", "complete"])) return "paid";
  if (hasAny(text, ["pending", "unpaid", "waiting"])) return "pending";

  return "unknown";
}

function normalizeText(values: unknown[]) {
  return values
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ")
    .replace(/[_-]+/g, " ")
    .trim();
}

function hasAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function hasPositiveTimestamp(value: unknown) {
  const number = numberValue(value);
  return number !== undefined && number > 0;
}
