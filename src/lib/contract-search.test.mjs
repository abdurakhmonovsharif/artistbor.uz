import assert from "node:assert/strict";
import test from "node:test";

import { resolveContractSearch } from "./contract-search.ts";

test("contract search routes ORD public IDs to the order contract endpoint", () => {
  assert.deepEqual(resolveContractSearch(" ord-1024 "), { kind: "order", id: 1024 });
});

test("contract search routes CNT public IDs to the contract detail endpoint", () => {
  assert.deepEqual(resolveContractSearch("CNT-000001"), { kind: "contract", id: 1 });
});

test("contract search ignores incomplete or unsupported values", () => {
  assert.equal(resolveContractSearch("ORD-"), null);
  assert.equal(resolveContractSearch("USR-583"), null);
  assert.equal(resolveContractSearch("CNT-000000"), null);
});
