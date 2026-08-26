import assert from "node:assert/strict";
import test from "node:test";
import { buildDistrictPayload, buildRegionPayload } from "./location-management.ts";

test("buildRegionPayload trims localized names and uses safe defaults", () => {
  assert.deepEqual(
    buildRegionPayload({
      name_uz: "  Toshkent  ",
      name_ru: "  Ташкент ",
      name_en: " ",
      sort_order: "2",
      status: "1",
    }),
    {
      payload: {
        name_uz: "Toshkent",
        name_ru: "Ташкент",
        sort_order: 2,
        status: 1,
      },
    },
  );
});

test("buildDistrictPayload requires a region and a valid nonnegative sort order", () => {
  assert.deepEqual(
    buildDistrictPayload({
      region_id: "",
      name_uz: "Chilonzor",
      name_ru: "",
      name_en: "",
      sort_order: "0",
      status: "1",
    }),
    { error: "regionRequired" },
  );

  assert.deepEqual(
    buildDistrictPayload({
      region_id: "1",
      name_uz: "Chilonzor",
      name_ru: "",
      name_en: "",
      sort_order: "-1",
      status: "1",
    }),
    { error: "sortOrderInvalid" },
  );
});
