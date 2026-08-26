import { NextResponse } from "next/server";
import { API_BASE_URL, unwrapData } from "@/lib/api/client";
import { getStringValue, normalizeAuthUser } from "@/lib/api/auth-normalize";
import { setAdminSessionToken } from "@/lib/auth/server-session";
import { canAccessAdminPanel } from "@/lib/auth/permissions";
import { isRecord } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LoginRequestBody = {
  phone?: unknown;
  password?: unknown;
  rememberDevice?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rememberDevice = body?.rememberDevice === true;

  if (!phone || !password) {
    return NextResponse.json({ code: "LOGIN_REQUIRED", message: "Telefon va parol majburiy" }, { status: 400 });
  }

  const backendResponse = await fetch(`${API_BASE_URL}/v1/admin/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, password }),
    cache: "no-store",
  });

  const payload = await readBackendPayload(backendResponse);
  if (!backendResponse.ok) {
    return NextResponse.json({ ...toClientError(payload, "Login bajarilmadi"), code: "LOGIN_FAILED" }, {
      status: backendResponse.status,
    });
  }

  const data = unwrapData<unknown>(payload);
  const token = getStringValue(data, "token") ?? getStringValue(data, "access_token");
  const user = normalizeAuthUser(data);

  if (!token || !user) {
    return NextResponse.json({ code: "AUTH_RESPONSE_INVALID", message: "Auth javobi to'liq emas" }, { status: 502 });
  }

  if (!canAccessAdminPanel(user.role)) {
    return NextResponse.json({ code: "PANEL_ACCESS_DENIED", message: "Bu panelga kirish huquqi yo'q" }, { status: 403 });
  }

  await setAdminSessionToken(token, rememberDevice);
  return NextResponse.json({ user });
}

async function readBackendPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  const text = await response.text().catch(() => "");
  return text ? { message: text } : null;
}

function toClientError(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.message === "string") {
    return { message: payload.message, errors: payload.errors };
  }
  return { message: fallback };
}
