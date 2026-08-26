export function resolveArtistIdSearch(value?: string): number | null {
  const match = value?.trim().toUpperCase().match(/^ART-0*(\d+)$/);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
