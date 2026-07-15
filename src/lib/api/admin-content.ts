import { apiClient, unwrapData } from "@/lib/api/client";
import type {
  ArtistApplication,
  ArtistBalanceRecord,
  ArtistAvailabilityRecord,
  ArtistGalleryRecord,
  ArtistProfile,
  ArtistServiceRecord,
  ArtistTransactionRecord,
  ArtistVideoRecord,
  Category,
  CommentRecord,
  District,
  Faq,
  ListResult,
  NotificationRecord,
  OrderRecord,
  PaginationMeta,
  RatingRecord,
  Region,
  Service,
  TrashRecord,
  UnknownRecord,
  User,
} from "@/types/api";
import { isRecord } from "@/lib/utils";

export type CategoryFilters = {
  parent_id?: string;
  status?: string;
  name?: string;
  page?: number;
  limit?: number;
};

export type CategoryCreatePayload = {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  parent_id?: number;
  icon?: string;
  sort_order?: number;
  status?: number;
};

export type CategoryUpdatePayload = CategoryCreatePayload & {
  slug?: string;
};

export type FaqFilters = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type FaqPayload = {
  question_uz: string;
  question_ru?: string;
  question_en?: string;
  answer_uz: string;
  answer_ru?: string;
  answer_en?: string;
  sort_order?: number;
  status?: number;
};

