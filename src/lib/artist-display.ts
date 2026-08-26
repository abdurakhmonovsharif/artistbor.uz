import type { ArtistProfile } from "@/types/api";
import { formatPhone } from "@/lib/phone-format";

export function getArtistId(artist: ArtistProfile) {
  return artist.user_id ?? artist.id;
}

export function getArtistName(artist: ArtistProfile) {
  const fromParts = [artist.first_name, artist.last_name].filter(Boolean).join(" ").trim();
  return artist.full_name || fromParts || artist.administrator_name || `Sanatkor ${artist.public_id ?? "—"}`;
}

export function getArtistOptionLabel(artist: ArtistProfile) {
  const phone = artist.phone || artist.extra_phone;
  return phone ? `${getArtistName(artist)} · ${formatPhone(phone) || phone}` : getArtistName(artist);
}

export function getArtistSelectOptions(artists: ArtistProfile[], selectedId?: string | number) {
  const options = artists
    .filter((artist) => getArtistId(artist) !== undefined)
    .map((artist) => ({
      label: getArtistOptionLabel(artist),
      value: String(getArtistId(artist)),
    }));
  const selectedValue = selectedId === undefined || selectedId === "" ? "" : String(selectedId);

  if (selectedValue && !options.some((option) => option.value === selectedValue)) {
    return [{ label: `Sanatkor #${selectedValue}`, value: selectedValue }, ...options];
  }

  return options;
}
