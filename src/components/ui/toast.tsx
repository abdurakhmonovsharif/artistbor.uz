"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Toast = {
  id: number;
  title: string;
  tone: "success" | "error";
};

type ToastContextValue = {
  success: (title: string) => void;
  error: (title: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((title: string, tone: Toast["tone"]) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, title, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(
    () => ({
      success: (title: string) => push(title, "success"),
      error: (title: string) => push(title, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : XCircle;
          return (
            <div
              key={toast.id}
              className="flex items-center gap-3 rounded-[18px] border border-artistbor-border bg-artistbor-surface px-4 py-3 text-sm font-semibold text-artistbor-primary shadow-[var(--artistbor-surface-shadow)]"
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <Icon
                className={
                  toast.tone === "success" ? "size-5 text-emerald-500" : "size-5 text-rose-500"
                }
              />
              <span>{toast.title}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
