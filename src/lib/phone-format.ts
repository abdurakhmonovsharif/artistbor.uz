export function formatPhone(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  if (digits.length === 12 && digits.startsWith("998")) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }

  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }

  if (raw.startsWith("+")) return raw;
  return digits;
}

export function normalizePhoneForApi(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}
