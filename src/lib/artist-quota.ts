import { isRecord } from "@/lib/utils";

export type ArtistQuota = {
  period?: string;
  limit?: number;
  used?: number;
  remaining?: number | null;
  unlimited?: boolean;
  enforced?: boolean;
  totalAllTime?: number;
};

export type ArtistQuotaHistoryItem = {
  period: string;
  count: number;
};

export type ArtistQuotaDetails = {
  quota: ArtistQuota | null;
  history: ArtistQuotaHistoryItem[];
};

export type MonthlyOrderLimitMode = "default" | "unlimited" | "custom";

export function readArtistQuota(value: unknown): ArtistQuota | null {
  if (!isRecord(value)) return null;

  const hasQuotaShape = ["period", "limit", "used", "remaining", "unlimited", "enforced", "total_all_time"]
    .some((key) => key in value);
  if (!hasQuotaShape) return null;

  return {
    period: stringValue(value.period),
    limit: nonNegativeInteger(value.limit),
    used: nonNegativeInteger(value.used),
    remaining: nullableInteger(value.remaining),
    unlimited: booleanValue(value.unlimited),
    enforced: booleanValue(value.enforced),
    totalAllTime: nonNegativeInteger(value.total_all_time ?? value.totalAllTime),
  };
}

export function readArtistQuotaDetails(value: unknown): ArtistQuotaDetails {
  const record = isRecord(value) ? value : {};
  const history = Array.isArray(record.history)
    ? record.history.flatMap((item) => {
      if (!isRecord(item)) return [];
      const period = stringValue(item.period);
      const count = nonNegativeInteger(item.count);
      return period && count !== undefined ? [{ period, count }] : [];
    })
    : [];

  return {
    quota: readArtistQuota(record.quota ?? record),
    history,
  };
}

export function readMonthlyOrderLimit(value: unknown): number | null | undefined {
  if (value === null) return null;
  return nonNegativeInteger(value);
}

export function getMonthlyOrderLimitMode(limit: number | null | undefined): MonthlyOrderLimitMode {
  if (limit === null || limit === undefined) return "default";
  return limit === 0 ? "unlimited" : "custom";
}

export function getQuotaPercent(quota: ArtistQuota | null | undefined) {
  if (!quota || !isFinitePositive(quota.limit) || quota.used === undefined) return null;
  return Math.round((quota.used / quota.limit) * 100);
}

export function buildMonthlyOrderLimitPayload(
  mode: MonthlyOrderLimitMode,
  customLimit: string,
): { monthly_order_limit: number | null } {
  if (mode === "default") return { monthly_order_limit: null };
  if (mode === "unlimited") return { monthly_order_limit: 0 };

  const limit = nonNegativeInteger(customLimit);
  if (!isFinitePositive(limit)) {
    throw new Error("CUSTOM_LIMIT_REQUIRED");
  }

  return { monthly_order_limit: limit };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nonNegativeInteger(value: unknown) {
  if (typeof value === "string" && !value.trim()) return undefined;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function nullableInteger(value: unknown): number | null | undefined {
  if (value === null) return null;
  return nonNegativeInteger(value);
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return undefined;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
