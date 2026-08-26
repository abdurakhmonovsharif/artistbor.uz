import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVerifyPaymentPayload,
  canSubmitVerifyPayment,
  isPartialPaymentApiError,
} from "./order-payment-verification.ts";

test("regular verification never opts into partial payment", () => {
  assert.deepEqual(buildVerifyPaymentPayload(501), { payment_id: 501 });
});

test("partial payment override adds the explicit API flag", () => {
  assert.deepEqual(buildVerifyPaymentPayload(501, true), {
    payment_id: 501,
    allow_partial: true,
  });
});

test("partial payment override requires the dedicated confirmation state", () => {
  assert.equal(canSubmitVerifyPayment("verify-payment", false), true);
  assert.equal(canSubmitVerifyPayment("verify-payment", true), false);
  assert.equal(canSubmitVerifyPayment("confirm-partial-payment", false), false);
  assert.equal(canSubmitVerifyPayment("confirm-partial-payment", true), true);
});

test("only a 422 PARTIAL_PAYMENT response opens the override flow", () => {
  const localizedPartialPaymentError = Object.assign(
    new Error("To'langan summa kutilgan summadan kam."),
    { status: 422, code: "PARTIAL_PAYMENT" },
  );
  const partialPaymentError = Object.assign(
    new Error("PARTIAL_PAYMENT: paid 300000, expected 600000"),
    { status: 422 },
  );
  const unrelatedValidationError = Object.assign(
    new Error("Validation failed"),
    { status: 422 },
  );
  const wrongStatus = Object.assign(
    new Error("PARTIAL_PAYMENT"),
    { status: 409 },
  );

  assert.equal(isPartialPaymentApiError(localizedPartialPaymentError), true);
  assert.equal(isPartialPaymentApiError(partialPaymentError), true);
  assert.equal(isPartialPaymentApiError(unrelatedValidationError), false);
  assert.equal(isPartialPaymentApiError(wrongStatus), false);
  assert.equal(isPartialPaymentApiError(new Error("PARTIAL_PAYMENT")), false);
});
