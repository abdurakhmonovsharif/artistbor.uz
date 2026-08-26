import assert from "node:assert/strict";
import test from "node:test";

import {
  findOverlappingArtistAvailabilityInterval,
  formatArtistAvailabilityMonth,
  getArtistAvailabilityOrderPublicId,
  isEditableArtistAvailabilitySource,
  isVisibleArtistAvailabilityRecord,
} from "./artist-availability.ts";

test("expired holds are excluded from the supplied two-day availability response", () => {
  const availability = {
    "2026-08-26": [
      { id: 52, source: "hold", is_expired: true },
      { id: 55, source: "hold", is_expired: true },
      { id: 53, source: "hold", is_expired: true },
      { id: 54, source: "hold", is_expired: true },
    ],
    "2026-08-27": [
      { id: 56, source: "hold", is_expired: true },
      { id: 57, source: "order", is_expired: false },
    ],
  };

  const visibleByDate = Object.fromEntries(
    Object.entries(availability).map(([date, rows]) => [
      date,
      rows.filter(isVisibleArtistAvailabilityRecord),
    ]),
  );

  assert.deepEqual(visibleByDate["2026-08-26"], []);
  assert.deepEqual(visibleByDate["2026-08-27"].map((row) => row.id), [57]);
});

test("active holds and confirmed orders remain visible", () => {
  assert.equal(
    isVisibleArtistAvailabilityRecord({
      id: 58,
      source: "hold",
      is_expired: false,
    }),
    true,
  );
  assert.equal(
    isVisibleArtistAvailabilityRecord({
      id: 57,
      source: "order",
      expires_at: null,
      is_expired: false,
    }),
    true,
  );
});

test("calendar month title stays in the selected local month", () => {
  const august = new Date(2026, 7, 1);

  assert.equal(formatArtistAvailabilityMonth(august, "uz"), "avgust 2026");
  assert.equal(formatArtistAvailabilityMonth(august, "ru"), "август 2026");
});

test("only manually created availability can be edited in the dashboard", () => {
  assert.equal(isEditableArtistAvailabilitySource("manual"), true);
  assert.equal(isEditableArtistAvailabilitySource("order"), false);
  assert.equal(isEditableArtistAvailabilitySource("hold"), false);
});

test("availability overlap is detected only inside the same date", () => {
  const intervals = [
    { id: 57, date: "2026-08-27", startTime: "18:00:00", endTime: "20:00:00" },
  ];

  assert.equal(
    findOverlappingArtistAvailabilityInterval(
      { date: "2026-08-27", startTime: "19:00", endTime: "21:00" },
      intervals,
    )?.id,
    57,
  );
  assert.equal(
    findOverlappingArtistAvailabilityInterval(
      { date: "2026-08-28", startTime: "19:00", endTime: "21:00" },
      intervals,
    ),
    undefined,
  );
});

test("adjacent availability intervals are allowed", () => {
  const intervals = [
    { id: 57, date: "2026-08-27", startTime: "18:00:00", endTime: "20:00:00" },
  ];

  assert.equal(
    findOverlappingArtistAvailabilityInterval(
      { date: "2026-08-27", startTime: "16:00", endTime: "18:00" },
      intervals,
    ),
    undefined,
  );
  assert.equal(
    findOverlappingArtistAvailabilityInterval(
      { date: "2026-08-27", startTime: "20:00", endTime: "22:00" },
      intervals,
    ),
    undefined,
  );
});

test("editing a manual interval excludes its current record from overlap validation", () => {
  const intervals = [
    { id: 91, date: "2026-08-27", startTime: "09:00:00", endTime: "12:00:00" },
  ];

  assert.equal(
    findOverlappingArtistAvailabilityInterval(
      { date: "2026-08-27", startTime: "10:00", endTime: "13:00" },
      intervals,
      91,
    ),
    undefined,
  );
});

test("availability order references resolve to the dashboard public ID", () => {
  assert.equal(getArtistAvailabilityOrderPublicId({ order_id: 43 }), "ORD-43");
  assert.equal(getArtistAvailabilityOrderPublicId({ order_public_id: "ord-0043" }), "ORD-0043");
  assert.equal(
    getArtistAvailabilityOrderPublicId({ note: "Tasdiqlangan Order #ORD-43" }),
    "ORD-43",
  );
  assert.equal(
    getArtistAvailabilityOrderPublicId({ order: { public_id: "ORD-91" } }),
    "ORD-91",
  );
  assert.equal(getArtistAvailabilityOrderPublicId({ order_id: 0 }), undefined);
  assert.equal(getArtistAvailabilityOrderPublicId({ source: "manual" }), undefined);
});
