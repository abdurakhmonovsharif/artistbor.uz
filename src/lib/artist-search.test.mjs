import assert from "node:assert/strict";
import test from "node:test";

import { resolveArtistIdSearch } from "./artist-search.ts";

test("artist public ID search accepts the ART prefix", () => {
  assert.equal(resolveArtistIdSearch(" art-00075 "), 75);
});

test("artist public ID search ignores names and unsupported prefixes", () => {
  assert.equal(resolveArtistIdSearch("Sardor"), null);
  assert.equal(resolveArtistIdSearch("USR-75"), null);
  assert.equal(resolveArtistIdSearch("ART-000000"), null);
});
