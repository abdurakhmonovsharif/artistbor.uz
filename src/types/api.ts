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
  public_id?: string;
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
  public_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string | null;
  stage_name?: string | null;
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
  short_description?: string | null;
  experience_years?: number;
  titles?: string[];
  achievements?: string[];
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
  card_number?: string | null;
  card_number_masked?: string | null;
  card_holder_name?: string | null;
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

export type ArtistApplicationService = UnknownRecord & {
  id?: number;
  service_id?: number;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  description_uz?: string | null;
  description_ru?: string | null;
  description_en?: string | null;
  price?: number | string | null;
  note?: string | null;
  service?: Service | UnknownRecord | null;
};

export type ArtistApplication = UnknownRecord & {
  id?: number;
  public_id?: string;
  user_id?: number;
  user?: User | UnknownRecord | null;
  region_id?: number;
  district_id?: number;
  region?: Region | UnknownRecord | null;
  district?: District | UnknownRecord | null;
  category_ids?: number[];
  sub_category_ids?: number[];
  categories?: Category[];
  sub_categories?: Category[];
  subCategories?: Category[];
  services?: ArtistApplicationService[];
  application_services?: ArtistApplicationService[];
  applicationServices?: ArtistApplicationService[];
  bio?: string;
  albums_count?: number;
  extra_phone?: string;
  administrator_name?: string;
  administrator_phone?: string;
  profile_photo_id?: number;
  profile_photo_url?: string | null;
  is_top?: boolean | number;
  status?: string | number;
  status_label?: string;
  rejection_reason?: string;
  created_at?: number;
};

export type OrderRecord = UnknownRecord & {
  id?: number;
  public_id?: string;
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
  advance_source?: string | null;
  is_advance_custom?: boolean;
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
  completed_at?: number | null;
  auto_completed?: boolean;
  completion?: UnknownRecord | null;
  contract?: OrderContract | null;
};

export type ContractSignature = {
  signed?: boolean;
  signed_at?: number | null;
};

export type OrderContract = UnknownRecord & {
  id?: number;
  contract_id?: number;
  contract_number?: string;
  order_id?: number;
  order_public_id?: string;
  artist_id?: number;
  client_id?: number;
  status?: "draft" | "pending_signatures" | "partially_signed" | "signed" | "cancelled" | string;
  status_label?: string;
  file_url?: string | null;
  has_file?: boolean;
  file_size?: number | null;
  generated_at?: number | null;
  signatures?: {
    artist?: ContractSignature;
    client?: ContractSignature;
  };
  is_fully_signed?: boolean;
  created_at?: number;
  updated_at?: number;
};

export type OrderContractResponse = {
  order_id?: number;
  order_public_id?: string;
  contract?: OrderContract | null;
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
    advance_amount?: number | string | null;
    advance_effective?: number | string | null;
    advance_label?: string | null;
    is_advance_custom?: boolean;
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
  source?: "manual" | "hold" | "order" | string;
  source_label?: string;
  expires_at?: number | null;
  is_expired?: boolean;
  order_id?: number | null;
};

export type AuditLogRecord = UnknownRecord & {
  id?: number;
  admin_id?: number;
  admin_public_id?: string;
  admin_name?: string;
  admin_role?: string;
  admin_role_label?: string;
  action?: string;
  action_label?: string;
  entity_type?: string;
  entity_id?: string | number;
  entity_public_id?: string;
  old_values?: UnknownRecord | null;
  new_values?: UnknownRecord | null;
  metadata?: UnknownRecord | null;
  note?: string | null;
  method?: string;
  route?: string;
  ip?: string;
  user_agent?: string;
  created_at?: number;
  created_at_iso?: string;
};

export type AuditLogMeta = {
  actions?: Array<{ value: string; label: string }>;
  entity_types?: string[];
  roles?: Array<{ value: string; label: string }>;
  admins?: Array<{
    admin_id: number;
    admin_name: string;
    admin_public_id?: string;
    admin_role?: string;
  }>;
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
  public_id?: string;
  type?: string;
};

export type TrashRecord = UnknownRecord & {
  id?: number;
  public_id?: string;
};

export type Category = {
  id?: number;
  public_id?: string;
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
  public_id?: string;
  category_id?: number;
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
  public_id?: string;
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
