"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <section className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[#202020]">
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-base font-black text-slate-950 dark:text-white">
            {title ?? t("actions.confirm")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-rose-400/80 bg-transparent text-rose-400 transition hover:border-rose-500 hover:bg-rose-50 hover:text-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-rose-500/80 dark:text-rose-400 dark:hover:border-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
            aria-label={t("actions.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
          <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
            {message}
          </p>
        </div>

        <footer className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "inline-flex h-10 w-1/2 cursor-pointer items-center justify-center gap-2 rounded-lg border px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
              danger
                ? "border-rose-300 bg-transparent text-rose-600 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-500/60 dark:text-rose-200 dark:hover:bg-rose-500/10"
                : "border-emerald-300 bg-transparent text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-400/50 dark:text-emerald-200 dark:hover:bg-emerald-400/10",
            )}
          >
            {danger ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
            {loading ? t("crud.actionInProgress") : (confirmLabel ?? t("actions.confirm"))}
          </button>
        </footer>
      </section>
    </div>
  );
}
