"use client";

import { Languages, LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import type { User } from "@/types/api";

export function Header({
  user,
  onOpenSidebar,
  onLogout,
}: {
  user: User | null;
  onOpenSidebar: () => void;
  onLogout: () => void;
}) {
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.phone ||
    "Administrator";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/85 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#080b12]/85 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="grid size-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 lg:hidden"
          aria-label="Menyuni ochish"
        >
          <Menu className="size-4" />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          className="grid size-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
          aria-label="Til"
          title="Til"
        >
          <Languages className="size-4" />
        </button>
        <ThemeToggle />
        <button
          type="button"
          onClick={onLogout}
          className="hidden size-10 place-items-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 sm:grid"
          aria-label="Chiqish"
          title="Chiqish"
        >
          <LogOut className="size-4" />
        </button>
        <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="hidden text-right sm:block">
            <p className="max-w-32 truncate text-sm font-black text-slate-950 dark:text-white">
              {name}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">
            {formatRole(user?.role)}
            </p>
          </div>
          <div className="grid size-9 place-items-center rounded-2xl border border-amber-300 bg-amber-50 text-sm font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

function formatRole(role: User["role"]) {
  if (role === "admin") return "Admin";
  if (role === "operator") return "Operator";
  if (role === "artist") return "Artist";
  if (role === "client") return "Mijoz";
  return role ?? "Admin";
}
