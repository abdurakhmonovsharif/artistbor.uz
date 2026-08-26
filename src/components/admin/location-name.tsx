"use client";

import { useEffect, useState } from "react";
import { districtsApi, regionsApi } from "@/lib/api/admin-content";
import { toDisplay } from "@/lib/utils";
import type { District, Region } from "@/types/api";

type LocationMaps = {
  regions: Record<string, string>;
  districts: Record<string, string>;
};

let cachedMaps: LocationMaps | null = null;
let pendingMaps: Promise<LocationMaps> | null = null;

export function LocationName({
  fieldKey,
  value,
  fallback,
}: {
  fieldKey: string;
  value: unknown;
  fallback?: React.ReactNode;
}) {
  const label = useLocationLabel(fieldKey, value);

  return <>{label ?? fallback ?? toDisplay(value)}</>;
}

export function useLocationLabel(fieldKey: string, value: unknown) {
  const [maps, setMaps] = useState<LocationMaps | null>(() => cachedMaps);
  const locationType = locationFieldType(fieldKey);
  const id = normalizeLocationId(value);

  useEffect(() => {
    if (!locationType || !id || maps) return;

    let active = true;
    queueMicrotask(() => {
      void loadLocationMaps().then((nextMaps) => {
        if (active) setMaps(nextMaps);
      });
    });

    return () => {
      active = false;
    };
  }, [id, locationType, maps]);

  if (!locationType || !id) return null;

  const source = locationType === "region" ? maps?.regions : maps?.districts;
  return source?.[id] ?? `#${id}`;
}

export function isLocationIdKey(fieldKey: string) {
  return Boolean(locationFieldType(fieldKey));
}

function locationFieldType(fieldKey: string): "region" | "district" | null {
  const lastPart = fieldKey.toLowerCase().split(".").at(-1);
  if (lastPart === "region_id") return "region";
  if (lastPart === "district_id") return "district";
  return null;
}

function normalizeLocationId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function loadLocationMaps() {
  if (cachedMaps) return Promise.resolve(cachedMaps);
  if (pendingMaps) return pendingMaps;

  pendingMaps = Promise.allSettled([regionsApi.list({}), districtsApi.list({})]).then(
    ([regionsResult, districtsResult]) => {
      const maps: LocationMaps = { regions: {}, districts: {} };

      if (regionsResult.status === "fulfilled") {
        for (const region of regionsResult.value.items) {
          addLocationName(maps.regions, region);
        }
      }

      if (districtsResult.status === "fulfilled") {
        for (const district of districtsResult.value.items) {
          addLocationName(maps.districts, district);
        }
      }

      cachedMaps = maps;
      pendingMaps = null;
      return maps;
    },
  );

  return pendingMaps;
}

function addLocationName(target: Record<string, string>, item: Region | District) {
  if (typeof item.id !== "number" && typeof item.id !== "string") return;

  const name = item.name_uz || item.name_ru || item.name_en;
  target[String(item.id)] = name?.trim() || "—";
}
