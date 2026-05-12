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
          ordersApi.list({ status: "pending", page: 1, limit: 1 }),
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
        "min-h-screen bg-slate-50 text-slate-950 transition-[grid-template-columns] duration-200 dark:bg-[#0f172a] dark:text-slate-100 lg:grid",
        sidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[280px_1fr]",
      )}
    >
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onLogout={handleLogout}
        quickStats={quickStats}
      />
      <div className="min-w-0">
        <Header
          user={user}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function getListCount(result: Awaited<ReturnType<typeof ordersApi.list>>) {
  return Number(result.meta?.totalCount ?? result.meta?.total ?? result.items.length) || 0;
}
