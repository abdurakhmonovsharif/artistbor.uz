export function formatPhone(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  if (digits.startsWith("998")) {
    const localDigits = digits.slice(3, 12);
    return formatUzbekPhone(localDigits);
  }

  if (!raw.startsWith("+") && digits.length <= 9) {
    return formatUzbekPhone(digits);
  }

  return formatOtherPhone(digits, raw.startsWith("+"));
}

export function normalizePhoneForApi(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

function formatUzbekPhone(localDigits: string) {
  const limited = localDigits.slice(0, 9);
  const groups = [
    limited.slice(0, 2),
    limited.slice(2, 5),
    limited.slice(5, 7),
    limited.slice(7, 9),
  ].filter(Boolean);

  return groups.length ? `+998 ${groups.join(" ")}` : "+998";
}

function formatOtherPhone(digits: string, withPlus: boolean) {
  if (!withPlus) return groupLocalPhoneDigits(digits);

  if (digits.length > 10) {
    const countryCodeLength = Math.min(3, digits.length - 10);
    const countryCode = digits.slice(0, countryCodeLength);
    const localDigits = digits.slice(countryCodeLength);
    return `+${countryCode} ${groupLocalPhoneDigits(localDigits)}`;
  }

  return `+${groupLocalPhoneDigits(digits)}`;
}

function groupLocalPhoneDigits(digits: string) {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return digits.replace(/(\d{1,3})(?=(\d{3})+(?!\d))/g, "$1 ");
}
