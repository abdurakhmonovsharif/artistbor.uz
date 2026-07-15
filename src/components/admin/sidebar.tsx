"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { LogOut, X } from "lucide-react";
import {
  adminMenu,
  getAdminMenuGroupsForRole,
  type AdminMenuGroup,
  type AdminMenuItem,
} from "@/components/admin/menu";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { DashboardQuickStats } from "@/lib/api/admin-content";
import type { User } from "@/types/api";

export function Sidebar({
  open,
  collapsed,
  onClose,
  onLogout,
  quickStats,
  userRole,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onLogout: () => void;
  quickStats: DashboardQuickStats | null;
  userRole: User["role"];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [isDesktop, setIsDesktop] = useState(false);
  const selectedKey = useMemo(() => getSelectedKey(pathname), [pathname]);
  const compact = collapsed && isDesktop;
  const filteredGroups = useMemo(() => getAdminMenuGroupsForRole(userRole), [userRole]);
  const menuItems = useMemo<MenuProps["items"]>(
    () => filteredGroups.map((item) => createGroupMenuItem(item, quickStats, t)),
    [filteredGroups, quickStats, t],
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
          "artistbor-sidebar-fixed fixed inset-y-0 left-0 z-40 flex h-dvh w-[280px] max-w-[calc(100vw-24px)] flex-col border-r border-slate-200/80 bg-white shadow-lg shadow-slate-950/10 transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] dark:border-white/10 dark:bg-[#111827] lg:col-start-1 lg:row-start-1 lg:max-w-none lg:translate-x-0 lg:shadow-none",
          compact ? "lg:w-20" : "lg:w-[var(--artistbor-sidebar-width)]",
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
            aria-label={t("admin.brandAria")}
          >
            {compact ? (
              <BrandMark className="size-10" />
            ) : (
              <span className="flex min-w-0 items-center gap-3">
                <BrandMark className="size-10 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                    Artistbor
                  </span>
                  <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("menu.dashboard")}
                  </span>
                </span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white lg:hidden"
            aria-label={t("sidebar.closeMenu")}
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="admin-sidebar-nav flex-1 overflow-y-auto px-3 py-3">
          <Menu
            aria-label={t("dashboard.menu")}
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
          <Tooltip title={compact ? t("admin.logout") : null} placement="right" mouseEnterDelay={0.2}>
            <button
              type="button"
              onClick={onLogout}
              className={cn(
                "flex h-10 items-center rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300",
                compact ? "mx-auto w-10 justify-center px-0" : "w-full gap-3 px-3",
              )}
              aria-label={t("admin.logout")}
            >
              <LogOut className="size-4 shrink-0" />
              <span className={cn(compact && "hidden")}>{t("admin.logout")}</span>
            </button>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden rounded-lg", className)}>
      <Image
        src="/brand/artistbor-mark.webp"
        alt="Artistbor"
        className="size-full object-contain dark:hidden"
        width={345}
        height={345}
        decoding="async"
      />
      <Image
        src="/brand/artistbor-mark-dark.webp"
        alt="Artistbor"
        className="hidden size-full object-cover dark:block"
        width={430}
        height={430}
        decoding="async"
      />
    </span>
  );
}

function createGroupMenuItem(
  item: AdminMenuGroup,
  quickStats: DashboardQuickStats | null,
  t: (key: TranslationKey) => string,
) {
  return {
    key: item.key,
    type: "group" as const,
    label: t(item.labelKey),
    children: item.children.map((child) => createRouteMenuItem(child, quickStats, t)),
  };
}

function createRouteMenuItem(
  item: AdminMenuItem,
  quickStats: DashboardQuickStats | null,
  t: (key: TranslationKey) => string,
) {
  const Icon = item.icon;
  const label = t(item.labelKey);

  return {
    key: item.href,
    icon: <Icon className="size-4" />,
    title: label,
    label: (
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate">{label}</span>
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
  if (href === "/admin/orders") return stats.pending_orders;
  return undefined;
}

function formatBadge(value: number) {
  if (value > 99) return "99+";
  return String(value);
}
