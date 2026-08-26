export type ArtistBusySlotPayload = {
  date: string;
  time_from: string;
  time_to: string;
  note?: string;
};

type ArtistBusySlotInput = {
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
};

export function buildArtistBusySlotPayload(input: ArtistBusySlotInput): ArtistBusySlotPayload {
  const payload: ArtistBusySlotPayload = {
    date: input.date,
    time_from: input.startTime,
    time_to: input.endTime,
  };
  const note = input.note?.trim();
  if (note) payload.note = note;
  return payload;
}
