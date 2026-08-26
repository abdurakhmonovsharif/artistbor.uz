import type { DistrictPayload, RegionPayload } from "@/lib/api/admin-content";

export type LocationFormValues = {
  region_id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  sort_order: string;
  status: string;
};

export type LocationPayloadResult<T> = { payload: T } | { error: "regionRequired" | "nameRequired" | "sortOrderInvalid" };

export const emptyLocationFormValues: LocationFormValues = {
  region_id: "",
  name_uz: "",
  name_ru: "",
  name_en: "",
  sort_order: "0",
  status: "1",
};

export function buildRegionPayload(values: LocationFormValues): LocationPayloadResult<RegionPayload> {
  const common = buildCommonPayload(values);
  if ("error" in common) return common;
  return { payload: common.payload };
}

export function buildDistrictPayload(values: LocationFormValues): LocationPayloadResult<DistrictPayload> {
  const regionId = Number(values.region_id);
  if (!Number.isSafeInteger(regionId) || regionId <= 0) return { error: "regionRequired" };

  const common = buildCommonPayload(values);
  if ("error" in common) return common;
  return { payload: { ...common.payload, region_id: regionId } };
}

function buildCommonPayload(values: LocationFormValues): LocationPayloadResult<RegionPayload> {
  const nameUz = values.name_uz.trim();
  if (!nameUz) return { error: "nameRequired" };

  const sortOrder = values.sort_order.trim() === "" ? 0 : Number(values.sort_order);
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) return { error: "sortOrderInvalid" };

  const payload: RegionPayload = {
    name_uz: nameUz,
    sort_order: sortOrder,
    status: values.status === "0" ? 0 : 1,
  };

  const nameRu = values.name_ru.trim();
  const nameEn = values.name_en.trim();
  if (nameRu) payload.name_ru = nameRu;
  if (nameEn) payload.name_en = nameEn;

  return { payload };
}
