import "server-only";

import { cookies } from "next/headers";
import { ADMIN_REMEMBER_DEVICE_MAX_AGE_SECONDS, ADMIN_SESSION_COOKIE } from "@/lib/auth/session-cookie";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function getAdminSessionToken() {
  return (await cookies()).get(ADMIN_SESSION_COOKIE)?.value ?? null;
}

export async function setAdminSessionToken(token: string, rememberDevice: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    ...cookieOptions,
    ...(rememberDevice ? { maxAge: ADMIN_REMEMBER_DEVICE_MAX_AGE_SECONDS } : {}),
  });
}

export async function clearAdminSessionToken() {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}
