"use client";

import { LogOut, Menu } from "lucide-react";
import { LanguageToggle } from "@/components/admin/language-toggle";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { useI18n } from "@/lib/i18n/i18n-provider";
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
  const { t } = useI18n();
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.phone ||
    t("common.administrator");

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/85 px-4 py-4 backdrop-blur-xl dark:border-slate-700/70 dark:bg-[#0f172a]/85 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="grid size-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 lg:hidden"
          aria-label={t("sidebar.openMenu")}
        >
          <Menu className="size-4" />
        </button>

        <div className="flex-1" />

        <LanguageToggle />
        <ThemeToggle />
        <button
          type="button"
          onClick={onLogout}
          className="hidden size-10 place-items-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 sm:grid"
          aria-label={t("admin.logout")}
          title={t("admin.logout")}
        >
          <LogOut className="size-4" />
        </button>
        <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="hidden text-right sm:block">
            <p className="max-w-32 truncate text-sm font-black text-slate-950 dark:text-white">
              {name}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">
              {formatRole(user?.role, t)}
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

function formatRole(role: User["role"], t: ReturnType<typeof useI18n>["t"]) {
  if (role === 30) return t("roles.admin");
  if (role === 25) return t("roles.moderator");
  if (role === 20) return t("roles.operator");
  if (role === 10) return t("roles.client");
  if (role === "admin") return t("roles.admin");
  if (role === "moderator") return t("roles.moderator");
  if (role === "operator") return t("roles.operator");
  if (role === "artist") return t("roles.artist");
  if (role === "client") return t("roles.client");
  return role ?? t("roles.admin");
}
