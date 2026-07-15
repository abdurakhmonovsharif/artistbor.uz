import axios, { AxiosError } from "axios";
import type { ApiEnvelope } from "@/types/api";
import { isRecord } from "@/lib/utils";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.artistbor.uz";

export const ADMIN_AUTH_PREVIEW_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ADMIN_AUTH_PREVIEW === "true";

export type ApiError = Error & {
  status?: number;
  errors?: unknown;
};

export const apiClient = axios.create({
  baseURL: typeof window === "undefined" ? API_BASE_URL : "/api/admin-proxy",
  headers: {
    Accept: "application/json",
  },
});

export const authClient = axios.create({
  baseURL: "/api/admin-auth",
  headers: {
    Accept: "application/json",
  },
});

const responseErrorInterceptor = (error: AxiosError<ApiEnvelope<unknown>>) => {
  const apiError = new Error(resolveErrorMessage(error)) as ApiError;
  apiError.status = error.response?.status;
  apiError.errors = error.response?.data?.errors;
  if (
    apiError.status === 401 &&
    typeof window !== "undefined" &&
    !ADMIN_AUTH_PREVIEW_ENABLED &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.href = "/login";
  }
  return Promise.reject(apiError);
};

apiClient.interceptors.response.use(
  (response) => response,
  responseErrorInterceptor,
);

authClient.interceptors.response.use(
  (response) => response,
  responseErrorInterceptor,
);

function resolveErrorMessage(error: AxiosError<ApiEnvelope<unknown>>) {
  const data = error.response?.data;
  if (typeof data?.message === "string") return data.message;
  if (isRecord(data?.errors)) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return error.message || "API so'rov bajarilmadi";
}

export function unwrapData<T>(payload: unknown): T {
  if (isRecord(payload) && "success" in payload && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}
