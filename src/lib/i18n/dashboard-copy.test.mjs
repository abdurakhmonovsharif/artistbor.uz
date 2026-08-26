import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("./dashboard-copy.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const testableSource = source.replace(
  /import \{[\s\S]*?\} from "\.\/translations";/,
  `const defaultLocale = "uz";
const localeStorageKey = "artistbor_admin_locale";
const isLocale = (value) => value === "uz" || value === "ru";`,
);
const compiled = ts.transpileModule(testableSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const catalog = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("numeric status values are resolved by domain", () => {
  assert.equal(catalog.getDashboardStatus("account", 20, "uz").label, "Bloklangan");
  assert.equal(catalog.getDashboardStatus("application", 20, "uz").label, "Tasdiqlangan");
  assert.equal(catalog.getDashboardStatus("order", 20, "uz").label, "To‘lov kutilmoqda");
  assert.equal(catalog.getDashboardStatus("payment", 20, "uz").label, "To‘langan");
});

test("order verification and rejection statuses are localized", () => {
  assert.deepEqual(catalog.getDashboardStatus("order", 25, "ru"), {
    key: "payment_verification",
    label: "Чек проверяется",
    tone: "warning",
  });
  assert.equal(catalog.getDashboardStatus("order", 35, "uz").label, "Rad etilgan");
});

test("notification and error catalogs retain UZ/RU parity", () => {
  assert.equal(Object.keys(catalog.dashboardNotificationCatalog).length, 52);
  assert.equal(Object.keys(catalog.dashboardApiErrorCatalog).length, 28);

  for (const item of Object.values(catalog.dashboardNotificationCatalog)) {
    assert.ok(item.uz);
    assert.ok(item.ru);
  }
  for (const item of Object.values(catalog.dashboardApiErrorCatalog)) {
    assert.ok(item.uz);
    assert.ok(item.ru);
  }
});

test("known backend error codes are converted to the active locale", () => {
  assert.deepEqual(catalog.resolveKnownApiError(["PARTIAL_PAYMENT"], "ru"), {
    code: "PARTIAL_PAYMENT",
    message: "Оплаченная сумма меньше ожидаемой.",
  });
  assert.deepEqual(catalog.resolveKnownApiError([{ code: "SESSION_INVALID" }], "uz"), {
    code: "SESSION_INVALID",
    message: "Sessiyani tasdiqlab bo‘lmadi. Qayta kiring.",
  });
  assert.deepEqual(catalog.resolveKnownApiError(["LOGIN_FAILED"], "ru"), {
    code: "LOGIN_FAILED",
    message: "Не удалось войти в систему.",
  });
});

test("unknown status values never leak raw backend labels", () => {
  assert.deepEqual(catalog.getDashboardStatus("order", "SOME_NEW_BACKEND_STATUS", "ru"), {
    key: "unknown",
    label: "Неизвестно",
    tone: "neutral",
  });
});
