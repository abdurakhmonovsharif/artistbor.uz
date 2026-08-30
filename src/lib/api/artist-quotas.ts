import { apiClient, unwrapData } from "@/lib/api/client";
import { readArtistQuota, readArtistQuotaDetails, type ArtistQuota, type ArtistQuotaDetails } from "@/lib/artist-quota";
import type { UnknownRecord } from "@/types/api";

export const artistQuotasApi = {
  async detail(artistId: number): Promise<ArtistQuotaDetails> {
    const response = await apiClient.get(`/v1/admin/artist/${artistId}/quota`);
    return readArtistQuotaDetails(unwrapData<UnknownRecord>(response.data));
  },
  async update(artistId: number, monthlyOrderLimit: number | null): Promise<ArtistQuota | null> {
    const response = await apiClient.put(`/v1/admin/artist/${artistId}/quota`, {
      monthly_order_limit: monthlyOrderLimit,
    });
    return readArtistQuota(unwrapData<UnknownRecord>(response.data));
  },
};
