import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const table = readFileSync(new URL("../../../components/admin/artist-quotas/artist-quota-table.tsx", import.meta.url), "utf8");
const drawer = readFileSync(new URL("../../../components/admin/artist-quotas/artist-quota-drawer.tsx", import.meta.url), "utf8");

test("quota filters debounce automatically and Enter applies immediately", () => {
  assert.match(page, /window\.setTimeout\(applyDraftFilters, 350\)/);
  assert.match(page, /onPressEnter=\{applyDraftFilters\}/);
  assert.doesNotMatch(page, /type="submit"/);
});

test("quota table prioritizes the artist, rule, usage, state, and one action", () => {
  assert.match(table, /artistbor-artists-data-table/);
  assert.match(table, /<QuotaTableHead label=\{labels\.id\} \/>/);
  assert.match(table, /<QuotaTableHead label=\{labels\.total\} \/>/);
  assert.match(table, /<QuotaTableHead label=\{labels\.limit\} \/>/);
  assert.match(table, /<QuotaTableHead label=\{labels\.used\} \/>/);
  assert.match(table, /<QuotaTableHead label=\{labels\.enforced\} \/>/);
  assert.match(table, /row\.publicId \?\? row\.artistId/);
  assert.match(table, /const showRemaining = !isUnlimited/);
  assert.match(table, /\{showRemaining \? <span/);
});

test("quota drawer uses a single-rule editor rather than three competing cards", () => {
  assert.match(drawer, /<AdminDrawer/);
  assert.match(drawer, /size="min\(100vw, 760px\)"/);
  assert.match(drawer, /<QuotaDrawerActions/);
  assert.match(drawer, /space-y-3\.5 p-4/);
  assert.match(drawer, /<fieldset>/);
  assert.match(drawer, /name="quota-limit-mode"/);
});

test("custom quota input uses semantic surfaces and native number controls match the active theme", () => {
  assert.match(drawer, /bg-artistbor-surface-subtle/);
  assert.match(drawer, /focus:bg-artistbor-surface/);
  assert.match(drawer, /\[color-scheme:light\] dark:\[color-scheme:dark\]/);
  assert.doesNotMatch(drawer, /focus:bg-white/);
});
