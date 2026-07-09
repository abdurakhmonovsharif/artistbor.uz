"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth/auth-provider";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useToast } from "@/components/ui/toast";
import { dashboardApi, ordersApi, type DashboardQuickStats } from "@/lib/api/admin-content";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickStats, setQuickStats] = useState<DashboardQuickStats | null>(null);
  const { user, loading, logout } = useAuth();
  const { t } = useI18n();
  const toast = useToast();

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadQuickStats = async () => {
      try {
        const [statsResult, pendingOrdersResult] = await Promise.allSettled([
          dashboardApi.quickStats(),
          ordersApi.list({ status: "10", page: 1, limit: 1 }),
        ]);
        if (!active) return;
        if (statsResult.status === "rejected") {
          setQuickStats(null);
          return;
        }

        const pendingOrders =
          pendingOrdersResult.status === "fulfilled"
            ? getListCount(pendingOrdersResult.value)
            : statsResult.value.pending_orders;

        setQuickStats({
          ...statsResult.value,
          pending_orders: pendingOrders,
        });
      } catch {
        if (active) setQuickStats(null);
      }
    };

    void loadQuickStats();
    const interval = window.setInterval(loadQuickStats, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("admin.logoutSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.logoutFailed"));
    }
  };

  const handleToggleNavigation = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarCollapsed((current) => !current);
      return;
    }

    setSidebarOpen((current) => !current);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#0f172a]">
        <LoadingState label={t("admin.loadingSession")} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className={cn(
        "mx-auto min-h-screen min-w-[1280px] max-w-[2600px] bg-[#f7f9fc] text-slate-950 transition-[grid-template-columns] duration-200 dark:bg-[#0f172a] dark:text-slate-100 lg:grid [--artistbor-main-padding:20px] [--artistbor-sidebar-width:220px] min-[1366px]:[--artistbor-main-padding:22px] min-[1366px]:[--artistbor-sidebar-width:228px] min-[1440px]:[--artistbor-main-padding:24px] min-[1440px]:[--artistbor-sidebar-width:240px] min-[1536px]:[--artistbor-main-padding:32px] min-[1536px]:[--artistbor-sidebar-width:248px] min-[1920px]:[--artistbor-main-padding:40px] min-[1920px]:[--artistbor-sidebar-width:264px] min-[2400px]:[--artistbor-main-padding:48px] min-[2400px]:[--artistbor-sidebar-width:280px]",
        sidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[var(--artistbor-sidebar-width)_1fr]",
      )}
    >
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        quickStats={quickStats}
      />
      <div className="min-w-0">
        <Header
          user={user}
          navigationExpanded={sidebarOpen || !sidebarCollapsed}
          pendingOrdersCount={quickStats?.pending_orders}
          onToggleNavigation={handleToggleNavigation}
          onLogout={handleLogout}
        />
        <main className="px-[var(--artistbor-main-padding)] py-[var(--artistbor-main-padding)]">{children}</main>
      </div>
    </div>
  );
}

function getListCount(result: Awaited<ReturnType<typeof ordersApi.list>>) {
  return Number(result.meta?.totalCount ?? result.meta?.total ?? result.items.length) || 0;
}