export type RegionFilters = {
  name?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type RegionPayload = {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  sort_order?: number;
  status?: number;
};

export type DistrictFilters = {
  region_id?: string;
  name?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type DistrictPayload = {
  region_id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  sort_order?: number;
  status?: number;
};

export type ServiceFilters = {
  name?: string;
  category_id?: string;
  sort_order?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type ServiceCreatePayload = {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  slug: string;
  parent_id?: number;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  sort_order?: number;
  status?: number;
};

export type ServiceUpdatePayload = Omit<ServiceCreatePayload, "slug"> & {
  slug?: string;
};

export type UserFilters = {
  role?: string | number;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  limit?: number;
  expand?: string;
};

export type StaffRole = 20 | 25 | 30;

export type StaffFilters = {
  role?: string | number;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  limit?: number;
  expand?: string;
};

export type CreateStaffPayload = {
  phone: string;
  password: string;
  first_name: string;
  last_name?: string;
  email?: string;
  role: StaffRole;
};

export type UpdateStaffPayload = {
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
  role: StaffRole;
  status?: number;
};

export type UpdateUserPayload = {
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
  status: number;
};

export type ArtistFilters = {
  search?: string;
  is_verified?: string;
  is_top?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export type UpdateArtistPayload = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  status?: number;
  category_ids?: number[];
  bio?: string;
  extra_phone?: string;
  administrator_name?: string;
  administrator_phone?: string;
  profile_photo_id?: number;
  is_top?: boolean;
  card_last_four?: string;
  card_token?: string;
};

export type ArtistServiceRegionPricePayload = {
  region_id: number;
  price: number;
};

export type ArtistServiceAssignmentPayload = {
  artist_id: number;
  service_id: number;
  price: number;
  note?: string;
  region_prices?: ArtistServiceRegionPricePayload[];
};

export type ArtistServiceUpdatePayload = Partial<{
  price: number;
  note: string;
  status: number;
  region_prices: ArtistServiceRegionPricePayload[];
}>;

export type CreateArtistPayload = {
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
  password: string;
  status?: number;
  region_id?: number;
  district_id?: number;
  bio?: string;
  birth_date?: string;
  gender?: "male" | "female" | "other";
  artist_bio?: string;
  extra_phone?: string;
  administrator_name?: string;
  administrator_phone?: string;
  albums_count?: number;
  fans_count?: number;
  profile_photo_id?: number;
  is_verified?: boolean;
  is_top?: boolean;
  category_ids?: number[];
  services?: Array<{
    service_id: number;
    price: number;
    note?: string;
    region_prices?: ArtistServiceRegionPricePayload[];
  }>;
};

export type UploadedFileRecord = UnknownRecord & {
  id?: number;
  file_id?: number;
  url?: string;
  file_url?: string;
  path?: string;
};

export type ApplicationFilters = {
  status?: string | number;
  page?: number;
  limit?: number;
};

export type UpdateApplicationPayload = {
  category_ids?: number[];
  sub_category_ids?: number[];
  bio?: string;
  albums_count?: number;
  extra_phone?: string;
  administrator_name?: string;
  administrator_phone?: string;
  profile_photo_id?: number;
};

export type OrderFilters = {
  status?: string;
  payment_status?: string;
  artist_id?: string;
  client_id?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  limit?: number;
  expand?: string;
};

export type OrderDetailFilters = {
  expand?: string;
};

export type UpdateOrderPayload = {
  date?: string;
  time?: string;
  time_to?: string;
  service_id?: number;
  sub_service_id?: number | null;
  region_id?: number;
  district_id?: number;
  address?: string;
  group_size?: number;
  comment?: string;
  total_price?: number;
  lat?: number;
  lon?: number;
};

export type RescheduleOrderPayload = {
  date: string;
  time: string;
  time_to: string;
  reason?: string;
};

export type ConfirmOrderPayload = Partial<{
  date: string;
  time: string;
  time_to: string;
  artist_id: number;
  service_id: number;
  sub_service_id: number;
  region_id: number;
  district_id: number;
  lat: number | string;
  lon: number | string;
  address: string;
  comment: string;
  total_price: number | string;
  deadline_minutes: number;
}>;

export type VerifyOrderPaymentPayload = {
  payment_id: number;
};

export type RejectOrderPaymentPayload = VerifyOrderPaymentPayload & {
  reason?: string;
};

export type AdminConfigItem = {
  key: string;
  value: string;
  type?: "float" | "int" | "string" | "boolean" | string;
  description?: string | null;
};

export type AdminConfigUpdatePayload =
  | {
      key: string;
      value: string;
    }
  | {
      configs: Array<{
        key: string;
        value: string;
      }>;
    };

export type CommentFilters = {
  status?: string;
  artist_id?: string;
  client_id?: string;
  page?: number;
  limit?: number;
};

export type UpdateCommentPayload = {
  comment?: string;
  is_published?: number;
};

export type RatingFilters = {
  artist_id?: string;
  client_id?: string;
  rating?: string;
  is_published?: string;
  page?: number;
  limit?: number;
};

export type ArtistServiceFilters = {
  artist_id?: number;
  service_id?: number;
};

export type ArtistRegionPriceRecord = UnknownRecord & {
  id?: number;
  artist_service_id?: number;
  region_id?: number;
  region_name?: string;
  price?: number | string;
};

export type ArtistRegionPricePayload = {
  region_id: number;
  price: number;
};

export type ArtistAvailabilityFilters = {
  date_from?: string;
  date_to?: string;
};

export type ArtistBusySlotPayload = {
  date: string;
  time_from: string;
  time_to: string;
  reason?: string;
};

export type ArtistGalleryFilters = {
  artist_id?: number;
};

export type ArtistVideoFilters = {
  artist_id?: number | string;
};

export type NotificationFilters = {
  type?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export type DashboardPeriod = "today" | "week" | "month" | "custom";

export type DashboardStatsFilters = {
  period?: DashboardPeriod;
  from?: string;
  to?: string;
};

export type DashboardStats = {
  period?: {
    from?: string;
    to?: string;
  };
  counters?: {
    total_orders?: number;
    pending_orders?: number;
    payment_pending?: number;
    confirmed_orders?: number;
    completed_orders?: number;
    cancelled_orders?: number;
    total_revenue?: number;
    pending_applications?: number;
    pending_comments?: number;
    new_users_today?: number;
    active_artists?: number;
  };
  charts?: {
    orders_per_day?: {
      date?: string;
      count?: number;
    }[];
    revenue_per_day?: {
      date?: string;
      amount?: number;
    }[];
    orders_by_status?: {
      status?: string;
      status_label?: string;
      count?: number;
    }[];
  };
  top_artists?: {
    id?: number;
    full_name?: string;
    avatar_url?: string | null;
    rating?: number;
    orders_count?: number;
    revenue?: number;
  }[];
  top_categories?: {
    id?: number;
    name?: string;
    orders_count?: number;
  }[];
  recent_orders?: UnknownRecord[];
  recent_applications?: UnknownRecord[];
};

export type DashboardQuickStats = {
  pending_orders?: number;
  pending_applications?: number;
  pending_comments?: number;
  unpaid_invoices?: number;
  today_orders?: number;
};

export type SendNotificationPayload = {
  title: string;
  message: string;
  type?: "system" | "order" | "promo" | string;
  role?: "client" | "artist" | string;
  region_id?: number;
  district_id?: number;
  data?: Record<string, unknown>;
};

export type SendAllNotificationPayload = {
  title: string;
  message: string;
  type?: "system" | "order" | "promo" | string;
  data?: Record<string, unknown>;
};

export type SendNotificationResult = {
  notification_id?: number;
  recipient_count?: number;
};

export type TrashModel =
  | "user"
  | "booking"
  | "order"
  | "artist-busy-slot"
  | "service"
  | "artist-application"
  | "artist-profile"
  | "client-profile"
  | "user-profile"
  | "category"
  | "artist-service"
  | "file"
  | "artist-gallery";

export type TrashSearchFilters = {
  q?: string;
  model?: TrashModel | "";
};

export type TrashListFilters = {
  page?: number;
  limit?: number;
};

export const categoriesApi = {
  async list(filters: CategoryFilters) {
    // TODO: Swagger does not define the concrete list response schema for categories.
    const response = await apiClient.get("/v1/admin/categories", {
      params: compactParams(filters),
    });
    return normalizeList<Category>(response.data);
  },
  async detail(id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/categories/${id}`);
    return unwrapData<Category>(response.data);
  },
  async create(payload: CategoryCreatePayload) {
    const response = await apiClient.post("/v1/admin/categories", payload);
    return unwrapData<Category>(response.data);
  },
  async update(id: number, payload: CategoryUpdatePayload) {
    const response = await apiClient.put(`/v1/admin/categories/${id}`, payload);
    return unwrapData<Category>(response.data);
  },
  async delete(id: number) {
    // TODO: Swagger omits delete response body shape for categories.
    const response = await apiClient.delete(`/v1/admin/categories/${id}`);
    return unwrapData<unknown>(response.data);
  },
  async restore(id: number) {
    // TODO: Swagger omits restore response body shape for categories.
    const response = await apiClient.post(`/v1/admin/categories/${id}/restore`);
    return unwrapData<unknown>(response.data);
  },
};

export const faqApi = {
  async list(filters: FaqFilters) {
    const response = await apiClient.get("/v1/admin/faq", {
      params: compactParams(filters),
    });
    return normalizeList<Faq>(response.data);
  },
  async detail(id: number) {
    const response = await apiClient.get(`/v1/admin/faq/${id}`);
    return unwrapData<Faq>(response.data);
  },
  async create(payload: FaqPayload) {
    const response = await apiClient.post("/v1/admin/faq", payload);
    return unwrapData<Faq>(response.data);
  },
  async update(id: number, payload: FaqPayload) {
    const response = await apiClient.put(`/v1/admin/faq/${id}`, payload);
    return unwrapData<Faq>(response.data);
  },
  async delete(id: number) {
    // TODO: Swagger omits delete response body shape for FAQ.
    const response = await apiClient.delete(`/v1/admin/faq/${id}`);
    return unwrapData<unknown>(response.data);
  },
};

export const regionsApi = {
  async list(filters: RegionFilters) {
    // TODO: Swagger does not define the concrete list response schema for regions.
    const response = await apiClient.get("/v1/admin/regions", {
      params: compactParamsWithPerPage(filters),
    });
    return normalizeList<Region>(response.data);
  },
  async detail(id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/regions/${id}`);
    return unwrapData<Region>(response.data);
  },
  async create(payload: RegionPayload) {
    const response = await apiClient.post("/v1/admin/regions", payload);
    return unwrapData<Region>(response.data);
  },
  async update(id: number, payload: RegionPayload) {
    const response = await apiClient.put(`/v1/admin/regions/${id}`, payload);
    return unwrapData<Region>(response.data);
  },
  async delete(id: number) {
    // TODO: Swagger omits delete response body shape for regions.
    const response = await apiClient.delete(`/v1/admin/regions/${id}`);
    return unwrapData<unknown>(response.data);
  },
  async districts(id: number) {
    // TODO: Swagger omits /regions/{id}/districts response item schema.
    const response = await apiClient.get(`/v1/admin/regions/${id}/districts`);
    return normalizeList<District>(response.data);
  },
};

export const districtsApi = {
  async list(filters: DistrictFilters) {
    // TODO: Swagger does not define the concrete list response schema for districts.
    const response = await apiClient.get("/v1/admin/districts", {
      params: compactParamsWithPerPage(filters),
    });
    return normalizeList<District>(response.data);
  },
  async detail(id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/districts/${id}`);
    return unwrapData<District>(response.data);
  },
  async create(payload: DistrictPayload) {
    const response = await apiClient.post("/v1/admin/districts", payload);
    return unwrapData<District>(response.data);
  },
  async update(id: number, payload: DistrictPayload) {
    const response = await apiClient.put(`/v1/admin/districts/${id}`, payload);
    return unwrapData<District>(response.data);
  },
  async delete(id: number) {
    // TODO: Swagger omits delete response body shape for districts.
    const response = await apiClient.delete(`/v1/admin/districts/${id}`);
    return unwrapData<unknown>(response.data);
  },
};

export const servicesApi = {
  async list(filters: ServiceFilters) {
    // TODO: Swagger does not define the concrete list response schema for services.
    const response = await apiClient.get("/v1/admin/service", {
      params: compactParamsWithPerPage(filters),
    });
    return normalizeList<Service>(response.data);
  },
  async create(payload: ServiceCreatePayload) {
    const response = await apiClient.post("/v1/admin/service", payload);
    return unwrapData<Service>(response.data);
  },
  async update(id: number, payload: ServiceUpdatePayload) {
    const response = await apiClient.put(`/v1/admin/service/${id}`, payload);
    return unwrapData<Service>(response.data);
  },
  async delete(id: number) {
    // TODO: Swagger omits delete response body shape for services.
    const response = await apiClient.delete(`/v1/admin/service/${id}`);
    return unwrapData<unknown>(response.data);
  },
};

export const usersApi = {
  async list(filters: UserFilters) {
    // TODO: Swagger does not define the concrete list response schema for users.
    const response = await apiClient.get("/v1/admin/user", {
      params: compactParamsWithPerPage(filters),
    });
    return normalizeList<User>(response.data);
  },
  async createStaff(payload: CreateStaffPayload) {
    const response = await apiClient.post("/v1/admin/staff", payload);
    return unwrapData<User>(response.data);
  },
  async update(id: number, payload: UpdateUserPayload) {
    // TODO: Swagger omits update user response body shape.
    const response = await apiClient.put(`/v1/admin/user/${id}`, payload);
    return unwrapData<User>(response.data);
  },
  async block(id: number) {
    const response = await apiClient.post(`/v1/admin/user/${id}/block`);
    return unwrapData<{ id: number; status: string }>(response.data);
  },
  async unblock(id: number) {
    // TODO: Swagger omits unblock response body shape.
    const response = await apiClient.post(`/v1/admin/user/${id}/unblock`);
    return unwrapData<unknown>(response.data);
  },
};

export const staffApi = {
  async list(filters: StaffFilters) {
    const response = await apiClient.get("/v1/admin/staff", {
      params: compactParamsWithPerPage(filters),
    });
    return normalizeList<User>(response.data);
  },
  async create(payload: CreateStaffPayload) {
    const response = await apiClient.post("/v1/admin/staff", payload);
    return unwrapData<User>(response.data);
  },
  async detail(id: number) {
    const response = await apiClient.get(`/v1/admin/staff/${id}`);
    return unwrapData<User>(response.data);
  },
  async update(id: number, payload: UpdateStaffPayload) {
    const response = await apiClient.put(`/v1/admin/staff/${id}`, payload);
    return unwrapData<User>(response.data);
  },
  async delete(id: number) {
    const response = await apiClient.delete(`/v1/admin/staff/${id}`);
    return unwrapData<unknown>(response.data);
  },
  async resetPassword(id: number, password: string) {
    const response = await apiClient.post(`/v1/admin/staff/${id}/reset-password`, { password });
    return unwrapData<unknown>(response.data);
  },
  async block(id: number) {
    const response = await apiClient.post(`/v1/admin/staff/${id}/block`);
    return unwrapData<unknown>(response.data);
  },
  async unblock(id: number) {
    const response = await apiClient.post(`/v1/admin/staff/${id}/unblock`);
    return unwrapData<unknown>(response.data);
  },
};

export const artistsApi = {
  async list(filters: ArtistFilters) {
    const response = await apiClient.get("/v1/admin/artists", {
      params: compactParams(filters),
    });
    return normalizeList<ArtistProfile>(response.data);
  },
  async create(payload: CreateArtistPayload) {
    const response = await apiClient.post("/v1/admin/artist", payload);
    return unwrapData<ArtistProfile>(response.data);
  },
  async detail(id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/artist/${id}`);
    return unwrapData<ArtistProfile>(response.data);
  },
  async balance(id: number) {
    const response = await apiClient.get(`/v1/admin/artist/${id}/balance`);
    return unwrapData<ArtistBalanceRecord>(response.data);
  },
  async transactions(id: number) {
    const response = await apiClient.get(`/v1/admin/artist/${id}/transactions`);
    return unwrapData<ArtistTransactionRecord[]>(response.data);
  },
  async update(id: number, payload: UpdateArtistPayload) {
    // TODO: Swagger omits update artist response body shape.
    const response = await apiClient.put(`/v1/admin/artist/${id}`, payload);
    return unwrapData<ArtistProfile>(response.data);
  },
};

export const filesApi = {
  async upload(files: File[], category = "image") {
    const formData = new FormData();
    files.forEach((file) => formData.append("files[]", file));
    formData.append("category", category);
    const response = await apiClient.post("/v1/admin/file/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrapData<UploadedFileRecord[] | UploadedFileRecord>(response.data);
  },
};

export const artistServicesApi = {
  async list(filters: ArtistServiceFilters) {
    // TODO: Swagger omits concrete artist-service item/list response schemas.
    const response = await apiClient.get("/v1/admin/artist-service", {
      params: compactParams(filters),
    });
    return normalizeList<ArtistServiceRecord>(response.data);
  },
  async assign(payload: ArtistServiceAssignmentPayload) {
    const response = await apiClient.post("/v1/admin/artist-service/assign", payload);
    return unwrapData<ArtistServiceRecord>(response.data);
  },
  async update(id: number, payload: ArtistServiceUpdatePayload) {
    const response = await apiClient.put(`/v1/admin/artist-service/${id}`, payload);
    return unwrapData<ArtistServiceRecord>(response.data);
  },
  async delete(id: number) {
    const response = await apiClient.delete(`/v1/admin/artist-service/${id}`);
    return unwrapData<unknown>(response.data);
  },
  async regionPrices(id: number) {
    const response = await apiClient.get(`/v1/admin/artist-service/${id}/region-prices`);
    return unwrapData<ArtistRegionPriceRecord[]>(response.data);
  },
  async upsertRegionPrice(id: number, payload: ArtistRegionPricePayload) {
    const response = await apiClient.post(`/v1/admin/artist-service/${id}/region-prices`, payload);
    return unwrapData<ArtistRegionPriceRecord | UnknownRecord>(response.data);
  },
  async deleteRegionPrice(id: number) {
    const response = await apiClient.delete(`/v1/admin/region-price/${id}`);
    return unwrapData<unknown>(response.data);
  },
};

export const artistAvailabilityApi = {
  async list(artistId: number, filters: ArtistAvailabilityFilters = {}) {
    // TODO: Swagger omits concrete availability response schema.
    const response = await apiClient.get(`/v1/admin/artist/${artistId}/availability`, {
      params: compactParams(withDefaultAvailabilityRange(filters)),
    });
    return normalizeList<ArtistAvailabilityRecord>(response.data);
  },
  async createBusySlot(artistId: number, payload: ArtistBusySlotPayload) {
    const response = await apiClient.post(`/v1/admin/artist/${artistId}/busy-slot`, payload);
    return unwrapData<ArtistAvailabilityRecord>(response.data);
  },
  async deleteBusySlot(id: number) {
    const response = await apiClient.delete(`/v1/admin/busy-slot/${id}`);
    return unwrapData<unknown>(response.data);
  },
};

export const artistGalleryApi = {
  async list(filters: ArtistGalleryFilters) {
    // TODO: Swagger omits concrete gallery item/list response schemas.
    const response = await apiClient.get("/v1/admin/artist-gallery", {
      params: compactParams(filters),
    });
    return normalizeList<ArtistGalleryRecord>(response.data);
  },
};

export const artistVideosApi = {
  async list(filters: ArtistVideoFilters) {
    // TODO: Swagger omits concrete artist video item/list response schemas.
    const response = await apiClient.get("/v1/admin/artist-videos", {
      params: compactParams(filters),
    });
    return normalizeList<ArtistVideoRecord>(response.data);
  },
};

export const applicationsApi = {
  async list(filters: ApplicationFilters) {
    // TODO: Swagger does not define the concrete list response schema for applications.
    const response = await apiClient.get("/v1/admin/application", {
      params: compactParams(normalizeApplicationFilters(filters)),
    });
    return normalizeList<ArtistApplication>(response.data);
  },
  async detail(id: number) {
    try {
      const response = await apiClient.get(`/v1/admin/application/${id}`, {
        params: { expand: "user" },
      });
      return unwrapData<ArtistApplication>(response.data);
    } catch {
      const response = await apiClient.get(`/v1/admin/application/${id}`);
      return unwrapData<ArtistApplication>(response.data);
    }
  },
  async update(id: number, payload: UpdateApplicationPayload) {
    // TODO: Swagger omits update application response body shape.
    const response = await apiClient.put(`/v1/admin/application/${id}`, payload);
    return unwrapData<ArtistApplication>(response.data);
  },
  async approve(id: number) {
    // TODO: Swagger omits approve response body shape.
    const response = await apiClient.post(`/v1/admin/application/approve/${id}`);
    return unwrapData<unknown>(response.data);
  },
  async reject(id: number, reason: string) {
    // TODO: Swagger omits reject response body shape.
    const response = await apiClient.post(`/v1/admin/application/reject/${id}`, { reason });
    return unwrapData<unknown>(response.data);
  },
};

function normalizeApplicationFilters(filters: ApplicationFilters) {
  const status = normalizeApplicationStatusFilter(filters.status);
  return {
    ...filters,
    ...(status === undefined ? { status: undefined } : { status }),
  };
}

function normalizeApplicationStatusFilter(status: ApplicationFilters["status"]) {
  if (status === "" || status === undefined || status === null) return undefined;
  const numericStatus = Number(status);
  if (Number.isFinite(numericStatus)) return numericStatus;

  const text = String(status).toLowerCase().replace(/[_-]+/g, " ").trim();
  if (text.includes("pending") || text.includes("kutilmoqda")) return 10;
  if (text.includes("approved") || text.includes("tasdiqlangan")) return 20;
  if (text.includes("rejected") || text.includes("rad etilgan")) return 30;
  return undefined;
}

export const ordersApi = {
  async list(filters: OrderFilters) {
    // TODO: Swagger does not define the concrete list response schema for orders.
    const response = await apiClient.get("/v1/admin/order", {
      params: compactParamsWithPerPage(filters),
    });
    return normalizeList<OrderRecord>(response.data);
  },
  async detail(id: number, filters?: OrderDetailFilters) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/order/${id}`, {
      params: compactParams(filters ?? {}),
    });
    return unwrapData<OrderRecord>(response.data);
  },
  async update(id: number, payload: UpdateOrderPayload) {
    // TODO: Swagger omits update order response body shape.
    const response = await apiClient.put(`/v1/admin/order/${id}`, payload);
    return unwrapData<OrderRecord>(response.data);
  },
  async confirm(id: number, payload: ConfirmOrderPayload = {}) {
    // TODO: Swagger omits confirm response body shape.
    const response = await apiClient.post(`/v1/admin/order/${id}/confirm`, compactParams(payload));
    return unwrapData<unknown>(response.data);
  },
  async verifyPayment(id: number, payload: VerifyOrderPaymentPayload) {
    const response = await apiClient.post(`/v1/admin/order/${id}/verify-payment`, payload);
    return unwrapData<unknown>(response.data);
  },
  async rejectPayment(id: number, payload: RejectOrderPaymentPayload) {
    const response = await apiClient.post(`/v1/admin/order/${id}/reject-payment`, compactParams(payload));
    return unwrapData<unknown>(response.data);
  },
  async reschedule(id: number, payload: RescheduleOrderPayload) {
    // TODO: Swagger omits reschedule response body shape.
    const response = await apiClient.post(`/v1/admin/order/${id}/reschedule`, payload);
    return unwrapData<unknown>(response.data);
  },
  async cancel(id: number, reason: string) {
    // TODO: Swagger omits cancel response body shape.
    const response = await apiClient.post(`/v1/admin/order/${id}/cancel`, { reason });
    return unwrapData<unknown>(response.data);
  },
  async complete(id: number) {
    // TODO: Swagger omits complete response body shape.
    const response = await apiClient.post(`/v1/admin/order/${id}/complete`);
    return unwrapData<unknown>(response.data);
  },
  async conflicts(id: number) {
    // TODO: Swagger omits conflicts response body shape.
    const response = await apiClient.get(`/v1/admin/order/${id}/conflicts`);
    return unwrapData<unknown>(response.data);
  },
};

export const commentsApi = {
  async list(filters: CommentFilters) {
    // TODO: Swagger defines only { items: array, pagination: object } and omits comment item schema.
    const response = await apiClient.get("/v1/admin/artist-comments", {
      params: compactParams(filters),
    });
    return normalizeList<CommentRecord>(response.data);
  },
  async pending(page?: number, limit?: number) {
    // TODO: Swagger omits pending comments response schema.
    const response = await apiClient.get("/v1/admin/artist-comments/pending", {
      params: compactParams({ page, limit }),
    });
    return normalizeList<CommentRecord>(response.data);
  },
  async detail(id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/artist-comments/${id}`);
    return unwrapData<CommentRecord>(response.data);
  },
  async update(id: number, payload: UpdateCommentPayload) {
    // TODO: Swagger omits update comment response body shape.
    const response = await apiClient.put(`/v1/admin/artist-comments/${id}`, payload);
    return unwrapData<CommentRecord>(response.data);
  },
  async delete(id: number) {
    // TODO: Swagger omits delete comment response body shape.
    const response = await apiClient.delete(`/v1/admin/artist-comments/${id}`);
    return unwrapData<unknown>(response.data);
  },
  async publish(id: number) {
    // TODO: Swagger omits publish response body shape.
    const response = await apiClient.post(`/v1/admin/artist-comments/${id}/publish`);
    return unwrapData<unknown>(response.data);
  },
  async unpublish(id: number) {
    // TODO: Swagger omits unpublish response body shape.
    const response = await apiClient.post(`/v1/admin/artist-comments/${id}/unpublish`);
    return unwrapData<unknown>(response.data);
  },
  async restore(id: number) {
    // TODO: Swagger omits restore response body shape.
    const response = await apiClient.post(`/v1/admin/artist-comments/${id}/restore`);
    return unwrapData<unknown>(response.data);
  },
  async byArtist(artistId: number) {
    // TODO: Swagger omits artist comments response schema.
    const response = await apiClient.get(`/v1/admin/artists/${artistId}/comments`);
    return normalizeList<CommentRecord>(response.data);
  },
};

export const ratingsApi = {
  async list(filters: RatingFilters) {
    // TODO: Swagger defines filters/endpoints but omits the concrete rating item schema.
    const response = await apiClient.get("/v1/admin/artist-ratings", {
      params: compactParams(filters),
    });
    return normalizeList<RatingRecord>(response.data);
  },
  async detail(id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/artist-ratings/${id}`);
    return unwrapData<RatingRecord>(response.data);
  },
  async delete(id: number) {
    // TODO: Swagger omits delete rating response body shape.
    const response = await apiClient.delete(`/v1/admin/artist-ratings/${id}`);
    return unwrapData<unknown>(response.data);
  },
  async byArtist(artistId: number, page?: number, limit?: number) {
    // TODO: Swagger omits artist-specific rating response body shape.
    const response = await apiClient.get(`/v1/admin/artists/${artistId}/ratings`, {
      params: compactParams({ page, limit }),
    });
    return normalizeList<RatingRecord>(response.data);
  },
};

export const notificationsApi = {
  async list(filters: NotificationFilters) {
    // TODO: Swagger documents notification filters but omits the concrete list response schema.
    const response = await apiClient.get("/v1/admin/notifications", {
      params: compactParams(filters),
    });
    return normalizeList<NotificationRecord>(response.data);
  },
  async detail(id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(`/v1/admin/notifications/${id}`);
    return unwrapData<NotificationRecord>(response.data);
  },
  async send(payload: SendNotificationPayload) {
    const response = await apiClient.post("/v1/admin/notifications/send", payload);
    return unwrapData<SendNotificationResult>(response.data);
  },
  async sendAll(payload: SendAllNotificationPayload) {
    // TODO: Swagger omits send-all response body shape.
    const response = await apiClient.post("/v1/admin/notifications/send-all", payload);
    return unwrapData<unknown>(response.data);
  },
};

export const dashboardApi = {
  async stats(filters: DashboardStatsFilters) {
    const response = await apiClient.get("/v1/admin/dashboard/stats", {
      params: compactParams(filters),
    });
    return unwrapData<DashboardStats>(response.data);
  },
  async quickStats() {
    const response = await apiClient.get("/v1/admin/dashboard/quick-stats");
    return unwrapData<DashboardQuickStats>(response.data);
  },
};

export const adminConfigApi = {
  async list() {
    const response = await apiClient.get("/v1/admin/config");
    return unwrapData<AdminConfigItem[]>(response.data);
  },
  async update(payload: AdminConfigUpdatePayload) {
    const response = await apiClient.post("/v1/admin/config", payload);
    return unwrapData<AdminConfigItem[] | AdminConfigItem | UnknownRecord>(response.data);
  },
};

export const trashApi = {
  async stats() {
    // TODO: Swagger omits the concrete trash stats response schema.
    const response = await apiClient.get("/v1/admin/trash/stats");
    return unwrapData<UnknownRecord>(response.data);
  },
  async search(filters: TrashSearchFilters) {
    // TODO: Swagger documents search filters but omits deleted record item schema.
    const response = await apiClient.get("/v1/admin/trash/search", {
      params: compactParams(filters),
    });
    return normalizeList<TrashRecord>(response.data);
  },
  async list(model: TrashModel, filters: TrashListFilters) {
    // TODO: Swagger documents pagination but omits deleted record item schema.
    const response = await apiClient.get(`/v1/admin/trash/${encodeURIComponent(model)}`, {
      params: compactParams(filters),
    });
    return normalizeList<TrashRecord>(response.data);
  },
  async detail(model: TrashModel, id: number) {
    // TODO: Swagger documents this endpoint but omits the concrete response schema.
    const response = await apiClient.get(
      `/v1/admin/trash/${encodeURIComponent(model)}/${id}`,
    );
    return unwrapData<TrashRecord>(response.data);
  },
  async restore(model: TrashModel, id: number) {
    // TODO: Swagger omits restore response body shape.
    const response = await apiClient.post(
      `/v1/admin/trash/${encodeURIComponent(model)}/${id}/restore`,
    );
    return unwrapData<unknown>(response.data);
  },
  async permanentlyDelete(model: TrashModel, id: number) {
    // TODO: Swagger omits permanent delete response body shape.
    const response = await apiClient.delete(
      `/v1/admin/trash/${encodeURIComponent(model)}/${id}`,
    );
    return unwrapData<unknown>(response.data);
  },
};

function normalizeList<T extends object>(payload: unknown): ListResult<T> {
  const data = unwrapData<unknown>(payload);

  if (Array.isArray(data)) {
    return { items: data.filter(isRecord) as T[], raw: data };
  }

  if (isRecord(data)) {
    const source =
      data.items ??
      data.list ??
      data.data ??
      data.results ??
      data.rows ??
      data.records ??
      data.services ??
      data.availability ??
      data.busy_slots ??
      data.gallery ??
      data.videos ??
      data.comments ??
      data.ratings;
    const items = Array.isArray(source) ? (source.filter(isRecord) as T[]) : [];
    const metaSource = data._meta ?? data.pagination ?? data.meta;
    const meta = isRecord(metaSource) ? (metaSource as PaginationMeta) : undefined;
    return { items, meta, raw: data };
  }

  return { items: [], raw: data };
}

export function compactParams<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== "" && value !== undefined && value !== null),
  );
}

function compactParamsWithPerPage<T extends Record<string, unknown>>(values: T) {
  const params = compactParams(values);
  if ("limit" in params) {
    params["per-page"] = params.limit;
    delete params.limit;
  }
  return params;
}

function withDefaultAvailabilityRange(filters: ArtistAvailabilityFilters): ArtistAvailabilityFilters {
  const defaults = getDefaultAvailabilityRange();
  return {
    ...filters,
    date_from: filters.date_from || defaults.date_from,
    date_to: filters.date_to || defaults.date_to,
  };
}

function getDefaultAvailabilityRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 30);

  return {
    date_from: formatApiDate(from),
    date_to: formatApiDate(to),
  };
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
