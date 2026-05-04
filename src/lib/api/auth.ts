import { apiClient, clearToken, setToken, unwrapData } from "@/lib/api/client";
import type { User } from "@/types/api";

export type LoginPayload = {
  phone: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export async function login(payload: LoginPayload) {
  const response = await apiClient.post("/v1/admin/auth/login", payload);
  const data = unwrapData<LoginResponse>(response.data);
  if (data.token) setToken(data.token);
  return data;
}

export async function getCurrentAdmin() {
  const response = await apiClient.get("/v1/admin/auth/me");
  return unwrapData<User>(response.data);
}

export async function logout() {
  try {
    await apiClient.post("/v1/admin/auth/logout");
  } finally {
    clearToken();
  }
}

