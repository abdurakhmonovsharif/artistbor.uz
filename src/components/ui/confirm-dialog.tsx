"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useId } from "react";
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
  const titleId = useId();

  return (
    <div className="artistbor-confirm-modal fixed inset-0 z-50 flex items-center justify-center bg-[var(--artistbor-modal-mask)] p-4 backdrop-blur-[2px]">
      <section
        className="relative w-full max-w-[480px] rounded-xl border border-[var(--artistbor-modal-surface-border)] bg-[var(--artistbor-modal-surface)] p-6 text-[var(--artistbor-modal-text)] shadow-[var(--artistbor-modal-surface-shadow)]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-base font-bold text-[var(--artistbor-modal-title)]">
            {title ?? t("actions.confirm")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-[var(--artistbor-modal-close-border)] bg-transparent text-[var(--artistbor-modal-close-color)] transition-[background-color,border-color,color] duration-200 ease-out hover:border-[var(--artistbor-modal-close-hover-border)] hover:bg-[var(--artistbor-modal-close-hover-bg)] hover:text-[var(--artistbor-modal-close-hover-color)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
            aria-label={t("actions.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="mt-4 rounded-xl border border-[var(--artistbor-modal-subtle-border)] bg-[var(--artistbor-modal-subtle-bg)] p-4">
          <p className="text-sm font-normal leading-6 text-[var(--artistbor-modal-body)]">
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
