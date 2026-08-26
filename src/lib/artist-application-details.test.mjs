import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLICATION_DETAIL_EXPAND,
  getApplicationCategoryIds,
  getSubmittedApplicationServices,
  normalizeArtistApplication,
} from "./artist-application-details.ts";

test("application detail requests every relation required by the admin drawer", () => {
  assert.equal(
    APPLICATION_DETAIL_EXPAND,
    [
      "user",
      "user.profile",
      "user.region",
      "user.district",
      "region",
      "district",
      "categories",
      "subCategories",
      "applicationServices",
      "applicationServices.service",
    ].join(","),
  );
});

const application = {
  category_ids: [1],
  subCategoryIds: [11],
  categories: [{ id: 2, name_uz: "Boshlovchi" }],
  sub_categories: [{ id: 12, name_uz: "To'y boshlovchisi" }],
  services: [
    {
      service_id: 101,
      price: 2_500_000,
      note: "Toshkent shahri uchun",
      service: { id: 101, name_uz: "To'y marosimi" },
    },
  ],
};

test("application detail keeps submitted category and subcategory relations", () => {
  assert.deepEqual(getApplicationCategoryIds(application, "category"), [1, 2]);
  assert.deepEqual(getApplicationCategoryIds(application, "subcategory"), [11, 12]);
});

test("application detail keeps only the services submitted with the application", () => {
  const services = getSubmittedApplicationServices(application);

  assert.equal(services.length, 1);
  assert.equal(services[0].service_id, 101);
  assert.equal(services[0].price, 2_500_000);
  assert.equal(services[0].note, "Toshkent shahri uchun");
});

test("application detail accepts API aliases and relation records", () => {
  const aliasedApplication = {
    categoryIds: ["3", 3],
    subCategory: { category_id: "31", id: 999 },
    applicationServices: [{ serviceId: "301", price: "900000", note: "Bir soat" }],
  };

  assert.deepEqual(getApplicationCategoryIds(aliasedApplication, "category"), [3]);
  assert.deepEqual(getApplicationCategoryIds(aliasedApplication, "subcategory"), [31]);
  assert.equal(getSubmittedApplicationServices(aliasedApplication)[0].service_id, 301);
});

test("a sparse detail response does not erase fields already loaded in the list", () => {
  const normalized = normalizeArtistApplication({ id: 7, user: { id: 5 } });

  assert.equal("category_ids" in normalized, false);
  assert.equal("sub_category_ids" in normalized, false);
  assert.equal("services" in normalized, false);
});
