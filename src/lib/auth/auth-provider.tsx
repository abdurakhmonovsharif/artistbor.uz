"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentAdmin, login as loginRequest, logout as logoutRequest } from "@/lib/api/auth";
import { ADMIN_AUTH_PREVIEW_ENABLED, getToken } from "@/lib/api/client";
import { staffApi, type StaffRole, type UpdateStaffPayload } from "@/lib/api/admin-content";
import type { User } from "@/types/api";

export type AdminProfileUpdatePayload = {
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (payload: AdminProfileUpdatePayload) => Promise<void>;
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
    try {
      await logoutRequest();
    } catch {
      // Local logout must still complete if token revocation fails or the token is already expired.
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  const updateProfile = useCallback(
    async (payload: AdminProfileUpdatePayload) => {
      if (!user?.id) throw new Error("Admin ID topilmadi");

      const updatePayload: UpdateStaffPayload = {
        ...payload,
        role: resolveStaffRole(user.role),
        status: user.status,
      };
      const updated = await staffApi.update(user.id, updatePayload);
      setUser((current) => ({
        ...(current ?? user),
        ...(updated ?? {}),
        first_name: updated?.first_name ?? payload.first_name,
        last_name: updated?.last_name ?? payload.last_name,
        phone: updated?.phone ?? payload.phone,
        email: updated?.email ?? payload.email,
      }));
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, updateProfile }),
    [user, loading, login, logout, refresh, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function resolveStaffRole(role: User["role"]): StaffRole {
  if (role === 20 || role === 25 || role === 30) return role;
  if (role === "20") return 20;
  if (role === "25") return 25;
  if (role === "30") return 30;
  if (role === "operator") return 20;
  if (role === "moderator") return 25;
  return 30;
}
