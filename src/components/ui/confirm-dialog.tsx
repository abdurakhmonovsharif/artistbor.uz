"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export function ConfirmDialog({
  title = "Tasdiqlash",
  message,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
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
  return (
    <Modal title={title} onClose={onCancel} width="max-w-md">
      <div className="space-y-5">
        <div className="flex gap-4">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
              danger
                ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                : "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300"
            }`}
          >
            <AlertTriangle className="size-5" />
          </div>
          <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-2xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? "bg-rose-500 hover:bg-rose-600" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {loading ? "Bajarilmoqda..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

