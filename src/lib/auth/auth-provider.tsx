"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentAdmin, login as loginRequest, logout as logoutRequest } from "@/lib/api/auth";
import { ADMIN_AUTH_PREVIEW_ENABLED, getToken } from "@/lib/api/client";
import type { User } from "@/types/api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const previewAdmin: User = {
  id: 0,
  first_name: "Preview",
  last_name: "Admin",
  phone: "+998 preview",
  role: "admin",
  status: 1,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      if (ADMIN_AUTH_PREVIEW_ENABLED) {
        setUser(previewAdmin);
        setLoading(false);
        if (pathname.startsWith("/login")) router.replace("/admin");
        return;
      }
      setUser(null);
      setLoading(false);
      if (!pathname.startsWith("/login")) router.replace("/login");
      return;
    }
    try {
      const current = await getCurrentAdmin();
      setUser(current);
    } catch {
      setUser(null);
      if (!pathname.startsWith("/login")) router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const result = await loginRequest({ phone, password });
      if (result.user) {
        setUser(result.user);
      } else {
        const current = await getCurrentAdmin();
        setUser(current);
      }
      router.replace("/admin");
    },
    [router],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
