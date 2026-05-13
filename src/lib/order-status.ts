export type OrderUiStatusKey = "pending" | "payment_pending" | "confirmed" | "completed" | "cancelled" | "unknown";

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
  pending: { key: "pending", label: "Kutilmoqda", tone: "amber" },
  payment_pending: { key: "payment_pending", label: "To'lov kutilmoqda", tone: "blue" },
  confirmed: { key: "confirmed", label: "Tasdiqlangan", tone: "emerald" },
  completed: { key: "completed", label: "Yakunlangan", tone: "violet" },
  cancelled: { key: "cancelled", label: "Bekor qilingan", tone: "red" },
  unknown: { key: "unknown", label: "Noma'lum", tone: "neutral" },
};

export function getOrderUiStatus(order: OrderStatusInput): OrderUiStatus {
  const orderStatus = normalizeStatus(order.status ?? order.status_code, order.status_label);

  if (orderStatus === "pending") return UI_STATUS.pending;
  if (orderStatus === "payment_pending") return UI_STATUS.payment_pending;
  if (orderStatus === "confirmed") return UI_STATUS.confirmed;
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
  if (hasAny(text, ["cancel", "canceled", "cancelled", "reject", "bekor"])) return "cancelled";
  if (hasAny(text, ["complete", "completed", "done", "finished", "yakun"])) return "completed";
  if (hasAny(text, ["confirm", "confirmed", "approved", "accepted", "tasdiq"])) return "confirmed";
  if (hasAny(text, ["payment pending", "awaiting payment", "unpaid", "to'lov kutil", "tolov kutil", "оплат"])) return "payment_pending";
  if (hasAny(text, ["pending", "waiting", "review", "new", "kutil"])) return "pending";

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
