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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className={`relative isolate max-h-[90vh] w-full ${width} overflow-hidden rounded-xl border border-white/10 bg-[#111827] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_80px_rgba(2,6,23,0.56)] before:pointer-events-none before:absolute before:inset-px before:z-0 before:rounded-[10px] before:border before:border-white/[0.04] before:content-['']`}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0f172a] px-6 py-4">
          <h2 className="text-lg font-black text-slate-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-rose-400/70 bg-transparent p-2 text-rose-400 transition-[background-color,border-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-rose-300 hover:bg-rose-500/10 hover:text-rose-300"
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
