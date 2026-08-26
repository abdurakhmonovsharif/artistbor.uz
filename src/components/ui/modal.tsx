"use client";

import { X } from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function Modal({
  title,
  children,
  onClose,
  width = "max-w-3xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  const { t } = useI18n();
  const titleId = useId();

  return (
    <div className="artistbor-confirm-modal fixed inset-0 z-40 flex items-center justify-center bg-[var(--artistbor-modal-mask)] p-4 backdrop-blur-sm">
      <div
        className={`relative max-h-[90vh] w-full ${width} overflow-hidden rounded-xl border border-[var(--artistbor-modal-surface-border)] bg-[var(--artistbor-modal-surface)] text-[var(--artistbor-modal-text)] shadow-[var(--artistbor-modal-surface-shadow)]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-[var(--artistbor-modal-surface-border)] bg-[var(--artistbor-modal-subtle-bg)] px-6 py-4">
          <h2 id={titleId} className="text-lg font-bold text-[var(--artistbor-modal-title)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[var(--artistbor-modal-close-border)] bg-transparent p-2 text-[var(--artistbor-modal-close-color)] transition-[background-color,border-color,color] duration-200 ease-out hover:border-[var(--artistbor-modal-close-hover-border)] hover:bg-[var(--artistbor-modal-close-hover-bg)] hover:text-[var(--artistbor-modal-close-hover-color)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            aria-label={t("actions.close")}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-73px)] overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}
