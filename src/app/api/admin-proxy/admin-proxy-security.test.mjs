import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxy = readFileSync(new URL("./[...path]/route.ts", import.meta.url), "utf8");
const permissions = readFileSync(new URL("../../../lib/auth/permissions.ts", import.meta.url), "utf8");

test("artist quota proxy requests revalidate the caller role before forwarding", () => {
  assert.match(proxy, /function getRequiredAdminAction/);
  assert.match(proxy, /path\[2\] === "artist"/);
  assert.match(proxy, /path\[4\] === "quota"/);
  assert.match(proxy, /return isArtistQuotaPath \? "artistQuotaManage" : null/);
  assert.match(proxy, /fetch\(`\$\{API_BASE_URL\}\/v1\/admin\/auth\/me`/);
  assert.match(proxy, /canUseAdminAction\(user\.role, action\)/);
  assert.match(proxy, /code: "ACTION_FORBIDDEN"/);
});

test("artist quota routes and mutations remain admin-only in the dashboard", () => {
  assert.match(permissions, /\{ path: "\/admin\/artist-quotas", roles: \[ADMIN_ROLE\] \}/);
  assert.match(permissions, /artistQuotaManage: \[ADMIN_ROLE\]/);
});
