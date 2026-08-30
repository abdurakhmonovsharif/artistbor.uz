import type { ArtistProfile, UnknownRecord } from "@/types/api";

type ArtistProfileSource = UnknownRecord;

const ARTIST_CATEGORY_RELATION_KEYS = ["categories", "category", "artistCategories", "artist_categories"];
const ARTIST_CATEGORY_VALUE_KEYS = [
  ...ARTIST_CATEGORY_RELATION_KEYS,
  "category_ids",
  "category_id",
  "categoryIds",
  "categoryId",
];
const CATEGORY_CHILD_KEYS = ["sub_categories", "subCategories", "children"];

export function artistProfileValue(artist: ArtistProfile, keys: string[]): unknown {
  for (const source of artistProfileSources(artist)) {
    for (const key of keys) {
      const value = source[key];
      if (hasMeaningfulValue(value)) return value;
    }
  }

  return undefined;
}

export function artistProfileBoolean(artist: ArtistProfile, keys: string[]): boolean | undefined {
  const value = artistProfileValue(artist, keys);
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return undefined;
}

export function artistProfileCategoryNames(artist: ArtistProfile, locale: "uz" | "ru"): string[] {
  const names = new Set<string>();

  for (const source of artistProfileSources(artist)) {
    for (const key of ARTIST_CATEGORY_RELATION_KEYS) {
      collectCategoryNames(source[key], locale, names);
    }
  }

  return [...names];
}

export function artistProfileCategoryLabels(
  artist: ArtistProfile,
  categoryCatalog: readonly unknown[],
  locale: "uz" | "ru",
): string[] {
  const labelsById = categoryCatalogLabels(categoryCatalog, locale);
  const catalogLabels = artistProfileCategoryIds(artist)
    .map((id) => labelsById.get(id))
    .filter((label): label is string => Boolean(label));

  if (catalogLabels.length) return [...new Set(catalogLabels)];

  return artistProfileCategoryNames(artist, locale);
}

function artistProfileSources(artist: ArtistProfile): ArtistProfileSource[] {
  const record = artist as UnknownRecord;
  const user = asRecord(record.user);
  return [
    asRecord(record.artistProfile),
    asRecord(record.artist_profile),
    record,
    asRecord(record.profile),
    user,
    user ? asRecord(user.profile) : undefined,
  ].filter((source): source is ArtistProfileSource => Boolean(source));
}

function collectCategoryNames(value: unknown, locale: "uz" | "ru", names: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCategoryNames(item, locale, names));
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const nestedCategory = asRecord(record.category);
  if (nestedCategory) {
    collectCategoryNames(nestedCategory, locale, names);
    return;
  }

  const name = categoryName(record, locale);
  if (name) names.add(name);
}

function artistProfileCategoryIds(artist: ArtistProfile): string[] {
  const ids = new Set<string>();

  for (const source of artistProfileSources(artist)) {
    for (const key of ARTIST_CATEGORY_VALUE_KEYS) {
      collectCategoryIds(source[key], ids);
    }
  }

  return [...ids];
}

function collectCategoryIds(value: unknown, ids: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCategoryIds(item, ids));
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    const id = String(value).trim();
    if (id) ids.add(id);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const nestedCategory = asRecord(record.category);
  if (nestedCategory) {
    collectCategoryIds(nestedCategory, ids);
    return;
  }

  const id = record.category_id ?? record.categoryId ?? record.id;
  if (typeof id === "string" || typeof id === "number") {
    const normalizedId = String(id).trim();
    if (normalizedId) ids.add(normalizedId);
  }
}

function categoryCatalogLabels(categoryCatalog: readonly unknown[], locale: "uz" | "ru") {
  const labelsById = new Map<string, string>();
  categoryCatalog.forEach((category) => collectCatalogCategoryLabels(category, locale, labelsById));
  return labelsById;
}

function collectCatalogCategoryLabels(
  value: unknown,
  locale: "uz" | "ru",
  labelsById: Map<string, string>,
  parentLabel?: string,
) {
  const record = asRecord(value);
  if (!record) return;

  const name = categoryName(record, locale);
  const id = record.id;
  const label = name ? (parentLabel ? `${parentLabel} — ${name}` : name) : parentLabel;

  if ((typeof id === "string" || typeof id === "number") && label) {
    labelsById.set(String(id), label);
  }

  for (const key of CATEGORY_CHILD_KEYS) {
    const children = record[key];
    if (Array.isArray(children)) {
      children.forEach((child) => collectCatalogCategoryLabels(child, locale, labelsById, label));
    }
  }
}

function categoryName(record: UnknownRecord, locale: "uz" | "ru") {
  const preferred = locale === "ru" ? record.name_ru : record.name_uz;
  const name = preferred ?? record.name_uz ?? record.name_ru ?? record.name_en ?? record.name ?? record.title;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : undefined;
}

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
