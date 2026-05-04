import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "Ma'lumot yuklanmoqda..." }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
      <Loader2 className="size-5 animate-spin text-amber-500" />
      {label}
    </div>
  );
}

export function EmptyState({ title = "Yozuvlar topilmadi" }: { title?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400">
      <Inbox className="size-8 text-amber-400" />
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-rose-600 dark:text-rose-300">
      <AlertTriangle className="size-8" />
      <p className="text-sm font-black">Xatolik yuz berdi</p>
      <p className="max-w-lg text-sm font-semibold">{message}</p>
    </div>
  );
}
