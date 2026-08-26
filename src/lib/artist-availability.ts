export function isVisibleArtistAvailabilityRecord(record: Record<string, unknown>) {
  return record.is_expired !== true;
}

const AVAILABILITY_MONTH_NAMES = {
  ru: [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ],
  uz: [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentabr",
    "oktabr",
    "noyabr",
    "dekabr",
  ],
} as const;

export function formatArtistAvailabilityMonth(date: Date, locale: "ru" | "uz") {
  return `${AVAILABILITY_MONTH_NAMES[locale][date.getMonth()]} ${date.getFullYear()}`;
}

export function isEditableArtistAvailabilitySource(source: unknown) {
  return String(source ?? "manual").trim().toLowerCase() === "manual";
}

export function getArtistAvailabilityOrderPublicId(record: Record<string, unknown>) {
  const directCandidates = [record.order_public_id, record.orderPublicId, record.order_id];
  const nestedOrder = isArtistAvailabilityRecord(record.order) ? record.order : undefined;
  if (nestedOrder) {
    directCandidates.push(nestedOrder.public_id, nestedOrder.order_public_id, nestedOrder.id);
  }

  for (const candidate of directCandidates) {
    const publicId = normalizeArtistAvailabilityOrderPublicId(candidate);
    if (publicId) return publicId;
  }

  for (const candidate of [record.note, record.description, record.comment]) {
    if (typeof candidate !== "string") continue;
    const match = candidate.match(/\bORD-\d+\b/i);
    if (match) return match[0].toUpperCase();
  }

  return undefined;
}

export type ArtistAvailabilityInterval = {
  date: string;
  endTime: string;
  id?: number | string;
  startTime: string;
};

export function findOverlappingArtistAvailabilityInterval<T extends ArtistAvailabilityInterval>(
  candidate: ArtistAvailabilityInterval,
  intervals: T[],
  excludedId?: number | string,
): T | undefined {
  const candidateStart = availabilityTimeToMinutes(candidate.startTime);
  const candidateEnd = availabilityTimeToMinutes(candidate.endTime);
  if (candidateStart === null || candidateEnd === null || candidateEnd <= candidateStart) return undefined;

  return intervals.find((interval) => {
    if (interval.date !== candidate.date) return false;
    if (excludedId !== undefined && interval.id !== undefined && String(interval.id) === String(excludedId)) {
      return false;
    }

    const intervalStart = availabilityTimeToMinutes(interval.startTime);
    const intervalEnd = availabilityTimeToMinutes(interval.endTime);
    if (intervalStart === null || intervalEnd === null || intervalEnd <= intervalStart) return false;

    return candidateStart < intervalEnd && candidateEnd > intervalStart;
  });
}

function availabilityTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeArtistAvailabilityOrderPublicId(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (/^ORD-\d+$/.test(normalized)) return normalized;
    if (/^\d+$/.test(normalized)) {
      const numericId = Number(normalized);
      if (numericId > 0) return `ORD-${numericId}`;
    }
  }

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return `ORD-${value}`;
  }

  return undefined;
}

function isArtistAvailabilityRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
