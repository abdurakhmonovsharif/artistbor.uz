"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useTheme } from "@/lib/theme/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const label = isDark ? t("theme.light") : t("theme.dark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-amber-500 shadow-none transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-amber-300 dark:hover:bg-amber-400/10"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
