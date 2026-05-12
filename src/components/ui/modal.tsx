"use client";

import { X } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[90vh] w-full ${width} overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-950`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
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
