"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { dashboardApi, type DashboardQuickStats } from "@/lib/api/admin-content";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickStats, setQuickStats] = useState<DashboardQuickStats | null>(null);
  const { user, loading, logout } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadQuickStats = async () => {
      try {
        const result = await dashboardApi.quickStats();
        if (active) setQuickStats(result);
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
      toast.success("Tizimdan chiqildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logout bajarilmadi");
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#0f172a]">
        <LoadingState label="Sessiya tekshirilmoqda..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0f172a] dark:text-slate-100 lg:grid lg:grid-cols-[288px_1fr]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        quickStats={quickStats}
      />
      <div className="min-w-0">
        <Header
          user={user}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          quickStats={quickStats}
        />
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
