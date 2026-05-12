import { cn } from "@/lib/utils";

export const adminActionButtonClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-slate-200 bg-white text-slate-600 shadow-sm shadow-slate-950/[0.03]",
  "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300",
  "dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-200",
  "dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
);

export const adminActionButtonLargeClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-amber-300 bg-white text-amber-700 shadow-sm shadow-amber-400/10",
  "hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 hover:shadow-md",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200",
  "dark:hover:border-amber-300 dark:hover:bg-amber-400/15 dark:hover:text-amber-100",
  "dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
  "h-11 rounded-xl px-5 text-sm font-black",
);

export const adminPrimaryActionButtonClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-amber-300 bg-white text-amber-700 shadow-sm shadow-amber-400/10",
  "hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 hover:shadow-md",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200",
  "dark:hover:border-amber-300 dark:hover:bg-amber-400/15 dark:hover:text-amber-100",
  "dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
);

export const adminDangerActionButtonClass = cn(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition",
  "border-rose-200 bg-white text-rose-600 shadow-sm shadow-slate-950/[0.03]",
  "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700",
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  "dark:border-rose-500/30 dark:bg-white/[0.03] dark:text-rose-300 dark:hover:bg-rose-500/10",
);
