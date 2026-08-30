import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./artist-profile-display.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const {
  artistProfileBoolean,
  artistProfileCategoryLabels,
  artistProfileCategoryNames,
  artistProfileValue,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`
);

test("uses nested artist profile values when the root artist response is sparse", () => {
  const artist = {
    artistProfile: {
      bio: "Xonanda va boshlovchi",
      birth_date: "1990-01-20",
      is_verified: true,
    },
  };

  assert.equal(artistProfileValue(artist, ["bio"]), "Xonanda va boshlovchi");
  assert.equal(artistProfileValue(artist, ["birth_date"]), "1990-01-20");
  assert.equal(artistProfileBoolean(artist, ["is_verified"]), true);
});

test("uses the nested user profile as a final fallback", () => {
  const artist = {
    user: {
      profile: {
        bio: "User profilidagi bio",
      },
    },
  };

  assert.equal(artistProfileValue(artist, ["bio"]), "User profilidagi bio");
});

test("prefers artist profile metadata and never substitutes a raw card number for its masked value", () => {
  const artist = {
    bio: "Eski bio",
    card_number: "8600123412341234",
    artistProfile: {
      bio: "Yangilangan bio",
    },
  };

  assert.equal(artistProfileValue(artist, ["bio"]), "Yangilangan bio");
  assert.equal(artistProfileValue(artist, ["card_number_masked"]), undefined);
});

test("uses expanded category labels instead of hiding nested categories", () => {
  const artist = {
    artistProfile: {
      artistCategories: [
        { category: { name_uz: "Qiziqchilar", name_ru: "Комики" } },
        { category: { name_uz: "Boshlovchilar", name_ru: "Ведущие" } },
      ],
    },
  };

  assert.deepEqual(artistProfileCategoryNames(artist, "uz"), ["Qiziqchilar", "Boshlovchilar"]);
  assert.deepEqual(artistProfileCategoryNames(artist, "ru"), ["Комики", "Ведущие"]);
});

test("resolves category pivot IDs to catalog labels without exposing IDs", () => {
  const catalog = [
    {
      id: 8,
      name_uz: "Qiziqchilar",
      name_ru: "Комики",
      sub_categories: [{ id: 14, name_uz: "Stand-up komiklar", name_ru: "Стендап-комики" }],
    },
  ];

  const artists = [
    { artistProfile: { artistCategories: [{ id: 901, category_id: 14 }] } },
    { profile: { category_ids: [14] } },
    { user: { profile: { artistCategories: [{ id: 901, category: { id: 14 } }] } } },
  ];

  artists.forEach((artist) => {
    assert.deepEqual(artistProfileCategoryLabels(artist, catalog, "uz"), ["Qiziqchilar — Stand-up komiklar"]);
    assert.deepEqual(artistProfileCategoryLabels(artist, catalog, "ru"), ["Комики — Стендап-комики"]);
    assert.deepEqual(artistProfileCategoryLabels(artist, [], "uz"), []);
  });
});
