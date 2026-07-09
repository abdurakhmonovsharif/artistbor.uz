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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
      <section className="relative isolate w-full max-w-[480px] rounded-xl border border-white/10 bg-[#111827] p-6 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_80px_rgba(2,6,23,0.56)] before:pointer-events-none before:absolute before:inset-px before:z-0 before:rounded-[10px] before:border before:border-white/[0.04] before:content-['']">
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-base font-black text-slate-50">
            {title ?? t("actions.confirm")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-rose-400/70 bg-transparent text-rose-400 transition-[background-color,border-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-rose-300 hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
            aria-label={t("actions.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold leading-6 text-slate-200">
            {message}
          </p>
        </div>

        <footer className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "artistbor-modal-action w-1/2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60",
              danger ? "artistbor-modal-action--danger" : "artistbor-modal-action--success",
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
