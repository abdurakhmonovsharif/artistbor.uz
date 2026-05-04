"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Yorug' rejim" : "Tungi rejim"}
      aria-label={isDark ? "Yorug' rejim" : "Tungi rejim"}
      className="grid size-10 place-items-center rounded-2xl border border-slate-200 bg-white text-amber-500 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-amber-300 dark:hover:bg-amber-400/10"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
