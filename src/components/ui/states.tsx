"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();

  return (
    <div
      className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-artistbor-secondary"
      role="status"
      aria-busy="true"
    >
      <Loader2 className="size-5 animate-spin text-amber-500" />
      {label ?? t("common.loading")}
    </div>
  );
}

export function InlineLoadingState({ label }: { label?: string }) {
  const { t } = useI18n();

  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20"
      role="status"
    >
      <Loader2 className="size-4 shrink-0 animate-spin" />
      {label ?? t("common.loading")}
    </div>
  );
}

export function EmptyState({ title }: { title?: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-artistbor-secondary" role="status">
      <Inbox className="size-8 text-amber-400" />
      <p className="text-sm font-semibold">{title ?? t("common.noRecords")}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-rose-600 dark:text-rose-300" role="alert">
      <AlertTriangle className="size-8" />
      <p className="text-sm font-black">{t("common.errorTitle")}</p>
      <p className="max-w-lg text-sm font-semibold">{message}</p>
    </div>
  );
}
