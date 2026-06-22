import { apiClient, clearToken, setToken, unwrapData } from "@/lib/api/client";
import { isRecord } from "@/lib/utils";
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
  const data = unwrapData<unknown>(response.data);
  const token = getStringValue(data, "token") ?? getStringValue(data, "access_token") ?? "";
  const user = normalizeAuthUser(data);

  if (token) setToken(token);
  return { token, user } as LoginResponse;
}

export async function getCurrentAdmin() {
  const response = await apiClient.get("/v1/admin/auth/me");
  const data = unwrapData<unknown>(response.data);
  const user = normalizeAuthUser(data);
  if (!user) throw new Error("Admin profil ma'lumotlari topilmadi");
  return user;
}

export async function logout() {
  try {
    await apiClient.post("/v1/admin/auth/logout");
  } finally {
    clearToken();
  }
}

function normalizeAuthUser(payload: unknown): User | null {
  if (!isRecord(payload)) return null;

  if (looksLikeUser(payload)) return normalizeUserRecord(payload);

  for (const key of ["user", "admin", "currentUser", "current_admin", "profile"]) {
    const value = payload[key];
    if (isRecord(value) && looksLikeUser(value)) return normalizeUserRecord(value);
  }

  return null;
}

function normalizeUserRecord(record: Record<string, unknown>): User {
  const profile = isRecord(record.profile) ? record.profile : undefined;

  return {
    id: numberValue(record.id ?? record.user_id ?? profile?.user_id ?? profile?.userId),
    phone: stringValue(record.phone ?? profile?.phone),
    first_name: stringValue(record.first_name ?? record.firstName ?? profile?.first_name ?? profile?.firstName),
    last_name: stringValue(record.last_name ?? record.lastName ?? profile?.last_name ?? profile?.lastName),
    email: stringValue(record.email ?? profile?.email),
    role: roleValue(record.role ?? record.role_id ?? record.roleId),
    region_id: numberValue(record.region_id ?? record.regionId ?? profile?.region_id ?? profile?.regionId),
    district_id: numberValue(record.district_id ?? record.districtId ?? profile?.district_id ?? profile?.districtId),
    status: numberValue(record.status),
    created_at: numberValue(record.created_at ?? record.createdAt),
  };
}

function looksLikeUser(record: Record<string, unknown>) {
  return Boolean(
    record.id ??
      record.user_id ??
      record.phone ??
      record.first_name ??
      record.firstName ??
      record.email ??
      record.role ??
      record.status,
  );
}

function getStringValue(payload: unknown, key: string) {
  if (!isRecord(payload)) return undefined;
  return stringValue(payload[key]);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return undefined;
}

function roleValue(value: unknown): User["role"] {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}
