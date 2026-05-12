import { cn } from "@/lib/utils";

export const adminActionButtonClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-rose-200 bg-white text-rose-600 shadow-sm shadow-slate-950/[0.03]",
  "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-rose-500/30 dark:bg-white/[0.03] dark:text-rose-300",
  "dark:hover:border-rose-400/50 dark:hover:bg-rose-500/10 dark:hover:text-rose-200",
  "dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
);

export const adminActionButtonLargeClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-emerald-300 bg-white text-emerald-700 shadow-sm shadow-emerald-400/10",
  "hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-md",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200",
  "dark:hover:border-emerald-300 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-100",
  "dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
  "h-11 rounded-xl px-5 text-sm font-black",
);

export const adminPrimaryActionButtonClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-emerald-300 bg-white text-emerald-700 shadow-sm shadow-emerald-400/10",
  "hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-md",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200",
  "dark:hover:border-emerald-300 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-100",
  "dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
);

export const adminDangerActionButtonClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-rose-200 bg-white text-rose-600 shadow-sm shadow-slate-950/[0.03]",
  "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-rose-500/30 dark:bg-white/[0.03] dark:text-rose-300 dark:hover:bg-rose-500/10",
);
