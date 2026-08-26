import assert from "node:assert/strict";
import test from "node:test";

import { positiveInteger } from "./admin-action-validation.ts";
import { buildArtistBusySlotPayload } from "./artist-busy-slot.ts";
import {
  formatSignedMoneyInput,
  positiveMoneyAmount,
} from "./money-format.ts";

test("order confirmation accepts only a positive total price", () => {
  assert.equal(positiveMoneyAmount("1 500 000"), 1_500_000);
  assert.equal(positiveMoneyAmount(250_000), 250_000);
  assert.equal(positiveMoneyAmount(""), null);
  assert.equal(positiveMoneyAmount("0"), null);
  assert.equal(positiveMoneyAmount("-1"), null);
  assert.equal(positiveMoneyAmount("not-a-price"), null);
  assert.equal(formatSignedMoneyInput("-1"), "-1");
});

test("order confirmation accepts only positive whole deadline minutes", () => {
  assert.equal(positiveInteger("30"), 30);
  assert.equal(positiveInteger(1), 1);
  assert.equal(positiveInteger(""), null);
  assert.equal(positiveInteger("0"), null);
  assert.equal(positiveInteger("0.5"), null);
  assert.equal(positiveInteger("1.5"), null);
});

test("busy-slot request maps the optional comment to note", () => {
  assert.deepEqual(
    buildArtistBusySlotPayload({
      date: "2026-08-14",
      startTime: "09:00",
      endTime: "12:00",
      note: "  Shaxsiy ish  ",
    }),
    {
      date: "2026-08-14",
      time_from: "09:00",
      time_to: "12:00",
      note: "Shaxsiy ish",
    },
  );
});

test("busy-slot request omits an empty note and never sends reason", () => {
  const payload = buildArtistBusySlotPayload({
    date: "2026-08-14",
    startTime: "09:00",
    endTime: "12:00",
    note: "   ",
  });

  assert.deepEqual(payload, {
    date: "2026-08-14",
    time_from: "09:00",
    time_to: "12:00",
  });
  assert.equal("reason" in payload, false);
});
