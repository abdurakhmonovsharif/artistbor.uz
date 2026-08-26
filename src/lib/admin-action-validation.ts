export function positiveInteger(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : Number.NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
