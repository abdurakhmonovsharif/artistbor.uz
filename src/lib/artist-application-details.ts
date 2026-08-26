export type ApplicationDetailRecord = Record<string, unknown>;

export type SubmittedApplicationService = ApplicationDetailRecord & {
  service_id?: number;
  price?: number | string | null;
  note?: string | null;
};

export const APPLICATION_DETAIL_EXPAND = [
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
].join(",");

const CATEGORY_ID_KEYS = ["category_ids", "categoryIds"];
const CATEGORY_RELATION_KEYS = ["categories", "category", "artist_categories", "artistCategories"];
const SUBCATEGORY_ID_KEYS = ["sub_category_ids", "subCategoryIds", "subcategory_ids", "subcategoryIds"];
const SUBCATEGORY_RELATION_KEYS = [
  "sub_categories",
  "subCategories",
  "subcategories",
  "sub_category",
  "subCategory",
  "subcategory",
];
const SERVICE_KEYS = ["services", "application_services", "applicationServices", "artist_services", "artistServices"];

export function getApplicationCategoryIds(
  application: ApplicationDetailRecord,
  kind: "category" | "subcategory",
) {
  const idKeys = kind === "category" ? CATEGORY_ID_KEYS : SUBCATEGORY_ID_KEYS;
  const relationKeys = kind === "category" ? CATEGORY_RELATION_KEYS : SUBCATEGORY_RELATION_KEYS;
  const ids = [...idKeys, ...relationKeys].flatMap((key) => extractIds(application[key]));
  return Array.from(new Set(ids));
}

export function getSubmittedApplicationServices(
  application: ApplicationDetailRecord,
): SubmittedApplicationService[] {
  const submitted = SERVICE_KEYS.flatMap((key) => normalizeServiceList(application[key]));
  const unique = new Map<string, SubmittedApplicationService>();

  submitted.forEach((service, index) => {
    const key = service.service_id === undefined
      ? `unknown-${index}-${String(service.note ?? "")}`
      : String(service.service_id);
    if (!unique.has(key)) unique.set(key, service);
  });

  return Array.from(unique.values());
}

export function normalizeArtistApplication<T extends ApplicationDetailRecord>(application: T) {
  return {
    ...application,
    ...(hasAnyKey(application, [...CATEGORY_ID_KEYS, ...CATEGORY_RELATION_KEYS])
      ? { category_ids: getApplicationCategoryIds(application, "category") }
      : {}),
    ...(hasAnyKey(application, [...SUBCATEGORY_ID_KEYS, ...SUBCATEGORY_RELATION_KEYS])
      ? { sub_category_ids: getApplicationCategoryIds(application, "subcategory") }
      : {}),
    ...(hasAnyKey(application, SERVICE_KEYS)
      ? { services: getSubmittedApplicationServices(application) }
      : {}),
  };
}

function hasAnyKey(application: ApplicationDetailRecord, keys: string[]) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(application, key));
}

function extractIds(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(extractIds);
  if (isRecord(value)) {
    return extractIds(value.category_id ?? value.categoryId ?? value.id);
  }
  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").flatMap(extractIds);
  }

  const id = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isSafeInteger(id) && id > 0 ? [id] : [];
}

function normalizeServiceList(value: unknown): SubmittedApplicationService[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "number" || typeof item === "string") {
      const serviceId = extractIds(item)[0];
      return serviceId === undefined ? [] : [{ service_id: serviceId }];
    }
    if (!isRecord(item)) return [];

    const nestedService = isRecord(item.service) ? item.service : undefined;
    const serviceId = extractIds(
      item.service_id ?? item.serviceId ?? nestedService?.id ?? item.id,
    )[0];
    return [{
      ...item,
      ...(serviceId === undefined ? {} : { service_id: serviceId }),
    }];
  });
}

function isRecord(value: unknown): value is ApplicationDetailRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
