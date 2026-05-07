"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import {
  adminMenu,
  adminMenuGroups,
  type AdminMenuGroup,
  type AdminMenuItem,
} from "@/components/admin/menu";
import { cn } from "@/lib/utils";
import type { DashboardQuickStats } from "@/lib/api/admin-content";

export function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapsed,
  onLogout,
  quickStats,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
  onLogout: () => void;
  quickStats: DashboardQuickStats | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);
  const selectedKey = useMemo(() => getSelectedKey(pathname), [pathname]);
  const compact = collapsed && isDesktop;
  const menuItems = useMemo<MenuProps["items"]>(
    () => adminMenuGroups.map((item) => createGroupMenuItem(item, quickStats)),
    [quickStats],
  );

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const updateIsDesktop = () => setIsDesktop(query.matches);

    updateIsDesktop();
    query.addEventListener("change", updateIsDesktop);

    return () => query.removeEventListener("change", updateIsDesktop);
  }, []);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    const href = String(key);
    if (!href.startsWith("/")) return;
    router.push(href);
    onClose();
  };

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
          "fixed inset-y-0 left-0 z-40 flex w-[280px] max-w-[calc(100vw-24px)] flex-col border-r border-slate-200/80 bg-white shadow-lg shadow-slate-950/10 transition-[transform,width] duration-200 dark:border-white/10 dark:bg-[#111827] lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:translate-x-0 lg:shadow-none",
          compact ? "lg:w-20" : "lg:w-[280px]",
          open ? "translate-x-0" : "-translate-x-full",
          compact && "artistbor-sidebar-collapsed",
        )}
      >
        <div
          className={cn(
            "relative flex min-h-16 items-center border-b border-slate-100 dark:border-white/10",
            compact ? "justify-center px-0" : "justify-between px-4",
          )}
        >
          <Link
            href="/admin"
            onClick={onClose}
            className={cn("flex min-w-0 items-center", compact ? "justify-center" : "gap-3")}
            aria-label="Artistbor admin paneli"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500 text-sm font-bold text-white">
              A
            </span>
            <span className={cn("min-w-0", compact && "hidden")}>
              <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                Artistbor
              </span>
              <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Admin paneli
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="absolute -right-4 top-1/2 z-10 hidden size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:bg-[#111827] dark:text-slate-400 dark:hover:border-amber-400/40 dark:hover:text-amber-300 lg:grid"
            aria-label={compact ? "Sidebarni kengaytirish" : "Sidebarni qisqartirish"}
            aria-expanded={!compact}
            title={compact ? "Kengaytirish" : "Qisqartirish"}
          >
            {compact ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white lg:hidden"
            aria-label="Menyuni yopish"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="admin-sidebar-nav flex-1 overflow-y-auto px-3 py-3">
          <Menu
            aria-label="Admin navigatsiyasi"
            className={cn("artistbor-sidebar-menu", compact && "artistbor-sidebar-menu-collapsed")}
            inlineCollapsed={compact}
            items={menuItems}
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={handleMenuClick}
            tooltip={{ placement: "right", mouseEnterDelay: 0.2 }}
          />
        </nav>

        <div className="border-t border-slate-100 px-3 py-3 dark:border-white/10">
          <Tooltip title={compact ? "Chiqish" : null} placement="right" mouseEnterDelay={0.2}>
            <button
              type="button"
              onClick={onLogout}
              className={cn(
                "flex h-10 items-center rounded-lg text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300",
                compact ? "mx-auto w-10 justify-center px-0" : "w-full gap-3 px-3",
              )}
              aria-label="Chiqish"
            >
              <LogOut className="size-4 shrink-0" />
              <span className={cn(compact && "hidden")}>Chiqish</span>
            </button>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}

function createGroupMenuItem(
  item: AdminMenuGroup,
  quickStats: DashboardQuickStats | null,
) {
  return {
    key: item.key,
    type: "group" as const,
    label: item.label,
    children: item.children.map((child) => createRouteMenuItem(child, quickStats)),
  };
}

function createRouteMenuItem(item: AdminMenuItem, quickStats: DashboardQuickStats | null) {
  const Icon = item.icon;

  return {
    key: item.href,
    icon: <Icon className="size-4" />,
    title: item.label,
    label: (
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <MenuBadge value={getMenuBadge(item.href, quickStats)} />
      </span>
    ),
  };
}

function MenuBadge({ value }: { value?: number }) {
  if (!value || value <= 0) return null;

  return <span className="artistbor-sidebar-badge">{formatBadge(value)}</span>;
}

function getSelectedKey(pathname: string) {
  const match = adminMenu
    .filter((item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)))
    .sort((first, second) => second.href.length - first.href.length)[0];

  return match?.href ?? "/admin";
}

function getMenuBadge(href: string, stats: DashboardQuickStats | null) {
  if (!stats) return undefined;
  if (href === "/admin/applications") return stats.pending_applications;
  if (href === "/admin/comments") return stats.pending_comments;
  if (href === "/admin/orders") return stats.today_orders;
  return undefined;
}

function formatBadge(value: number) {
  if (value > 99) return "99+";
  return String(value);
}
