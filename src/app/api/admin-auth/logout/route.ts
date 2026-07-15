import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";
import { clearAdminSessionToken, getAdminSessionToken } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = await getAdminSessionToken();

  if (token) {
    await fetch(`${API_BASE_URL}/v1/admin/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  await clearAdminSessionToken();
  return NextResponse.json({ success: true });
}
