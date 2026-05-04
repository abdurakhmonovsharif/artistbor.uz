import axios, { AxiosError } from "axios";
import type { ApiEnvelope } from "@/types/api";
import { isRecord } from "@/lib/utils";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.artistbor.uz";

export const TOKEN_KEY = "artistbor_admin_token";
export const ADMIN_AUTH_PREVIEW_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ADMIN_AUTH_PREVIEW === "true";

export type ApiError = Error & {
  status?: number;
  errors?: unknown;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const apiError = new Error(resolveErrorMessage(error)) as ApiError;
    apiError.status = error.response?.status;
    apiError.errors = error.response?.data?.errors;
    if (
      apiError.status === 401 &&
      typeof window !== "undefined" &&
      !ADMIN_AUTH_PREVIEW_ENABLED
    ) {
      window.localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(apiError);
  },
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

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}
