import { authClient, unwrapData } from "@/lib/api/client";
import { normalizeAuthUser } from "@/lib/api/auth-normalize";
import { getCurrentDashboardLocale, getDashboardApiError } from "@/lib/i18n/dashboard-copy";
import type { User } from "@/types/api";

export type LoginPayload = {
  phone: string;
  password: string;
  rememberDevice?: boolean;
};

export type LoginResponse = {
  user: User;
};

export async function login(payload: LoginPayload) {
  const response = await authClient.post("/login", payload);
  const data = unwrapData<unknown>(response.data);
  const user = normalizeAuthUser(data);
  if (!user) throw new Error(getDashboardApiError("adminProfileMissing", getCurrentDashboardLocale()));
  return { user } as LoginResponse;
}

export async function getCurrentAdmin() {
  const response = await authClient.get("/me");
  const data = unwrapData<unknown>(response.data);
  const user = normalizeAuthUser(data);
  if (!user) throw new Error(getDashboardApiError("adminProfileMissing", getCurrentDashboardLocale()));
  return user;
}

export async function logout() {
  await authClient.post("/logout");
}
