"use client";

import { useState } from "react";
import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth/auth-provider";
import { useToast } from "@/components/ui/toast";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const toast = useToast();

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
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <LoadingState label="Sessiya tekshirilmoqda..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#080b12] dark:text-white lg:grid lg:grid-cols-[288px_1fr]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
      <div className="min-w-0">
        <Header user={user} onOpenSidebar={() => setSidebarOpen(true)} onLogout={handleLogout} />
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

