import { cn } from "@/lib/utils";

export function StatusBadge({
  value,
  fieldKey,
}: {
  value: unknown;
  fieldKey?: string;
}) {
  const rawLabel = value === null || value === undefined || value === "" ? "—" : String(value);
  const normalized = rawLabel.trim().toLowerCase().replace(/[_-]+/g, " ");
  const key = fieldKey?.trim().toLowerCase() ?? "";
  const isPaymentStatus = key === "payment_status" || key === "payment status";
  const isPublicationStatus = key === "is_published" || key === "published";
  const inactive = normalized.includes("inactive") || normalized.includes("nofaol");
  const label = statusLabel(normalized, rawLabel, fieldKey);
  const good =
    !inactive &&
    (normalized.includes("active") ||
      normalized.includes("approved") ||
      normalized.includes("confirmed") ||
      normalized.includes("completed") ||
      normalized.includes("accepted") ||
      normalized.includes("faol") ||
      normalized.includes("tasdiqlangan") ||
      normalized.includes("yakunlangan") ||
      normalized.includes("qabul qilingan") ||
      normalized === "1" ||
      normalized === "10" ||
      (isPaymentStatus && normalized === "20") ||
      normalized === "true");
  const danger =
    normalized.includes("reject") ||
    normalized.includes("cancel") ||
    normalized.includes("delete") ||
    normalized.includes("rad etilgan") ||
    normalized.includes("bekor qilingan") ||
    (normalized === "9" && !isPaymentStatus) ||
    (normalized === "20" && !isPaymentStatus) ||
    (normalized === "0" && !isPublicationStatus) ||
    normalized === "false";
  const neutral =
    normalized.includes("expired") ||
    normalized.includes("muddati") ||
    normalized.includes("unknown") ||
    normalized.includes("noma'lum") ||
    (isPublicationStatus && normalized === "0") ||
    (isPaymentStatus && normalized === "30") ||
    rawLabel === "—";

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]",
        good && "border-emerald-400/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
        danger && "border-rose-400/30 bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
        neutral && "border-slate-400/30 bg-slate-50 text-slate-600 dark:bg-white/10 dark:text-slate-300",
        !good && !danger && !neutral && "border-amber-400/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      )}
    >
      {label}
    </span>
  );
}

function statusLabel(normalized: string, fallback: string, fieldKey?: string) {
  const key = fieldKey?.trim().toLowerCase() ?? "";

  if (key === "is_published" || key === "published") {
    if (normalized === "1" || normalized === "true") return "Ko'rsatilgan";
    if (normalized === "0" || normalized === "false") return "Yashirilgan";
  }

  if (key === "is_active" || key === "active") {
    if (normalized === "1" || normalized === "true" || normalized === "10") return "Faol";
    if (normalized === "0" || normalized === "false" || normalized === "9") return "Nofaol";
  }

  if (key === "payment_status" || key === "payment status") {
    if (normalized === "10") return "To'lov kutilmoqda";
    if (normalized === "20") return "To'langan";
    if (normalized === "30") return "Qaytarilgan";
  }

  if (key === "status" || key === "status_label" || key.endsWith("_status")) {
    if (normalized === "10") return "Faol";
    if (normalized === "9") return "Nofaol";
    if (normalized === "20") return "Bloklangan";
    if (normalized === "0") return "O'chirilgan";
    if (normalized === "1") return "Faol";
  }

  const labels: Record<string, string> = {
    "0": "Yo'q",
    "1": "Ha",
    "9": "Nofaol",
    "10": "Faol",
    "20": "Bloklangan",
    active: "Faol",
    inactive: "Nofaol",
    pending: "Kutilmoqda",
    "pending review": "Ko'rib chiqilmoqda",
    "payment pending": "To'lov kutilmoqda",
    "awaiting payment": "To'lov kutilmoqda",
    approved: "Tasdiqlangan",
    accepted: "Qabul qilingan",
    rejected: "Rad etilgan",
    confirmed: "Tasdiqlangan",
    "in progress": "Jarayonda",
    processing: "Jarayonda",
    completed: "Yakunlangan",
    done: "Yakunlangan",
    cancelled: "Bekor qilingan",
    canceled: "Bekor qilingan",
    expired: "Muddati o'tgan",
    unknown: "Noma'lum",
    blocked: "Bloklangan",
    published: "Ko'rsatilgan",
    unpublished: "Yashirilgan",
    true: "Ha",
    false: "Yo'q",
  };

  return labels[normalized] ?? fallback;
}
