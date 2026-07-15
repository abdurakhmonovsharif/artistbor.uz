export type Primitive = string | number | boolean | null | undefined;

export type UnknownRecord = Record<string, unknown>;

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

export type PaginationMeta = {
  totalCount?: number;
  pageCount?: number;
  currentPage?: number;
  perPage?: number;
  total?: number;
  page?: number;
  limit?: number;
};

export type ListResult<T = UnknownRecord> = {
  items: T[];
  meta?: PaginationMeta;
  raw: unknown;
};

export type User = {
  id?: number;
  phone?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: "client" | "artist" | "admin" | "moderator" | "operator" | string | number;
  region_id?: number;
  district_id?: number;
  status?: number;
  status_label?: string | number;
  created_at?: number;
};

export type ArtistProfile = {
  id?: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  full_name?: string | null;
  phone?: string;
  email?: string | null;
  region_id?: number | null;
  district_id?: number | null;
  birth_date?: string | null;
  gender?: "male" | "female" | "other" | string | null;
  role?: number | string;
  role_label?: string;
  status?: number | string;
  status_label?: string;
  avatar_url?: string | null;
  created_at?: number;
  bio?: string;
  experience_years?: number;
  is_verified?: boolean;
  is_top?: boolean;
  rating?: number;
  fans_count?: number;
  albums_count?: number;
  extra_phone?: string;
  administrator_name?: string;
  administrator_phone?: string;
  profile_photo_id?: number | null;
  profile_photo_url?: string | null;
  card_last_four?: string | null;
  card_token?: string | null;
  balance?: string | number | null;
  debt?: string | number | null;
  badges?: string[];
  categories?: UnknownRecord[];
  category?: UnknownRecord | null;
  category_id?: number | string | null;
  category_ids?: Array<number | string>;
  gallery?: UnknownRecord[];
  profile?: UnknownRecord | null;
  artistProfile?: UnknownRecord | null;
  artist_profile?: UnknownRecord | null;
};

export type ArtistApplication = {
  id?: number;
  user_id?: number;
  user?: User | UnknownRecord | null;
  category_ids?: number[];
  sub_category_ids?: number[];
  bio?: string;
  albums_count?: number;
  extra_phone?: string;
  administrator_name?: string;
  administrator_phone?: string;
  profile_photo_id?: number;
  profile_photo_url?: string | null;
  status?: string | number;
  status_label?: string;
  rejection_reason?: string;
  created_at?: number;
};

export type OrderRecord = UnknownRecord & {
  id?: number;
  client_id?: number;
  artist_id?: number;
  service_id?: number;
  sub_service_id?: number | null;
  date?: string;
  time?: string;
  time_to?: string | null;
  start_time?: string;
  end_time?: string;
  status?: string | number;
  status_label?: string;
  status_code?: number;
  advance_amount?: string | number | null;
  payment_deadline?: number | null;
  payment_deadline_formatted?: string | null;
  payment_status?: string | number;
  payment_status_label?: string;
  payment_expires_at?: number;
  orderPayments?: OrderPaymentRecord[];
  order_payments?: OrderPaymentRecord[];
  region_id?: number;
  district_id?: number;
  address?: string | null;
  comment?: string | null;
  notes?: string | null;
  total_price?: string | number | null;
  lat?: string | number | null;
  lon?: string | number | null;
  lng?: string | number | null;
  long?: string | number | null;
  created_at?: number;
  updated_at?: number;
};

export type OrderPaymentRecord = UnknownRecord & {
  id?: number;
  order_id?: number;
  type?: "advance" | "full" | string;
  amount?: string | number | null;
  status?: "pending" | "verified" | "rejected" | string;
  receipt_file_id?: number | null;
  receipt_file_url?: string | null;
  paid_amount?: string | number | null;
  notes?: string | null;
  verified_by?: number | null;
  verified_at?: number | null;
  created_at?: number;
  updated_at?: number;
};

export type CommentRecord = UnknownRecord & {
  id?: number;
};

export type RatingRecord = UnknownRecord & {
  id?: number;
  artist_id?: number;
  client_id?: number;
  rating?: number;
  is_published?: number;
};

export type ArtistServiceRecord = UnknownRecord & {
  id?: number;
  artist_id?: number;
  service_id?: number;
  price?: number;
  duration_minutes?: number;
  description?: string;
  note?: string;
  status?: string | number;
  service?: UnknownRecord | null;
  service_name?: string;
  name?: string;
  region_prices?: Array<UnknownRecord & {
    id?: number;
    artist_service_id?: number;
    region_id?: number;
    region_name?: string;
    price?: number | string;
  }>;
};

export type ArtistBalanceRecord = UnknownRecord & {
  balance?: string | number | null;
  debt?: string | number | null;
};

export type ArtistTransactionRecord = UnknownRecord & {
  id?: number;
  type?: string;
  amount?: string | number | null;
  balance_before?: string | number | null;
  balance_after?: string | number | null;
  order_id?: number | null;
  description?: string | null;
  created_at?: number;
};

export type ArtistAvailabilityRecord = UnknownRecord & {
  id?: number;
  artist_id?: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
};

export type ArtistGalleryRecord = UnknownRecord & {
  id?: number;
  artist_id?: number;
  url?: string;
  file_url?: string;
  type?: string;
};

export type ArtistVideoRecord = UnknownRecord & {
  id?: number;
  artist_id?: number;
  youtube_url?: string;
  title?: string;
  title_uz?: string;
  title_ru?: string;
  thumbnail_url?: string;
  embed_url?: string;
  sort_order?: number;
  is_active?: boolean | number;
};

export type NotificationRecord = UnknownRecord & {
  id?: number;
  type?: string;
};

export type TrashRecord = UnknownRecord & {
  id?: number;
};

export type Category = {
  id?: number;
  parent_id?: number | null;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  slug?: string;
  icon?: string | null;
  sort_order?: number;
  status?: number;
  created_at?: number;
  updated_at?: number;
};

export type Service = {
  id?: number;
  parent_id?: number | null;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  slug?: string;
  description_uz?: string | null;
  description_ru?: string | null;
  description_en?: string | null;
  sort_order?: number;
  status?: number;
  created_at?: number;
  updated_at?: number;
};

export type Faq = {
  id?: number;
  question_uz?: string;
  question_ru?: string;
  question_en?: string;
  answer_uz?: string;
  answer_ru?: string;
  answer_en?: string;
  sort_order?: number;
  status?: number;
  created_at?: number;
  updated_at?: number;
};

export type Region = {
  id?: number;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  sort_order?: number;
  status?: number;
  created_at?: number;
  updated_at?: number;
};

export type District = Region & {
  region_id?: number;
};
