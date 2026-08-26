import { NextResponse } from "next/server";
import { API_BASE_URL, unwrapData } from "@/lib/api/client";
import { normalizeAuthUser } from "@/lib/api/auth-normalize";
import { clearAdminSessionToken, getAdminSessionToken } from "@/lib/auth/server-session";
import { canAccessAdminPanel } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = await getAdminSessionToken();
  if (!token) return NextResponse.json({ code: "SESSION_MISSING", message: "Sessiya topilmadi" }, { status: 401 });

  const backendResponse = await fetch(`${API_BASE_URL}/v1/admin/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await backendResponse.json().catch(() => null);
  if (!backendResponse.ok) {
    if (backendResponse.status === 401) await clearAdminSessionToken();
    return NextResponse.json({ code: "SESSION_INVALID", message: "Sessiya tasdiqlanmadi" }, { status: backendResponse.status });
  }

  const user = normalizeAuthUser(unwrapData<unknown>(payload));
  if (!user) return NextResponse.json({ code: "ADMIN_PROFILE_MISSING", message: "Admin profil ma'lumotlari topilmadi" }, { status: 502 });
  if (!canAccessAdminPanel(user.role)) {
    await clearAdminSessionToken();
    return NextResponse.json({ code: "PANEL_ACCESS_DENIED", message: "Bu panelga kirish huquqi yo'q" }, { status: 403 });
  }

  return NextResponse.json({ user });
}
