export function formatUnixDateTime(seconds: unknown) {
  const value = normalizeUnixSeconds(seconds);
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value * 1000));
}

export function formatBookingDate(date: unknown) {
  if (typeof date !== "string" || !date.trim()) return "Date not set";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function formatBookingTimeRange(time: unknown, timeTo: unknown) {
  const start = typeof time === "string" && time.trim() ? time : "";
  const end = typeof timeTo === "string" && timeTo.trim() ? timeTo : "";

  if (!start) {
    return {
      primary: "Time not set",
      secondary: "",
      isComplete: false,
    };
  }

  if (!end) {
    return {
      primary: start,
      secondary: "",
      isComplete: false,
    };
  }

  return {
    primary: `${start} — ${end}`,
    secondary: "",
    isComplete: true,
  };
}

export function isExpired(seconds: unknown, nowMs = Date.now()) {
  const value = normalizeUnixSeconds(seconds);
  return Boolean(value && nowMs > value * 1000);
}

function normalizeUnixSeconds(value: unknown) {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return seconds > 10_000_000_000 ? Math.floor(seconds / 1000) : seconds;
}
