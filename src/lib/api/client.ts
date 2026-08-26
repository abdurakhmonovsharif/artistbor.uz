import axios, { AxiosError } from "axios";
import type { ApiEnvelope } from "@/types/api";
import {
  getCurrentDashboardLocale,
  getDashboardApiError,
  resolveKnownApiError,
} from "@/lib/i18n/dashboard-copy";
import { isRecord } from "@/lib/utils";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.artistbor.uz";

export const ADMIN_AUTH_PREVIEW_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ADMIN_AUTH_PREVIEW === "true";

export type ApiError = Error & {
  status?: number;
  errors?: unknown;
  code?: string;
  backendMessage?: string;
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

type ApiErrorEnvelope = ApiEnvelope<unknown> & { code?: unknown };

const responseErrorInterceptor = (error: AxiosError<ApiErrorEnvelope>) => {
  const resolved = resolveErrorMessage(error);
  const apiError = new Error(resolved.message) as ApiError;
  apiError.status = error.response?.status;
  apiError.errors = error.response?.data?.errors;
  apiError.code = resolved.code;
  apiError.backendMessage = typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : undefined;
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

function resolveErrorMessage(error: AxiosError<ApiErrorEnvelope>) {
  const data = error.response?.data;
  const locale = getCurrentDashboardLocale();
  const known = resolveKnownApiError([data?.code, data?.message, data?.errors], locale);
  if (known) return known;

  if (error.response?.status === 401) return { code: "SESSION_MISSING", message: getDashboardApiError("sessionMissing", locale) };
  if (error.response?.status === 403) return { code: "ENDPOINT_FORBIDDEN", message: getDashboardApiError("endpointForbidden", locale) };
  if (firstErrorMessage(data?.errors)) return { code: "VALIDATION_FAILED", message: getDashboardApiError("validationFailed", locale) };

  return { message: getDashboardApiError("requestFailed", locale) };
}

function firstErrorMessage(errors: unknown) {
  if (!isRecord(errors)) return undefined;
  const first = Object.values(errors)[0];
  if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  if (typeof first === "string") return first;
  return undefined;
}

export function unwrapData<T>(payload: unknown): T {
  if (isRecord(payload) && "success" in payload && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}
