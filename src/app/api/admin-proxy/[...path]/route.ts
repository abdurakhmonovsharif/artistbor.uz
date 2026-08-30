import { NextResponse } from "next/server";
import { API_BASE_URL, unwrapData } from "@/lib/api/client";
import { normalizeAuthUser } from "@/lib/api/auth-normalize";
import { canUseAdminAction, type AdminAction } from "@/lib/auth/permissions";
import { clearAdminSessionToken, getAdminSessionToken } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

type ProxyContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: ProxyContext) {
  return proxyAdminRequest(request, context);
}

export async function POST(request: Request, context: ProxyContext) {
  return proxyAdminRequest(request, context);
}

export async function PUT(request: Request, context: ProxyContext) {
  return proxyAdminRequest(request, context);
}

export async function PATCH(request: Request, context: ProxyContext) {
  return proxyAdminRequest(request, context);
}

export async function DELETE(request: Request, context: ProxyContext) {
  return proxyAdminRequest(request, context);
}

async function proxyAdminRequest(request: Request, context: ProxyContext) {
  const token = await getAdminSessionToken();
  if (!token) return NextResponse.json({ code: "SESSION_MISSING", message: "Sessiya topilmadi" }, { status: 401 });

  const { path } = await context.params;
  if (!isAllowedAdminPath(path)) {
    return NextResponse.json({ code: "ENDPOINT_FORBIDDEN", message: "Endpoint ruxsat etilmagan" }, { status: 403 });
  }

  const requiredAction = getRequiredAdminAction(path);
  const authorization = requiredAction ? await authorizeAdminAction(token, requiredAction) : "allowed";
  if (authorization !== "allowed") {
    return NextResponse.json(
      authorization === "unauthenticated"
        ? { code: "SESSION_INVALID", message: "Sessiya tasdiqlanmadi" }
        : { code: "ACTION_FORBIDDEN", message: "Bu amal uchun ruxsat yo'q" },
      { status: authorization === "unauthenticated" ? 401 : 403 },
    );
  }

  const targetUrl = new URL(`${API_BASE_URL}/${path.map(encodeURIComponent).join("/")}`);
  const requestUrl = new URL(request.url);
  targetUrl.search = requestUrl.search;

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, token),
    body: shouldForwardBody(request.method) ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  if (backendResponse.status === 401) await clearAdminSessionToken();

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: buildResponseHeaders(backendResponse),
  });
}

function isAllowedAdminPath(path: string[]) {
  return path[0] === "v1" && path[1] === "admin";
}

function getRequiredAdminAction(path: string[]): AdminAction | null {
  const isArtistQuotaPath =
    path[0] === "v1" &&
    path[1] === "admin" &&
    path[2] === "artist" &&
    /^\d+$/.test(path[3]) &&
    path[4] === "quota";

  return isArtistQuotaPath ? "artistQuotaManage" : null;
}

async function authorizeAdminAction(
  token: string,
  action: AdminAction,
): Promise<"allowed" | "forbidden" | "unauthenticated"> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/admin/auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      await clearAdminSessionToken();
      return "unauthenticated";
    }
    if (!response.ok) return "forbidden";

    const payload = await response.json().catch(() => null);
    const user = normalizeAuthUser(unwrapData<unknown>(payload));
    return user && canUseAdminAction(user.role, action) ? "allowed" : "forbidden";
  } catch {
    return "forbidden";
  }
}

function shouldForwardBody(method: string) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

function buildForwardHeaders(request: Request, token: string) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", accept || "application/json");
  if (contentType) headers.set("Content-Type", contentType);

  return headers;
}

function buildResponseHeaders(response: Response) {
  const headers = new Headers();
  for (const header of ["content-type", "content-disposition", "cache-control"]) {
    const value = response.headers.get(header);
    if (value) headers.set(header, value);
  }
  return headers;
}
