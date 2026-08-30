import type { ArtistQuota } from "@/lib/artist-quota";

export type ArtistQuotaRow = {
  artistId: number;
  name: string;
  phone?: string;
  publicId?: string;
  status?: string;
  monthlyOrderLimit: number | null | undefined;
  quota: ArtistQuota | null;
};

export type ArtistQuotaLabels = {
  action: string;
  allTime: string;
  cancel: string;
  customLimit: string;
  customLimitHelp: string;
  countingOnly: string;
  defaultLimit: string;
  defaultLimitHelp: string;
  edit: string;
  enforced: string;
  enforcedActive: string;
  errorRetry: string;
  history: string;
  id: string;
  limit: string;
  limitOnlyCounts: string;
  loading: string;
  noArtists: string;
  period: string;
  remaining: string;
  save: string;
  saveFailed: string;
  saveSuccess: string;
  saving: string;
  status: string;
  total: string;
  unlimited: string;
  unlimitedHelp: string;
  used: string;
  view: string;
};
