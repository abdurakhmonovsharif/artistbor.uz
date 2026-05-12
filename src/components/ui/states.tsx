"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
      <Loader2 className="size-5 animate-spin text-amber-500" />
      {label ?? t("common.loading")}
    </div>
  );
}

export function EmptyState({ title }: { title?: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400">
      <Inbox className="size-8 text-amber-400" />
      <p className="text-sm font-semibold">{title ?? t("common.noRecords")}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-rose-600 dark:text-rose-300">
      <AlertTriangle className="size-8" />
      <p className="text-sm font-black">{t("common.errorTitle")}</p>
      <p className="max-w-lg text-sm font-semibold">{message}</p>
    </div>
  );
}
