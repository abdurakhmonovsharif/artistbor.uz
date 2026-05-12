"use client";

import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[#111827]">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 px-5 dark:border-white/10">
          <h2 className="text-base font-black text-slate-950 dark:text-white">
            {title ?? t("actions.confirm")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.10)] transition hover:border-rose-500 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300 dark:shadow-[0_0_0_3px_rgba(244,63,94,0.18)] dark:hover:border-rose-300 dark:hover:text-rose-200"
            aria-label={t("actions.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="p-5">
          <div className="flex gap-4">
            <div
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl border",
                danger
                  ? "border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
              )}
            >
              <AlertTriangle className="size-5" />
            </div>
            <p className="pt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
              {message}
            </p>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-[#0f172a] sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
          >
            {cancelLabel ?? t("actions.cancel")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "h-10 cursor-pointer rounded-lg px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
              danger
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600"
                : "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 hover:bg-amber-300",
            )}
          >
            {loading ? t("crud.actionInProgress") : (confirmLabel ?? t("actions.confirm"))}
          </button>
        </footer>
      </section>
    </div>
  );
}
