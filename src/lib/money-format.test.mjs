import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./money-format.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { currencyFromRecord, formatMoneyWithCurrency } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`
);

test("formats API money using the record currency", () => {
  const currency = currencyFromRecord({ currency: "USD" });

  assert.equal(formatMoneyWithCurrency(1050, "uz", currency), "1 050 USD");
});

test("uses UZS only when the API omits a currency", () => {
  const currency = currencyFromRecord({});

  assert.equal(formatMoneyWithCurrency(2000, "uz", currency), "2 000 so'm");
});
