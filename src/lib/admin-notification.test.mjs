import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSendAllNotificationPayload,
  buildTargetedNotificationPayload,
} from "./admin-notification.ts";

const base = {
  title: "Eslatma",
  message: "Buyurtmani tekshiring",
  type: "order",
  data: '{"order_id":43}',
};

test("targeted notifications reject an empty audience", () => {
  assert.deepEqual(
    buildTargetedNotificationPayload({
      ...base,
      role: "",
      region_id: "",
      district_id: "",
    }),
    { error: "target_required" },
  );
});

test("targeted notifications map role and location IDs to the live API contract", () => {
  assert.deepEqual(
    buildTargetedNotificationPayload({
      ...base,
      role: "artist",
      region_id: "3",
      district_id: "17",
    }),
    {
      payload: {
        title: "Eslatma",
        message: "Buyurtmani tekshiring",
        type: "order",
        role: "artist",
        region_id: 3,
        district_id: 17,
        data: { order_id: 43 },
      },
    },
  );
});

test("notification data accepts only a JSON object", () => {
  assert.deepEqual(
    buildSendAllNotificationPayload({ ...base, data: "[1,2]" }),
    { error: "data_json_object" },
  );
  assert.deepEqual(
    buildSendAllNotificationPayload({ ...base, data: "{" }),
    { error: "data_json_invalid" },
  );
});
