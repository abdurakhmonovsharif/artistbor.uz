import { cn } from "@/lib/utils";

export function StatusBadge({ value }: { value: unknown }) {
  const rawLabel = value === null || value === undefined || value === "" ? "—" : String(value);
  const normalized = rawLabel.toLowerCase();
  const label = statusLabel(normalized, rawLabel);
  const good =
    normalized.includes("active") ||
    normalized.includes("approved") ||
    normalized.includes("confirmed") ||
    normalized.includes("completed") ||
    normalized === "1" ||
    normalized === "10" ||
    normalized === "20" ||
    normalized === "true";
  const danger =
    normalized.includes("reject") ||
    normalized.includes("cancel") ||
    normalized.includes("delete") ||
    normalized === "0" ||
    normalized === "false";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em]",
        good && "border-emerald-400/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
        danger && "border-rose-400/30 bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
        !good && !danger && "border-amber-400/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function statusLabel(normalized: string, fallback: string) {
  const labels: Record<string, string> = {
    active: "Faol",
    inactive: "Nofaol",
    pending: "Kutilmoqda",
    approved: "Tasdiqlangan",
    rejected: "Rad etilgan",
    confirmed: "Tasdiqlangan",
    completed: "Yakunlangan",
    cancelled: "Bekor qilingan",
    canceled: "Bekor qilingan",
    blocked: "Bloklangan",
    published: "Ko'rsatilgan",
    unpublished: "Yashirilgan",
    true: "Ha",
    false: "Yo'q",
  };

  return labels[normalized] ?? fallback;
}
