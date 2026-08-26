import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ruleBody(selector) {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

test("shared admin modals expose distinct light and dark theme surfaces", () => {
  assert.match(
    ruleBody(".artistbor-confirm-modal"),
    /--artistbor-modal-surface:\s*#ffffff/,
  );
  assert.match(
    ruleBody(".dark .artistbor-confirm-modal"),
    /--artistbor-modal-surface:\s*#111827/,
  );
  assert.match(
    ruleBody(".artistbor-confirm-modal .ant-modal-content"),
    /background-color:\s*var\(--artistbor-modal-surface\)/,
  );
  assert.match(
    ruleBody(
      ".artistbor-confirm-modal input,\n.artistbor-confirm-modal textarea,\n.artistbor-confirm-modal select",
    ),
    /background-color:\s*var\(--artistbor-modal-field-bg\)/,
  );
  assert.match(
    ruleBody(
      ".artistbor-confirm-modal .ant-modal-body .text-rose-200,\n.artistbor-confirm-modal .ant-modal-body .text-rose-300",
    ),
    /color:\s*var\(--artistbor-modal-danger-text\)/,
  );
});

test("busy-slot modal has light and dark theme-specific surfaces", () => {
  assert.match(
    ruleBody(".artistbor-busy-slot-modal"),
    /--artistbor-busy-slot-surface:\s*#ffffff/,
  );
  assert.match(
    ruleBody(".dark .artistbor-busy-slot-modal"),
    /--artistbor-busy-slot-surface:\s*linear-gradient\(180deg,\s*#0c1424 0%,\s*#091221 100%\)/,
  );
  assert.match(
    ruleBody(".artistbor-busy-slot-modal .ant-modal-content"),
    /background:\s*var\(--artistbor-busy-slot-surface\)/,
  );
  assert.match(
    ruleBody(".artistbor-busy-slot-modal .artistbor-busy-slot-duration"),
    /color:\s*var\(--artistbor-busy-slot-duration-text\)/,
  );
  assert.match(
    ruleBody(".artistbor-busy-slot-modal .artistbor-busy-slot-action--success"),
    /color:\s*var\(--artistbor-busy-slot-success-text\)/,
  );
});
