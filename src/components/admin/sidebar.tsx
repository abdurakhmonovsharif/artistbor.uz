"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { adminMenu } from "@/components/admin/menu";
import { cn } from "@/lib/utils";

export function Sidebar({
  open,
  onClose,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-100 bg-white p-4 shadow-2xl shadow-slate-950/10 transition-transform dark:border-white/10 dark:bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/admin" onClick={onClose} className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-400 text-sm font-black text-slate-950 shadow-lg shadow-amber-400/25">
              A
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.22em] text-slate-950 dark:text-white">
                Artistbor
              </span>
              <span className="block text-xs font-semibold text-slate-400">
                Admin paneli
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 dark:border-white/10 lg:hidden"
            aria-label="Menyuni yopish"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="admin-sidebar-nav mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
          {adminMenu.map((item) => (
            <SidebarLink key={item.href} item={item} onClick={onClose} />
          ))}
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
        >
          <LogOut className="size-4" />
          Chiqish
        </button>
      </aside>
    </>
  );
}

function SidebarLink({
  item,
  onClick,
}: {
  item: (typeof adminMenu)[number];
  onClick: () => void;
}) {
  const pathname = usePathname();
  const active =
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
        active
          ? "bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-400/10 dark:text-amber-300"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}
