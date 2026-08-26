"use client";

import {
  getDashboardStatus,
  getDashboardStatusDomain,
  type DashboardStatusTone,
} from "@/lib/i18n/dashboard-copy";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

const toneClass: Record<DashboardStatusTone, string> = {
  success: "border-emerald-400/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
  danger: "border-rose-400/30 bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
  warning: "border-amber-400/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  info: "border-artistbor-border-strong bg-artistbor-surface-subtle text-artistbor-secondary",
  neutral: "border-slate-400/30 bg-slate-50 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

export function StatusBadge({
  value,
  fieldKey,
}: {
  value: unknown;
  fieldKey?: string;
}) {
  const { locale } = useI18n();
  const status = getDashboardStatus(getDashboardStatusDomain(fieldKey), value, locale);

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]",
        toneClass[status.tone],
      )}
    >
      {status.label}
    </span>
  );
}
