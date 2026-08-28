"use client";

import { type ChangeEvent, FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Drawer, Input, Modal, Select, Tabs } from "antd";
import {
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  ExternalLink,
  Eye,
  Folder,
  IdCard,
  ImagePlus,
  Languages,
  ListChecks,
  Loader2,
  LockKeyhole,
  Mail,
  Pencil,
  PlayCircle,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import {
  adminActionButtonLargeClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { AdminDrawer, adminDrawerClassNames, adminDrawerStyles, adminDrawerSubtitleStyles } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  DateFilterSelect,
  getDateFilterPatch,
  inferDateFilterMode,
  type DateFilterValue,
} from "@/components/admin/date-filter-select";
import { FormField, type FormFieldOption } from "@/components/ui/form-field";
import { EmptyState, ErrorState, InlineLoadingState, LoadingState } from "@/components/ui/states";
import { isLocationIdKey, LocationName } from "@/components/admin/location-name";
import { useToast } from "@/components/ui/toast";
import type { Locale } from "@/lib/i18n/translations";
import {
  artistAvailabilityApi,
  artistGalleryApi,
  artistServicesApi,
  artistVideosApi,
  artistsApi,
  categoriesApi,
  commentsApi,
  districtsApi,
  filesApi,
  ratingsApi,
  regionsApi,
  servicesApi,
  usersApi,
  type CreateArtistPayload,
  type ArtistFilters,
  type ArtistRegionPriceRecord,
  type ArtistServiceAssignmentPayload,
  type ArtistServiceRegionPricePayload,
  type ArtistServiceUpdatePayload,
  type UpdateCommentPayload,
  type UpdateArtistPayload,
  type UpdateUserPayload,
  type UploadedFileRecord,
} from "@/lib/api/admin-content";
import { buildArtistBusySlotPayload } from "@/lib/artist-busy-slot";
import {
  findOverlappingArtistAvailabilityInterval,
  formatArtistAvailabilityMonth,
  getArtistAvailabilityOrderPublicId,
  isEditableArtistAvailabilitySource,
  isVisibleArtistAvailabilityRecord,
} from "@/lib/artist-availability";
import { API_BASE_URL } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { canUseAdminAction } from "@/lib/auth/permissions";
import { useI18n } from "@/lib/i18n/i18n-provider";
import {
  getDashboardNotification,
  getDashboardStatus,
  getDashboardStatusDomain,
  type DashboardStatusTone,
} from "@/lib/i18n/dashboard-copy";
import {
  formatMoneyInput,
  formatMoneyWithCurrency,
  currencyFromRecord,
  parseMoneyInput,
} from "@/lib/money-format";
import { formatPhone, normalizePhoneForApi } from "@/lib/phone-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLatestRequest } from "@/lib/use-latest-request";
import { cn, isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type {
  ArtistBalanceRecord,
  ArtistProfile,
  ArtistTransactionRecord,
  Category,
  District,
  ListResult,
  Region,
  Service,
  UnknownRecord,
} from "@/types/api";

type DialogState =
  | { type: "create" }
  | { type: "view"; artist: ArtistProfile; detailLoading: boolean }
  | { type: "edit"; artist: ArtistProfile }
  | null;

type DetailTab = "profile" | "services" | "finance" | "availability" | "gallery" | "videos" | "comments" | "ratings";
type ResourceTab = Exclude<DetailTab, "profile">;
type ArtistFormTab = "basic" | "profile" | "services" | "account";
type DetailResourceState = {
  loading: boolean;
  loaded?: boolean;
  error: string | null;
  rows: UnknownRecord[];
  meta?: ListResult<UnknownRecord>["meta"];
  raw?: unknown;
};

type ResourceReloadOptions = { background?: boolean };
type AvailabilityRange = { date_from: string; date_to: string };
type AvailabilityReloadOptions = ResourceReloadOptions & Partial<AvailabilityRange>;
type AvailabilityRangeReloader = (range: AvailabilityRange) => Promise<boolean>;
type ResourceReloader = (options?: ResourceReloadOptions) => Promise<void>;
type ScheduleDrawerState = { schedule: UnknownRecord };
type BusySlotDialogState =
  | { mode: "create"; row?: AvailabilityRow; date?: string }
  | { mode: "edit"; row: AvailabilityRow }
  | null;
type BusySlotFormValues = {
  date: string;
  start_time: string;
  end_time: string;
  note: string;
};

const limit = 20;
const MAX_GALLERY_FILE_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY_FILES = 10;

const initialFilters: ArtistFilters = {
  search: "",
  is_verified: "",
  is_top: "",
  status: "",
  date_from: "",
  date_to: "",
  sort: "-created_at",
  page: 1,
  limit,
};

const resourceTabs: ResourceTab[] = ["services", "finance", "availability", "gallery", "videos", "comments", "ratings"];

type ArtistsLabels = ReturnType<typeof getArtistsLabels>;

function getDetailTabs(
  labels: ArtistsLabels,
  permissions: { canViewVideos: boolean; canModerateComments: boolean },
): { key: DetailTab; label: string }[] {
  return [
    { key: "profile", label: labels.profile },
    { key: "services", label: labels.services },
    { key: "finance", label: labels.finance },
    { key: "availability", label: labels.availability },
    { key: "gallery", label: labels.gallery },
    ...(permissions.canViewVideos ? [{ key: "videos" as const, label: labels.videos }] : []),
    ...(permissions.canModerateComments ? [{ key: "comments" as const, label: labels.comments }] : []),
    { key: "ratings", label: labels.ratings },
  ];
}

function mergeArtistCategoryFallback(row: ArtistProfile, detail: ArtistProfile): ArtistProfile {
  const rowRecord = row as UnknownRecord;
  const detailRecord = detail as UnknownRecord;
  const merged: UnknownRecord = { ...detailRecord };

  for (const key of ["categories", "category", "category_ids", "category_id", "artistCategories", "artist_categories"]) {
    if (!hasMeaningfulValue(merged[key]) && hasMeaningfulValue(rowRecord[key])) {
      merged[key] = rowRecord[key];
    }
  }

  const rowArtistProfile = firstRecordValue(rowRecord, ["artistProfile", "artist_profile"]);
  const detailArtistProfile = firstRecordValue(detailRecord, ["artistProfile", "artist_profile"]);
  if (rowArtistProfile) {
    const nested = { ...(detailArtistProfile ?? {}) };
    for (const key of ["categories", "category", "category_ids", "category_id", "artistCategories", "artist_categories"]) {
      if (!hasMeaningfulValue(nested[key]) && hasMeaningfulValue(rowArtistProfile[key])) {
        nested[key] = rowArtistProfile[key];
      }
    }
    if (Object.keys(nested).length) {
      merged.artistProfile = nested;
    }
  }

  return merged as ArtistProfile;
}

export default function ArtistsPage() {
  const [filters, setFilters] = useState<ArtistFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ArtistFilters>(initialFilters);
  const [rows, setRows] = useState<ArtistProfile[]>([]);
  const [meta, setMeta] = useState<ListResult<ArtistProfile>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dateFilterMode, setDateFilterMode] = useState(() => inferDateFilterMode(initialFilters));
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);
  const toast = useToast();
  const startListRequest = useLatestRequest(filters);
  const debouncedSearch = useDebouncedValue(draftFilters.search ?? "", 450);

  const fetchArtists = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startListRequest();
    if (!background) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await artistsApi.list(filters);
      if (!isLatestRequest()) return;
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : labels.loadFailed;
      if (background) toast.error(message);
      else setError(message);
    } finally {
      if (isLatestRequest()) setLoading(false);
    }
  }, [filters, labels.loadFailed, startListRequest, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchArtists();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchArtists]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextLimit = Number(current.limit) || limit;
        const next: ArtistFilters = {
          ...current,
          search: debouncedSearch,
          page: 1,
          limit: nextLimit,
        };

        if (
          (current.search ?? "") === next.search &&
          Number(current.page ?? 1) === next.page &&
          Number(current.limit ?? limit) === next.limit
        ) {
          return current;
        }

        return next;
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [debouncedSearch]);

  const openDialog = async (type: "view" | "edit", row: ArtistProfile) => {
    const artistId = getArtistId(row);
    if (!artistId) return;

    if (type === "view") {
      setDialog({ type, artist: row, detailLoading: true });
      try {
        const artist = await artistsApi.detail(artistId);
        setDialog((current) =>
          current?.type === "view" && getArtistId(current.artist) === artistId
            ? { type, artist: mergeArtistCategoryFallback(row, artist), detailLoading: false }
            : current,
        );
      } catch (caught) {
        setDialog((current) =>
          current?.type === "view" && getArtistId(current.artist) === artistId
            ? { ...current, detailLoading: false }
            : current,
        );
        toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
      }
      return;
    }

    setSubmitting(true);
    try {
      const artist = await artistsApi.detail(artistId);
      setDialog({ type, artist: mergeArtistCategoryFallback(row, artist) });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1, limit: Number(filters.limit) || limit });
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    setDateFilterMode(inferDateFilterMode(initialFilters));
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, limit: nextLimit }));
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const changeDraftFilter = (next: Partial<ArtistFilters>) => {
    setDraftFilters((current) => ({ ...current, ...next }));
    setFilters((current) => ({
      ...current,
      ...next,
      page: 1,
      limit: Number(current.limit) || limit,
    }));
  };

  const changeDateFilter = (value: DateFilterValue) => {
    setDateFilterMode(value.mode);
    changeDraftFilter(getDateFilterPatch(value));
  };

  const page = Number(filters.page ?? 1);

  return (
    <section className="artistbor-admin-page artistbor-responsive-data-page w-full space-y-4">
      <AdminPageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        actions={(
          <button
            type="button"
            onClick={() => setDialog({ type: "create" })}
            className={cn(adminActionButtonLargeClass, "w-full md:w-auto")}
          >
            <Plus className="size-4" />
            {labels.createArtist}
          </button>
        )}
      />

      <form
        onSubmit={applyFilters}
        className="artistbor-table-filter-shell artistbor-responsive-filter-shell"
      >
        <div className="artistbor-table-filter-panel artistbor-responsive-filter-panel">
          <Input
            allowClear
            prefix={<Search className="size-4 text-[#94a3b8]" />}
            placeholder={labels.searchPlaceholder}
            value={draftFilters.search ?? ""}
            onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
            className={cn(
              "artistbor-table-filter-control artistbor-filter-search artistbor-artist-search h-10",
              draftFilters.search && "artistbor-filter-search-active",
            )}
          />
          <Select
            className="artistbor-compact-select artistbor-table-filter-control !h-10 !w-[170px] shrink-0 md:justify-self-start"
            value={draftFilters.status ?? ""}
            onChange={(status) => changeDraftFilter({ status })}
            options={[
              { label: `${labels.status}: ${labels.all}`, value: "" },
              ...artistStatusOptions(labels),
            ]}
          />

          <Select
            className="artistbor-compact-select artistbor-table-filter-control !h-10 !w-[210px] shrink-0 md:justify-self-start"
            value={draftFilters.is_verified ?? ""}
            onChange={(is_verified) => changeDraftFilter({ is_verified })}
            options={[
              { label: `${labels.verified}: ${labels.all}`, value: "" },
              { label: labels.yes, value: 1 },
              { label: labels.no, value: 0 },
            ]}
          />
          <DateFilterSelect
            value={{
              mode: dateFilterMode,
              date_from: draftFilters.date_from ?? "",
              date_to: draftFilters.date_to ?? "",
            }}
            labels={{
              label: labels.dateFilter,
              newest: labels.newest,
              oldest: labels.oldest,
              custom: labels.custom,
              from: labels.dateFrom,
              to: labels.dateTo,
            }}
            inputClassName="!rounded-xl !text-[13px]"
            onChange={changeDateFilter}
          />
          <Button
            htmlType="button"
            className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 w-28 shrink-0"
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            {labels.reset}
          </Button>
        </div>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ArtistsTable
          rows={rows}
          labels={labels}
          onEdit={(row) => void openDialog("edit", row)}
          onView={(row) => void openDialog("view", row)}
        />
      )}

      <ArtistsPagination
        meta={meta}
        page={page}
        pageSize={Number(filters.limit) || limit}
        labels={labels}
        onPageChange={changePage}
        onPageSizeChange={changePageSize}
      />

      <ArtistDrawer
        artist={dialog && dialog.type !== "create" ? dialog.artist : null}
        detailLoading={dialog?.type === "view" ? dialog.detailLoading : false}
        mode={dialog && dialog.type !== "create" ? dialog.type : "view"}
        loading={submitting}
        open={Boolean(dialog && dialog.type !== "create")}
        onClose={() => setDialog(null)}
        onEdit={(artist) => setDialog({ type: "edit", artist })}
        onSubmit={async (payload) => {
          if (!dialog || dialog.type === "create") return;
          const artistId = getArtistId(dialog.artist);
          if (!artistId) return;
          setSubmitting(true);
          try {
            const updatePayloads = splitArtistUpdatePayload(payload, dialog.artist);
            if (updatePayloads.userPayload) {
              await usersApi.update(artistId, updatePayloads.userPayload);
            }
            if (Object.keys(updatePayloads.artistPayload).length) {
              await artistsApi.update(artistId, updatePayloads.artistPayload);
            }
            toast.success(labels.updated);
            setDialog(null);
            void fetchArtists({ background: true });
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : labels.updateFailed);
          } finally {
            setSubmitting(false);
          }
        }}
      />

      {dialog?.type === "create" ? (
        <CreateArtistDrawer
          open
          loading={submitting}
          labels={labels}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await artistsApi.create(payload);
              toast.success(labels.created);
              setDialog(null);
              void fetchArtists({ background: true });
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.createFailed);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function ArtistsTable({
  rows,
  labels,
  onView,
  onEdit,
}: {
  rows: ArtistProfile[];
  labels: ArtistsLabels;
  onView: (row: ArtistProfile) => void;
  onEdit: (row: ArtistProfile) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]">
      <div
        role="region"
        tabIndex={0}
        aria-label={labels.tableRegionLabel}
        className="admin-table-scroll artistbor-artists-data-table overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-artistbor-accent"
      >
        <table className="min-w-full w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[280px]" />
            <col className="w-[170px]" />
            <col className="w-28" />
            <col className="w-[120px]" />
            <col className="w-[170px]" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="h-11 bg-[#f8fafc] dark:bg-white/[0.03]">
              <ArtistTableHead label={labels.id} sortable />
              <ArtistTableHead label={labels.artist} />
              <ArtistTableHead label={labels.contact} />
              <ArtistTableHead label={labels.status} />
              <ArtistTableHead label={labels.rating} sortable />
              <ArtistTableHead label={labels.lastActivity} sortable />
              <ArtistTableHead label={labels.actions} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${getArtistId(row) ?? "artist"}-${index}`} className="group h-16 transition hover:bg-[#fffaf3] dark:hover:bg-amber-500/[0.04]">
                <td className="whitespace-nowrap border-b border-[#edf2f7] px-3 py-[9px] align-middle text-[13px] font-semibold text-[#64748b] dark:border-white/10 dark:text-slate-400">
                  {toDisplay(row.public_id)}
                </td>
                <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
                  <ArtistIdentityCell artist={row} labels={labels} />
                </td>
                <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
                  <ArtistContactCell artist={row} />
                </td>
                <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
                  <ArtistStatusPill artist={row} labels={labels} />
                </td>
                <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
                  <ArtistRatingCell artist={row} />
                </td>
                <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle text-[13px] font-medium text-[#475569] dark:border-white/10 dark:text-slate-300">
                  {formatArtistActivityDate(getArtistActivityDate(row), labels.locale)}
                </td>
                <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
                  <div className="flex items-center justify-end gap-1.5">
                    <ArtistTableActionButton label={labels.detailTitle} onClick={() => onView(row)}>
                      <Eye className="size-4" />
                    </ArtistTableActionButton>
                    <ArtistTableActionButton label={labels.editTitle} onClick={() => onEdit(row)}>
                      <Pencil className="size-4" />
                    </ArtistTableActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArtistTableHead({
  label,
  sortable,
  align = "left",
}: {
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "border-b border-[#e6ebf2] px-3 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <span className={cn("inline-flex items-center gap-1.5", align === "right" && "justify-end")}>
        {label}
        {sortable ? <ArrowDownUp className="size-3 text-[#94a3b8]" /> : null}
      </span>
    </th>
  );
}

function ArtistIdentityCell({ artist, labels }: { artist: ArtistProfile; labels: ArtistsLabels }) {
  const photoUrl = getArtistPhotoUrl(artist);
  const artistName = getArtistName(artist, labels);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {photoUrl ? (
        <div
          aria-label={artistName}
          className="size-9 shrink-0 rounded-full border border-[#e6ebf2] bg-cover bg-center dark:border-white/10"
          style={{ backgroundImage: `url(${photoUrl})` }}
        />
      ) : (
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fff7ed] text-xs font-bold text-[#f97316] ring-1 ring-[#fed7aa] dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20">
          {getArtistInitials(artist, labels)}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
            {artistName}
          </p>
          {isVerifiedArtist(artist) ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-label={labels.verified} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ArtistContactCell({ artist }: { artist: ArtistProfile }) {
  const phone = getArtistTablePhone(artist);
  const secondary = getArtistSecondaryContact(artist);

  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
        {phone}
      </p>
      {secondary ? (
        <p className="truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}

function ArtistStatusPill({ artist, labels }: { artist: ArtistProfile; labels: ArtistsLabels }) {
  const rawStatus = artist.status ?? artist.status_label ?? (isDeletedArtist(artist) ? "0" : "10");
  const status = getDashboardStatus("account", rawStatus, labels.locale);
  const tone = toArtistStatusTone(status.tone);

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]",
        tone === "danger"
          ? "bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
          : tone === "neutral"
            ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10"
            : tone === "warning"
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
              : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
      )}
    >
      {status.label}
    </span>
  );
}

function ArtistRatingCell({ artist }: { artist: ArtistProfile }) {
  const rating = getArtistTableRating(artist);

  if (rating === undefined) {
    return <span className="text-sm font-bold text-[#94a3b8]">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Star className="size-4 fill-[#f59e0b] text-[#f59e0b]" />
      <span className="text-[13px] font-bold text-[#0f172a] dark:text-white">
        {formatNumberValue(rating, "—")}
      </span>
    </div>
  );
}

function ArtistTableActionButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
    >
      {children}
    </button>
  );
}

function ArtistsPagination({
  meta,
  page,
  pageSize,
  labels,
  onPageChange,
  onPageSizeChange,
}: {
  meta?: ListResult<ArtistProfile>["meta"];
  page: number;
  pageSize: number;
  labels: ArtistsLabels;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { t } = useI18n();
  const limitValue = normalizePositiveNumber(pageSize || meta?.perPage || meta?.limit, limit);
  const currentPage = normalizePositiveNumber(meta?.currentPage ?? meta?.page ?? page, 1);
  const total = getArtistTotalFromMeta(meta);
  const pageCount = Math.max(
    1,
    normalizePositiveNumber(meta?.pageCount, 0) || (total > 0 ? Math.ceil(total / limitValue) : 1),
  );
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;
  const firstItem = total === 0 ? 0 : (currentPage - 1) * limitValue + 1;
  const lastItem = total === 0 ? 0 : Math.min(currentPage * limitValue, total);
  const rangeLabel = t("pagination.rangeTotal", { from: firstItem, to: lastItem, total });

  return (
    <nav
      aria-label={t("pagination.label")}
      className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-[18px] border border-artistbor-border bg-artistbor-surface px-3 text-sm font-semibold text-artistbor-secondary shadow-[var(--artistbor-surface-shadow)]"
    >
        <span className="whitespace-nowrap text-xs font-semibold text-artistbor-secondary">
          {rangeLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <ArtistPaginationButton
            label={t("pagination.first")}
            disabled={!canGoPrevious}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="size-4" />
          </ArtistPaginationButton>
          <ArtistPaginationButton
            label={t("pagination.previous")}
            disabled={!canGoPrevious}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="size-4" />
          </ArtistPaginationButton>
          <div className="flex items-center gap-1">
            {getArtistVisiblePages(currentPage, pageCount).map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={cn(
                  "grid size-8 place-items-center rounded-lg text-xs font-bold transition",
                  pageNumber === currentPage
                    ? "bg-[#fff7ed] text-[#f97316] ring-1 ring-[#fed7aa] dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20"
                    : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white",
                )}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <ArtistPaginationButton
            label={t("pagination.next")}
            disabled={!canGoNext}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="size-4" />
          </ArtistPaginationButton>
          <ArtistPaginationButton
            label={t("pagination.last")}
            disabled={!canGoNext}
            onClick={() => onPageChange(pageCount)}
          >
            <ChevronsRight className="size-4" />
          </ArtistPaginationButton>
          <Select
            className="artistbor-pagination-select ml-1 shrink-0"
            value={limitValue}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={[20, 50, 100].map((option) => ({ label: `${option} / ${labels.page.toLowerCase()}`, value: option }))}
            aria-label={t("pagination.perPage")}
          />
        </div>
    </nav>
  );
}

function ArtistPaginationButton({
  label,
  disabled,
  children,
  onClick,
}: {
  label: string;
  disabled: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-artistbor-secondary transition-colors duration-200 hover:bg-artistbor-surface-subtle hover:text-artistbor-primary disabled:cursor-not-allowed disabled:text-artistbor-muted"
    >
      {children}
    </button>
  );
}

function getArtistTotalFromMeta(meta?: ListResult<ArtistProfile>["meta"], fallback = 0) {
  return normalizePositiveNumber(meta?.totalCount ?? meta?.total, fallback);
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function getArtistVisiblePages(page: number, pageCount: number) {
  const visibleCount = Math.min(5, pageCount);
  let start = Math.max(1, page - Math.floor(visibleCount / 2));
  const endOverflow = start + visibleCount - 1 - pageCount;

  if (endOverflow > 0) start = Math.max(1, start - endOverflow);

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

function getArtistTablePhone(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  const nested = firstRecordValue(record, ["user", "profile", "artistProfile", "artist_profile"]);
  const source = nested ? { ...record, ...nested } : record;
  const value = firstMeaningfulValue(source, ["phone", "extra_phone", "administrator_phone"]);
  return value ? formatPhone(value) || toDisplay(value) : "—";
}

function getArtistSecondaryContact(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  const nested = firstRecordValue(record, ["user", "profile", "artistProfile", "artist_profile"]);
  const source = nested ? { ...record, ...nested } : record;
  const telegram = firstMeaningfulValue(source, ["telegram", "telegram_username", "telegram_url"]);

  if (telegram) return toDisplay(telegram);

  const email = firstMeaningfulValue(source, ["email"]);
  return email ? toDisplay(email) : "";
}

function getArtistTableRating(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  const nested = firstRecordValue(record, ["profile", "artistProfile", "artist_profile", "rating_info"]);
  const source = nested ? { ...record, ...nested } : record;
  return numericValue(firstMeaningfulValue(source, ["rating", "average_rating", "avg_rating", "rating_avg"]));
}

function isVerifiedArtist(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  const nested = firstRecordValue(record, ["user", "profile", "artistProfile", "artist_profile"]);
  const source = nested ? { ...record, ...nested } : record;
  return isTruthyValue(firstMeaningfulValue(source, ["is_verified", "verified", "is_confirmed"]));
}

function isTruthyValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "ha", "да"].includes(value.trim().toLowerCase());
}

function getArtistActivityDate(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  const nested = firstRecordValue(record, ["user", "profile", "artistProfile", "artist_profile"]);
  const source = nested ? { ...record, ...nested } : record;
  return firstMeaningfulValue(source, ["last_active_at", "last_seen_at", "last_login_at", "updated_at", "created_at"]);
}

function formatArtistActivityDate(value: unknown, locale: Locale) {
  if (!hasMeaningfulValue(value)) return "—";

  if (typeof value === "number") return normalizeDate(value);

  if (typeof value === "string") {
    const trimmed = value.trim();
    const timestamp = Date.parse(trimmed);

    if (Number.isFinite(timestamp)) {
      return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
      }).format(new Date(timestamp));
    }

    return trimmed || "—";
  }

  return toDisplay(value);
}

function ArtistDrawer({
  artist,
  detailLoading,
  mode,
  loading,
  open,
  onClose,
  onEdit,
  onSubmit,
}: {
  artist: ArtistProfile | null;
  detailLoading: boolean;
  mode: "view" | "edit";
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onEdit: (artist: ArtistProfile) => void;
  onSubmit: (payload: UpdateArtistPayload) => Promise<void>;
}) {
  const { locale } = useI18n();
  const { user } = useAuth();
  const labels = getArtistsLabels(locale);
  const canViewArtistVideos = canUseAdminAction(user?.role, "artistVideosRead");
  const canModerateArtistComments = canUseAdminAction(user?.role, "artistCommentsModerate");
  const canManageArtistServices = canUseAdminAction(user?.role, "artistServicesManage");
  const canManageArtistAvailability = canUseAdminAction(user?.role, "artistAvailabilityManage");
  const canManageArtistGallery = canUseAdminAction(user?.role, "artistGalleryManage");
  const detailTabs = getDetailTabs(labels, {
    canViewVideos: canViewArtistVideos,
    canModerateComments: canModerateArtistComments,
  });
  const [activeTab, setActiveTab] = useState<DetailTab>("profile");
  const [resources, setResources] = useState<Record<ResourceTab, DetailResourceState>>(
    createDetailResources,
  );
  const loadedResourceTabs = useRef<Set<ResourceTab>>(new Set());
  const resourceArtistId = useRef<number | undefined>(undefined);
  const resourceRequestIds = useRef<Record<ResourceTab, number>>(createResourceRequestIds());
  const [scheduleDrawer, setScheduleDrawer] = useState<ScheduleDrawerState | null>(null);
  const [serviceManagementOpen, setServiceManagementOpen] = useState(false);
  const artistId = artist ? getArtistId(artist) : undefined;
  const hasArtist = Boolean(artist);
  const formId = artistId ? `artist-edit-form-${artistId}` : "artist-edit-form";
  const toast = useToast();

  const startResourceRequest = useCallback((key: ResourceTab, currentArtistId: number) => {
    const requestId = ++resourceRequestIds.current[key];
    return () => (
      resourceRequestIds.current[key] === requestId
      && resourceArtistId.current === currentArtistId
    );
  }, []);

  useEffect(() => {
    if (!detailTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab("profile");
    }
  }, [activeTab, detailTabs]);

  useEffect(() => {
    resourceArtistId.current = artistId;
    loadedResourceTabs.current.clear();
    resourceTabs.forEach((key) => {
      resourceRequestIds.current[key] += 1;
    });
    setActiveTab("profile");

    if (!hasArtist) {
      setResources(createDetailResources());
      return;
    }

    const initialResources = createDetailResources();
    if (!canViewArtistVideos) initialResources.videos = { loading: false, error: null, rows: [] };
    if (!canModerateArtistComments) initialResources.comments = { loading: false, error: null, rows: [] };
    setResources(initialResources);
    if (!artistId) {
      setResources(createDetailResources(false, labels.artistIdMissing));
    }
  }, [artistId, canModerateArtistComments, canViewArtistVideos, hasArtist, labels.artistIdMissing]);

  useEffect(() => {
    if (!artistId || mode !== "view" || activeTab === "profile") return;
    if (activeTab === "videos" && !canViewArtistVideos) return;
    if (activeTab === "comments" && !canModerateArtistComments) return;
    if (loadedResourceTabs.current.has(activeTab)) return;

    loadedResourceTabs.current.add(activeTab);
    const currentArtistId = artistId;
    const resourceKey = activeTab;
    const isLatestRequest = startResourceRequest(resourceKey, currentArtistId);

    setResources((current) => ({
      ...current,
      [resourceKey]: {
        ...current[resourceKey],
        loading: true,
        error: null,
      },
    }));

    async function loadResource<T extends object>(
      key: ResourceTab,
      request: Promise<ListResult<T>>,
    ) {
      try {
        const result = await request;
        if (!isLatestRequest()) return;
        setResources((current) => ({
          ...current,
          [key]: {
            loading: false,
            error: null,
            rows: result.items as UnknownRecord[],
            meta: result.meta,
            raw: result.raw,
          },
        }));
      } catch (caught) {
        if (!isLatestRequest()) return;
        loadedResourceTabs.current.delete(key);
        setResources((current) => ({
          ...current,
          [key]: {
            ...current[key],
            loading: false,
            error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
          },
        }));
      }
    }

    async function loadFinance() {
      try {
        const [balance, transactions] = await Promise.all([
          artistsApi.balance(currentArtistId),
          artistsApi.transactions(currentArtistId),
        ]);
        if (!isLatestRequest()) return;
        setResources((current) => ({
          ...current,
          finance: {
            loading: false,
            error: null,
            rows: Array.isArray(transactions) ? (transactions as UnknownRecord[]) : [],
            raw: balance,
          },
        }));
      } catch (caught) {
        if (!isLatestRequest()) return;
        loadedResourceTabs.current.delete("finance");
        setResources((current) => ({
          ...current,
          finance: {
            ...current.finance,
            loading: false,
            error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
          },
        }));
      }
    }

    if (resourceKey === "services") {
      void loadResource("services", artistServicesApi.list({ artist_id: currentArtistId }));
    } else if (resourceKey === "finance") {
      void loadFinance();
    } else if (resourceKey === "availability") {
      void loadResource("availability", artistAvailabilityApi.list(currentArtistId));
    } else if (resourceKey === "gallery") {
      void loadResource("gallery", artistGalleryApi.list({ artist_id: currentArtistId }));
    } else if (resourceKey === "videos") {
      void loadResource("videos", artistVideosApi.list({ artist_id: currentArtistId }));
    } else if (resourceKey === "comments") {
      void loadResource("comments", commentsApi.byArtist(currentArtistId));
    } else {
      void loadResource("ratings", ratingsApi.byArtist(currentArtistId, 1, limit));
    }
  }, [
    activeTab,
    artistId,
    canModerateArtistComments,
    canViewArtistVideos,
    labels.resourceLoadFailed,
    mode,
    startResourceRequest,
  ]);

  const reloadServices = useCallback(async ({ background = false }: ResourceReloadOptions = {}) => {
    if (!artistId) return;
    const currentArtistId = artistId;
    const isLatestRequest = startResourceRequest("services", currentArtistId);

    if (!background) {
      setResources((current) => ({
        ...current,
        services: {
          ...current.services,
          loading: true,
          error: null,
        },
      }));
    }

    try {
      const result = await artistServicesApi.list({ artist_id: currentArtistId });
      if (!isLatestRequest()) return;
      setResources((current) => ({
        ...current,
        services: {
          loading: false,
          error: null,
          rows: result.items as UnknownRecord[],
          meta: result.meta,
          raw: result.raw,
        },
      }));
    } catch (caught) {
      if (!isLatestRequest()) return;
      if (background) {
        toast.error(caught instanceof Error ? caught.message : labels.resourceLoadFailed);
      } else {
        setResources((current) => ({
          ...current,
          services: {
            ...current.services,
            loading: false,
            error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
          },
        }));
      }
    }
  }, [artistId, labels.resourceLoadFailed, startResourceRequest, toast]);

  const reloadAvailability = useCallback(async ({
    background = false,
    date_from,
    date_to,
  }: AvailabilityReloadOptions = {}): Promise<boolean> => {
    if (!artistId) return false;
    const currentArtistId = artistId;
    const isLatestRequest = startResourceRequest("availability", currentArtistId);

    if (!background) {
      setResources((current) => ({
        ...current,
        availability: {
          ...current.availability,
          loading: true,
          error: null,
        },
      }));
    }

    try {
      const result = await artistAvailabilityApi.list(currentArtistId, { date_from, date_to });
      if (!isLatestRequest()) return false;
      setResources((current) => ({
        ...current,
        availability: {
          loading: false,
          error: null,
          rows: result.items as UnknownRecord[],
          meta: result.meta,
          raw: result.raw,
        },
      }));
      return true;
    } catch (caught) {
      if (!isLatestRequest()) return false;
      if (background) {
        toast.error(caught instanceof Error ? caught.message : labels.resourceLoadFailed);
      } else {
        setResources((current) => ({
          ...current,
          availability: {
            ...current.availability,
            loading: false,
            error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
          },
        }));
      }
      return false;
    }
  }, [artistId, labels.resourceLoadFailed, startResourceRequest, toast]);

  const reloadGallery = useCallback(async ({ background = false }: ResourceReloadOptions = {}) => {
    if (!artistId) return;
    const currentArtistId = artistId;
    const isLatestRequest = startResourceRequest("gallery", currentArtistId);

    if (!background) {
      setResources((current) => ({
        ...current,
        gallery: { ...current.gallery, loading: true, error: null },
      }));
    }

    try {
      const result = await artistGalleryApi.list({ artist_id: currentArtistId });
      if (!isLatestRequest()) return;
      setResources((current) => ({
        ...current,
        gallery: {
          loading: false,
          error: null,
          rows: result.items as UnknownRecord[],
          meta: result.meta,
          raw: result.raw,
        },
      }));
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : labels.resourceLoadFailed;
      if (background) toast.error(message);
      else {
        setResources((current) => ({
          ...current,
          gallery: { ...current.gallery, loading: false, error: message },
        }));
      }
    }
  }, [artistId, labels.resourceLoadFailed, startResourceRequest, toast]);

  const reloadComments = useCallback(async ({ background = false }: ResourceReloadOptions = {}) => {
    if (!artistId || !canModerateArtistComments) return;
    const currentArtistId = artistId;
    const isLatestRequest = startResourceRequest("comments", currentArtistId);

    if (!background) {
      setResources((current) => ({
        ...current,
        comments: {
          ...current.comments,
          loading: true,
          error: null,
        },
      }));
    }

    try {
      const result = await commentsApi.byArtist(currentArtistId);
      if (!isLatestRequest()) return;
      setResources((current) => ({
        ...current,
        comments: {
          loading: false,
          error: null,
          rows: result.items as UnknownRecord[],
          meta: result.meta,
          raw: result.raw,
        },
      }));
    } catch (caught) {
      if (!isLatestRequest()) return;
      if (background) {
        toast.error(caught instanceof Error ? caught.message : labels.resourceLoadFailed);
      } else {
        setResources((current) => ({
          ...current,
          comments: {
            ...current.comments,
            loading: false,
            error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
          },
        }));
      }
    }
  }, [artistId, canModerateArtistComments, labels.resourceLoadFailed, startResourceRequest, toast]);

  const reloadRatings = useCallback(async ({ background = false }: ResourceReloadOptions = {}) => {
    if (!artistId) return;
    const currentArtistId = artistId;
    const isLatestRequest = startResourceRequest("ratings", currentArtistId);

    if (!background) {
      setResources((current) => ({
        ...current,
        ratings: {
          ...current.ratings,
          loading: true,
          error: null,
        },
      }));
    }

    try {
      const result = await ratingsApi.byArtist(currentArtistId, 1, limit);
      if (!isLatestRequest()) return;
      setResources((current) => ({
        ...current,
        ratings: {
          loading: false,
          error: null,
          rows: result.items as UnknownRecord[],
          meta: result.meta,
          raw: result.raw,
        },
      }));
    } catch (caught) {
      if (!isLatestRequest()) return;
      if (background) {
        toast.error(caught instanceof Error ? caught.message : labels.resourceLoadFailed);
      } else {
        setResources((current) => ({
          ...current,
          ratings: {
            ...current.ratings,
            loading: false,
            error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
          },
        }));
      }
    }
  }, [artistId, labels.resourceLoadFailed, startResourceRequest, toast]);

  if (!artist) return null;

  const managedSchedule = scheduleDrawer
    ? scheduleRecordsFromState(resources.availability, artist)[0] ?? scheduleDrawer.schedule
    : null;

  return (
    <>
    <Drawer
      open={open}
      onClose={onClose}
      size={mode === "view" ? "min(100vw, 760px)" : "min(100vw, 800px)"}
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={adminDrawerClassNames}
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
            {mode === "edit" ? `${labels.editTitle} · ${artist.public_id ?? "—"}` : `${labels.artist} ${artist.public_id ?? "—"}`}
          </span>
          <ArtistHeaderBadge
            label={formatEnumValue("status", artist.status ?? artist.status_label, labels)}
            tone={isDeletedArtist(artist) ? "danger" : "neutral"}
          />
          {artist.is_top ? <ArtistHeaderBadge label={labels.top} tone="warning" /> : null}
        </div>
      }
      footer={
        <ArtistDrawerActions
          formId={formId}
          loading={loading}
          mode={mode}
          onClose={onClose}
          onEdit={() => onEdit(artist)}
        />
      }
      styles={adminDrawerStyles}
    >
      <div className="space-y-3.5 p-4">
        {detailLoading ? <InlineLoadingState /> : null}
        <ArtistDrawerProfile artist={artist} labels={labels} />

        {mode === "edit" ? (
          <EditArtistForm
            key={formId}
            artist={artist}
            formId={formId}
            onSubmit={onSubmit}
          />
        ) : (
          <Tabs
            activeKey={activeTab}
            className="artistbor-drawer-tabs"
            items={detailTabs.map((tab) => ({
              key: tab.key,
              label: (
                <span className="inline-flex items-center">
                  {tab.label}
                  {tab.key !== "profile" ? <TabStateBadge state={resources[tab.key]} /> : null}
                </span>
              ),
              children:
                tab.key === "profile" ? (
                  <ArtistProfileTab artist={artist} labels={labels} />
                ) : tab.key === "services" ? (
                  <ArtistServicesTab
                    artistId={artistId}
                    state={resources.services}
                    labels={labels}
                    onChanged={reloadServices}
                    readOnly
                    onManage={canManageArtistServices ? () => {
                      setServiceManagementOpen(true);
                      void reloadServices();
                    } : undefined}
                  />
                ) : tab.key === "finance" ? (
                  <ArtistFinanceTab
                    labels={labels}
                    state={resources.finance}
                  />
                ) : tab.key === "availability" ? (
                  <ArtistScheduleSummaryTab
                    artist={artist}
                    labels={labels}
                    state={resources.availability}
                    onRangeChange={(range) => reloadAvailability({ ...range, background: true })}
                    onManage={canManageArtistAvailability ? (schedule) => {
                      setScheduleDrawer({ schedule });
                    } : undefined}
                  />
                ) : tab.key === "gallery" ? (
                  <ArtistGalleryTab
                    artistId={artistId}
                    canManage={canManageArtistGallery}
                    state={resources.gallery}
                    labels={labels}
                    onChanged={reloadGallery}
                  />
                ) : tab.key === "videos" ? (
                  <ArtistVideosSummary artistId={artistId} state={resources.videos} />
                ) : tab.key === "comments" ? (
                  <ArtistCommentsTab
                    labels={labels}
                    state={resources.comments}
                    onChanged={reloadComments}
                    readOnly
                  />
                ) : tab.key === "ratings" ? (
                  <ArtistRatingsTab
                    labels={labels}
                    state={resources.ratings}
                    onChanged={reloadRatings}
                    readOnly
                  />
                ) : (
                  <ResourcePanel
                    title={tab.label}
                    state={resources[tab.key]}
                  />
                ),
            }))}
            onChange={(key) => setActiveTab(key as DetailTab)}
          />
        )}
      </div>
    </Drawer>
    {serviceManagementOpen && canManageArtistServices ? (
      <AdminDrawer
        open
        title={`${labels.manageServices} · ${artist.public_id ?? "—"}`}
        size="min(100vw, 760px)"
        onClose={() => setServiceManagementOpen(false)}
      >
        <div className="p-4">
          <ArtistServicesTab
            artistId={artistId}
            state={resources.services}
            labels={labels}
            onChanged={reloadServices}
          />
        </div>
      </AdminDrawer>
    ) : null}
    <ScheduleManagementDrawer
      artist={artist}
      labels={labels}
      open={Boolean(scheduleDrawer)}
      schedule={managedSchedule}
      onClose={() => setScheduleDrawer(null)}
      onChanged={reloadAvailability}
    />
    </>
  );
}

function CreateArtistDrawer({
  open,
  loading,
  labels,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  labels: ArtistsLabels;
  onClose: () => void;
  onSubmit: (payload: CreateArtistPayload) => Promise<void>;
}) {
  const formId = "artist-create-form";
  const [values, setValues] = useState(() => initialCreateArtistValues());
  const [errors, setErrors] = useState<Partial<Record<keyof ReturnType<typeof initialCreateArtistValues>, string>>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [activeTab, setActiveTab] = useState<ArtistFormTab>("basic");
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const toast = useToast();
  const selectedRegionId = values.region_id;
  const { districts, loading: districtsLoading } = useArtistDistrictOptions(
    selectedRegionId,
    labels.resourceLoadFailed,
    toast,
  );
  const profilePhotoId = values.profile_photo_id;
  const profilePhotoUrl = values.profile_photo_url;

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      const [regionsResult, categoriesResult, servicesResult] = await Promise.allSettled([
        regionsApi.list({ page: 1, limit: 1000 }),
        categoriesApi.list({ page: 1, limit: 1000 }),
        servicesApi.list({ page: 1, limit: 1000 }),
      ]);
      if (ignore) return;

      setRegions(regionsResult.status === "fulfilled" ? regionsResult.value.items : []);
      setCategories(categoriesResult.status === "fulfilled" ? categoriesResult.value.items : []);
      setServices(servicesResult.status === "fulfilled" ? servicesResult.value.items : []);

      const resourceLoadError = getCatalogLoadError(
        [regionsResult, categoriesResult, servicesResult],
        labels.resourceLoadFailed,
      );
      if (resourceLoadError) toast.error(resourceLoadError);
    }

    void loadOptions();

    return () => {
      ignore = true;
    };
  }, [labels.resourceLoadFailed, toast]);

  const filteredDistricts = districts.filter((district) => {
    if (!selectedRegionId) return false;
    const regionId = Number(selectedRegionId);
    if (!Number.isFinite(regionId)) return true;
    return Number(district.region_id) === regionId;
  });

  const uploadProfilePhoto = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded = await filesApi.upload([file], "image");
      const fileRecord = firstUploadedFile(uploaded);
      const fileId = uploadedFileId(fileRecord);
      if (!fileId) throw new Error(labels.uploadFailed);
      setValues((current) => ({
        ...current,
        profile_photo_id: String(fileId),
        profile_photo_url: uploadedFileUrl(fileRecord),
      }));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : labels.uploadFailed;
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ReturnType<typeof initialCreateArtistValues>, string>> = {};
    if (!values.first_name.trim()) nextErrors.first_name = labels.requiredField(labels.firstName);
    if (!values.phone.trim()) nextErrors.phone = labels.requiredField(labels.phone);
    if (!parseIdList(values.category_ids).length) nextErrors.category_ids = labels.requiredField(labels.category);
    const servicesError = validateArtistServiceDrafts(values.services, labels);
    if (servicesError) nextErrors.services = servicesError;
    const cardNumberError = validateArtistCardNumber(values.card_number, labels);
    if (cardNumberError) nextErrors.card_number = cardNumberError;
    const cardHolderNameError = validateArtistCardHolderName(values.card_holder_name, labels);
    if (cardHolderNameError) nextErrors.card_holder_name = cardHolderNameError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.first_name || nextErrors.phone) setActiveTab("basic");
      else if (nextErrors.category_ids) setActiveTab("profile");
      else setActiveTab("account");
      return;
    }

    let payload: CreateArtistPayload;
    try {
      payload = buildCreateArtistPayload(values);
    } catch {
      toast.error(labels.passwordGenerationFailed);
      return;
    }

    await onSubmit(payload);
  };

  return (
    <AdminDrawer
      open={open}
      title={labels.createTitle}
      onClose={onClose}
      size="min(100vw, 800px)"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <ArtistDrawerActionButton
            icon={<X className="size-4" />}
            label={labels.cancel}
            onClick={onClose}
          />
          <ArtistDrawerActionButton
            form={formId}
            icon={<CheckCircle2 className="size-4" />}
            label={loading ? labels.creating : labels.create}
            loading={loading || uploading}
            tone="save"
            type="submit"
          />
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={submit}
        className="space-y-6 p-4"
      >
        <Tabs
          activeKey={activeTab}
          className="artistbor-drawer-tabs"
          items={[
            {
              key: "basic",
              label: labels.formTabBasic,
              children: (
                <div className="space-y-6 pt-1">
                  <ArtistFormSection title={labels.mainInfo}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.firstName} required value={values.first_name} error={errors.first_name} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
                      <FormField compact label={labels.lastName} value={values.last_name} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
                      <FormField compact label={labels.gender} type="select" value={values.gender} options={genderOptions(labels)} onChange={(gender) => setValues((current) => ({ ...current, gender }))} />
                      <FormField compact label={labels.birthDate} type="date" value={values.birth_date} onChange={(birth_date) => setValues((current) => ({ ...current, birth_date }))} />
                    </div>
                  </ArtistFormSection>
                  <ArtistFormSection title={labels.contactInfo}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.phone} required type="tel" value={values.phone} error={errors.phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.phone, () => setValues((current) => ({ ...current, phone: "+998 " })))} onChange={(phone) => setValues((current) => ({ ...current, phone: formatPhoneInput(phone) }))} />
                      <FormField compact label={labels.extraPhone} type="tel" value={values.extra_phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.extra_phone, () => setValues((current) => ({ ...current, extra_phone: "+998 " })))} onChange={(extra_phone) => setValues((current) => ({ ...current, extra_phone: formatPhoneInput(extra_phone) }))} />
                      <FormField compact className="md:col-span-2" label={labels.email} value={values.email} placeholder="name@example.com" onChange={(email) => setValues((current) => ({ ...current, email }))} />
                    </div>
                  </ArtistFormSection>
                  <ArtistFormSection title={labels.adminInfo}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.adminName} value={values.administrator_name} onChange={(administrator_name) => setValues((current) => ({ ...current, administrator_name }))} />
                      <FormField compact label={labels.adminPhone} type="tel" value={values.administrator_phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.administrator_phone, () => setValues((current) => ({ ...current, administrator_phone: "+998 " })))} onChange={(administrator_phone) => setValues((current) => ({ ...current, administrator_phone: formatPhoneInput(administrator_phone) }))} />
                    </div>
                  </ArtistFormSection>
                  <ArtistFormSection title={labels.locationInfo}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.region} type="select" value={values.region_id} placeholder={labels.region} options={regionOptions(regions, labels)} onChange={(region_id) => setValues((current) => ({ ...current, region_id, district_id: "" }))} />
                      <FormField compact label={labels.district} type="select" value={values.district_id} disabled={!selectedRegionId || districtsLoading} placeholder={districtsLoading ? labels.loadingTitle(labels.district) : selectedRegionId ? labels.district : labels.selectRegionFirst} options={districtOptions(filteredDistricts, labels)} onChange={(district_id) => setValues((current) => ({ ...current, district_id }))} />
                    </div>
                  </ArtistFormSection>
                </div>
              ),
            },
            {
              key: "profile",
              label: labels.formTabProfile,
              children: (
                <div className="pt-1">
                  <ArtistFormSection title={labels.artistInfo}>
                    <div className="grid gap-4">
                      <ArtistCategoryField
                        categories={categories}
                        error={errors.category_ids}
                        labels={labels}
                        required
                        value={values.category_ids}
                        onChange={(category_ids) => setValues((current) => ({ ...current, category_ids }))}
                      />
                      <FormField compact label={labels.bio} type="textarea" rows={5} value={values.bio} placeholder={labels.bio} onChange={(bio) => setValues((current) => ({ ...current, bio }))} />
                      <ArtistPhotoField disabled={uploading || loading} error={uploadError} labels={labels} photoId={profilePhotoId} photoUrl={profilePhotoUrl} uploading={uploading} onFile={uploadProfilePhoto} />
                    </div>
                  </ArtistFormSection>
                </div>
              ),
            },
            {
              key: "services",
              label: labels.formTabServices,
              children: (
                <div className="space-y-6 pt-1">
                  <ArtistFormSection title={labels.services}>
                    <ArtistServiceDraftEditor labels={labels} regions={regions} services={services} value={values.services} error={errors.services} onChange={(servicesValue) => setValues((current) => ({ ...current, services: servicesValue }))} />
                  </ArtistFormSection>
                </div>
              ),
            },
            {
              key: "account",
              label: labels.formTabAccount,
              children: (
                <div className="space-y-6 pt-1">
                  <ArtistFormSection title={labels.cardDetails}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.cardNumber} value={values.card_number} error={errors.card_number} inputMode="numeric" maxLength={32} autoComplete="off" placeholder="8600 1234 5678 4567" onChange={(card_number) => {
                        setValues((current) => ({ ...current, card_number }));
                        setErrors((current) => ({ ...current, card_number: undefined }));
                      }} />
                      <FormField compact label={labels.cardHolderName} value={values.card_holder_name} error={errors.card_holder_name} maxLength={255} autoComplete="off" placeholder="ALISHER USMONOV" onChange={(card_holder_name) => {
                        setValues((current) => ({ ...current, card_holder_name }));
                        setErrors((current) => ({ ...current, card_holder_name: undefined }));
                      }} />
                    </div>
                  </ArtistFormSection>
                  <ArtistFormSection title={labels.accountStatus}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.status} type="select" value={values.status} options={artistStatusOptions(labels)} onChange={(status) => setValues((current) => ({ ...current, status }))} />
                      <ArtistToggleField label={labels.verified} checked={values.is_verified} labels={labels} onChange={(is_verified) => setValues((current) => ({ ...current, is_verified }))} />
                      <ArtistToggleField label={labels.topArtist} checked={values.is_top} labels={labels} onChange={(is_top) => setValues((current) => ({ ...current, is_top }))} />
                    </div>
                  </ArtistFormSection>
                  <ArtistFormSection title={labels.statistics}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.albumsCount} type="number" value={values.albums_count} placeholder={labels.albumsCount} onChange={(albums_count) => setValues((current) => ({ ...current, albums_count }))} />
                      <FormField compact label={labels.fansCount} type="number" value={values.fans_count} placeholder={labels.fansCount} onChange={(fans_count) => setValues((current) => ({ ...current, fans_count }))} />
                    </div>
                  </ArtistFormSection>
                </div>
              ),
            },
          ]}
          onChange={(key) => setActiveTab(key as ArtistFormTab)}
        />
      </form>
    </AdminDrawer>
  );
}

function ArtistDrawerProfile({
  artist,
  labels,
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
}) {
  const photoUrl = getArtistPhotoUrl(artist);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const showPhoto = Boolean(photoUrl) && failedPhotoUrl !== photoUrl;
  const artistName = getArtistName(artist, labels);

  return (
    <>
      <div className="flex items-center gap-3">
        {showPhoto ? (
          <button
            type="button"
            className="group relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:ring-white/10 dark:hover:ring-amber-400/60"
            onClick={() => setPreviewOpen(true)}
            aria-label={artistName}
            title={artistName}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={artistName}
              className="size-full object-cover transition group-hover:scale-105"
              onError={() => setFailedPhotoUrl(photoUrl ?? null)}
            />
          </button>
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-base font-bold text-slate-400 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-500 dark:ring-white/10">
            {getArtistInitials(artist, labels)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
            {artistName}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {labels.id}: {artist.public_id ?? "—"}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatPhone(artist.phone) || "—"}
          </p>
        </div>
      </div>

      {previewOpen && photoUrl && showPhoto ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={artistName}
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewOpen(false);
            }}
            aria-label={labels.closeImagePreview}
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={artistName}
            className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}

function getArtistPhotoUrl(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  const directKeys = ["avatar_url", "profile_photo_url", "photo_url", "image_url"];
  const nestedKeys = ["user", "profile", "artistProfile", "artist_profile"];

  for (const key of directKeys) {
    const value = getStringRecordValue(record, key);
    if (value) return value;
  }

  for (const nestedKey of nestedKeys) {
    const nested = record[nestedKey];
    if (!isRecord(nested)) continue;
    for (const key of directKeys) {
      const value = getStringRecordValue(nested, key);
      if (value) return value;
    }
  }

  return undefined;
}

function getStringRecordValue(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function ArtistHeaderBadge({
  label,
  tone,
}: {
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
}) {
  const toneClass = {
    danger: {
      className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    },
    neutral: {
      className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
    },
    success: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
    },
    warning: {
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
    },
  }[tone];

  return (
    <span className={cn("inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]", toneClass.className)}>
      {label}
    </span>
  );
}

function LocalizedStatusBadge({
  fieldKey,
  labels,
  value,
}: {
  fieldKey: string;
  labels: ArtistsLabels;
  value: unknown;
}) {
  const status = getDashboardStatus(getDashboardStatusDomain(fieldKey), value, labels.locale);
  const tone = toArtistStatusTone(status.tone);
  const toneClass = {
    danger: "border-rose-400/30 bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
    neutral: "border-slate-400/30 bg-slate-50 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    success: "border-emerald-400/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    warning: "border-amber-400/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  }[tone];

  return (
    <span className={cn("inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]", toneClass)}>
      {status.label}
    </span>
  );
}

function ArtistDrawerActions({
  mode,
  loading,
  formId,
  onClose,
  onEdit,
}: {
  mode: "view" | "edit";
  loading: boolean;
  formId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t } = useI18n();

  if (mode === "edit") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <ArtistDrawerActionButton
          icon={<X className="size-4" />}
          label={t("actions.close")}
          onClick={onClose}
        />
        <ArtistDrawerActionButton
          form={formId}
          icon={<CheckCircle2 className="size-4" />}
          label={loading ? t("crud.saving") : t("actions.save")}
          loading={loading}
          tone="save"
          type="submit"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <ArtistDrawerActionButton
        icon={<X className="size-4" />}
        label={t("actions.close")}
        onClick={onClose}
      />
      <ArtistDrawerActionButton
        icon={<Pencil className="size-4" />}
        label={t("actions.edit")}
        tone="primary"
        onClick={onEdit}
      />
    </div>
  );
}

function ArtistDrawerActionButton({
  icon,
  label,
  loading,
  tone = "default",
  onClick,
  ...buttonProps
}: {
  icon: ReactNode;
  label: string;
  loading?: boolean;
  tone?: "default" | "primary" | "save" | "warning";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const buttonType = buttonProps.type ?? "button";
  const toneClass =
    tone === "save" || tone === "primary"
      ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-200 bg-white text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/10"
      : "border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10";

  return (
    <button
      {...buttonProps}
      type={buttonType}
      disabled={loading || buttonProps.disabled}
      onClick={(event) => {
        if (buttonType !== "submit") {
          event.preventDefault();
          event.stopPropagation();
        }
        onClick?.(event);
      }}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70 dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
        toneClass,
        buttonProps.className,
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function ArtistInfoGrid({
  artist,
  labels,
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
}) {
  const cells = [
    { icon: <User className="size-4" />, label: labels.fullName, value: [artist.first_name, artist.last_name].filter(Boolean).join(" ") || getArtistName(artist, labels), always: true },
    { icon: <Star className="size-4" />, label: labels.stageName, value: artist.stage_name },
    { icon: <Clock className="size-4" />, label: labels.experienceYears, value: artist.experience_years === undefined ? undefined : `${artist.experience_years} ${labels.years}` },
    { icon: <Phone className="size-4" />, label: labels.phone, value: formatPhone(artist.phone), always: true },
    { icon: <Mail className="size-4" />, label: labels.email, value: artist.email },
    { icon: <Languages className="size-4" />, label: labels.language, value: artist.badges?.join(", ") },
    {
      icon: <IdCard className="size-4" />,
      label: labels.region,
      value: hasMeaningfulValue(artist.region_id) ? (
        <LocationName fieldKey="region_id" value={artist.region_id} fallback={formatDisplayValue("region_id", artist.region_id, labels)} />
      ) : undefined,
    },
    {
      icon: <IdCard className="size-4" />,
      label: labels.district,
      value: hasMeaningfulValue(artist.district_id) ? (
        <LocationName fieldKey="district_id" value={artist.district_id} fallback={formatDisplayValue("district_id", artist.district_id, labels)} />
      ) : undefined,
    },
    { icon: <Clock className="size-4" />, label: labels.timezone, value: "Asia/Tashkent", always: true },
    { icon: <CalendarDays className="size-4" />, label: labels.createdAt, value: normalizeDate(artist.created_at), always: true },
  ].filter((cell) => cell.always || hasMeaningfulValue(cell.value));

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
      {cells.map((cell, index) => (
        <ArtistInfoCell
          key={cell.label}
          className={index === cells.length - 1 && cells.length % 2 === 1 ? "sm:col-span-2" : undefined}
          icon={cell.icon}
          label={cell.label}
          value={cell.value}
        />
      ))}
    </div>
  );
}

function ArtistInfoCell({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  const isMissing = value === null || value === undefined || value === "";

  return (
    <div className={cn("flex min-h-16 gap-3 bg-slate-50 p-3 dark:bg-[#121a2a]", className)}>
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
          {isMissing ? "—" : value}
        </div>
      </div>
    </div>
  );
}

function ArtistProfileTab({
  artist,
  labels,
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
}) {
  const hasAdmin = hasMeaningfulValue(artist.administrator_name) || hasMeaningfulValue(artist.administrator_phone);
  const hasBio = hasMeaningfulValue(artist.bio);
  const hasShortDescription = hasMeaningfulValue(artist.short_description);
  const hasHighlights = Boolean(artist.titles?.length || artist.achievements?.length);
  const additionalEntries = additionalArtistEntries(artist);
  const hasAdditionalInfo = additionalEntries.length > 0 || hasStructuredAdditionalInfo(artist);

  return (
    <div className="space-y-3">
      <ArtistSection title={labels.mainInfo}>
        <ArtistInfoGrid artist={artist} labels={labels} />
      </ArtistSection>
      <ArtistStatsSection artist={artist} labels={labels} />
      {hasShortDescription ? (
        <ArtistSection title={labels.shortDescription}>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-[#121a2a]">
            <p className="whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-800 dark:text-slate-100">
              {artist.short_description}
            </p>
          </div>
        </ArtistSection>
      ) : null}
      {hasHighlights ? (
        <ArtistSection title={labels.titlesAndAchievements}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ArtistTextList title={labels.titles} items={artist.titles ?? []} />
            <ArtistTextList title={labels.achievements} items={artist.achievements ?? []} />
          </div>
        </ArtistSection>
      ) : null}
      {hasAdmin ? (
        <ArtistSection title={labels.administrator}>
          <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
            {hasMeaningfulValue(artist.administrator_name) ? (
              <ArtistInfoCell icon={<User className="size-4" />} label={labels.adminName} value={artist.administrator_name} />
            ) : null}
            {hasMeaningfulValue(artist.administrator_phone) ? (
              <ArtistInfoCell icon={<Phone className="size-4" />} label={labels.adminPhone} value={formatPhone(artist.administrator_phone)} />
            ) : null}
          </div>
        </ArtistSection>
      ) : null}
      {hasBio ? (
        <ArtistSection title={labels.about}>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-[#121a2a]">
            <p className="whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-800 dark:text-slate-100">
              {artist.bio}
            </p>
          </div>
        </ArtistSection>
      ) : null}
      {hasAdditionalInfo ? (
        <ArtistSection title={labels.additionalInfo}>
          <ArtistAdditionalInfo artist={artist} labels={labels} entries={additionalEntries} />
        </ArtistSection>
      ) : null}
    </div>
  );
}

function ArtistAdditionalInfo({
  artist,
  entries,
  labels,
}: {
  artist: ArtistProfile;
  entries: readonly (readonly [string, unknown])[];
  labels: ArtistsLabels;
}) {
  const sources = artistAdditionalSources(artist);
  const findRecord = (keys: string[]) => {
    for (const source of sources) {
      const value = firstRecordValue(source, keys);
      if (value) return value;
    }
    return undefined;
  };

  const profileGaps = sources.reduce<unknown>((found, source) => {
    if (found !== undefined) return found;
    return firstMeaningfulValue(source, ["profile_gaps", "profileGaps", "missing_fields", "missingFields"]);
  }, undefined);
  const quota = findRecord(["quota", "limits", "profile_quota", "profileQuota"]);
  const remainingEntries = entries.filter(([key]) => key !== "public_id");

  if (!hasMeaningfulValue(profileGaps) && !quota && !remainingEntries.length) return null;

  return (
    <div className="space-y-3">
      {hasMeaningfulValue(profileGaps) ? (
        <AdditionalInfoGroup title={labels.profileCompleteness}>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-400/[0.08]">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">{labels.profileGaps}</p>
            <ul className="mt-2 space-y-1.5">
              {(Array.isArray(profileGaps) ? profileGaps : [profileGaps]).map((item, index) => (
                <li key={`${String(item)}-${index}`} className="flex gap-2 text-sm font-medium leading-5 text-amber-950 dark:text-amber-100">
                  <span aria-hidden="true" className="mt-0.5 text-amber-500">•</span>
                  <span>{isRecord(item) ? <ValueBlock fieldKey="profile_gaps" value={item} /> : formatDisplayValue("profile_gaps", item, labels)}</span>
                </li>
              ))}
            </ul>
          </div>
        </AdditionalInfoGroup>
      ) : null}

      {quota ? (
        <AdditionalInfoGroup title={labels.quota}>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["period", "limit", "used", "unlimited", "enforced", "total_all_time"] as const)
              .map((key) => [key, quota[key]] as const)
              .filter(([, value]) => hasMeaningfulValue(value))
              .map(([key, value]) => (
                <AdditionalInfoTile key={key} fieldKey={key} label={humanizeKey(key, labels)} value={value} />
              ))}
          </div>
        </AdditionalInfoGroup>
      ) : null}

      {remainingEntries.length ? (
        <AdditionalInfoGroup title={labels.otherDetails}>
          <ProfileData entries={remainingEntries} labels={labels} />
        </AdditionalInfoGroup>
      ) : null}
    </div>
  );
}

function hasStructuredAdditionalInfo(artist: ArtistProfile) {
  return artistAdditionalSources(artist).some((source) =>
    [
      "profile_gaps",
      "profileGaps",
      "missing_fields",
      "missingFields",
      "quota",
      "limits",
      "profile_quota",
      "profileQuota",
    ].some((key) => hasMeaningfulValue(source[key])),
  );
}

function artistAdditionalSources(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  return [
    record,
    firstRecordValue(record, ["profile"]),
    firstRecordValue(record, ["artistProfile", "artist_profile"]),
  ].filter((source): source is UnknownRecord => Boolean(source));
}

function AdditionalInfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{title}</h4>
      {children}
    </section>
  );
}

function AdditionalInfoTile({ fieldKey, label, value }: { fieldKey: string; label: string; value: unknown }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold leading-5 text-slate-950 dark:text-white">
        <ValueBlock fieldKey={fieldKey} value={value} />
      </div>
    </div>
  );
}

function ArtistTextList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-[#121a2a]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
              <span aria-hidden="true" className="text-amber-500">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-medium text-slate-400">—</p>
      )}
    </div>
  );
}

function ArtistSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h4>
      {children}
    </section>
  );
}

function ArtistStatsSection({
  artist,
  labels,
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
}) {
  const stats = [
    {
      icon: <Star className="size-4" />,
      label: labels.rating,
      value: formatNumberValue(artist.rating, "0.00"),
    },
    {
      icon: <Users className="size-4" />,
      label: labels.fans,
      value: toDisplay(artist.fans_count ?? 0),
    },
    {
      icon: <Folder className="size-4" />,
      label: labels.albums,
      value: toDisplay(artist.albums_count ?? 0),
    },
  ];

  return (
    <ArtistSection title={labels.artistStats}>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10">
        {stats.map((item) => (
          <div key={item.label} className="flex min-h-14 min-w-0 items-center gap-2 bg-slate-50 p-2.5 dark:bg-[#121a2a]">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-4 text-slate-950 dark:text-white">{item.value}</p>
              <p className="truncate text-[10px] font-semibold leading-4 text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </ArtistSection>
  );
}

function formatNumberValue(value: unknown, fallback: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number.toFixed(2);
}

function EditArtistForm({
  artist,
  formId,
  onSubmit,
}: {
  artist: ArtistProfile;
  formId: string;
  onSubmit: (payload: UpdateArtistPayload) => Promise<void>;
}) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);
  const artistServiceLookupId = getArtistProfileId(artist) ?? getArtistId(artist);
  const [values, setValues] = useState(() => initialArtistFormValues(artist));
  const [errors, setErrors] = useState<Partial<Record<keyof ReturnType<typeof initialArtistFormValues>, string>>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [activeTab, setActiveTab] = useState<ArtistFormTab>("basic");
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const toast = useToast();
  const selectedRegionId = values.region_id;
  const { districts, loading: districtsLoading } = useArtistDistrictOptions(
    selectedRegionId,
    labels.resourceLoadFailed,
    toast,
  );
  const profilePhotoId = values.profile_photo_id;
  const profilePhotoUrl = values.profile_photo_url;

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      const [regionsResult, categoriesResult, artistServicesResult, servicesResult] = await Promise.allSettled([
        regionsApi.list({ page: 1, limit: 1000 }),
        categoriesApi.list({ page: 1, limit: 1000 }),
        artistServiceLookupId ? artistServicesApi.list({ artist_id: artistServiceLookupId }) : Promise.resolve({ items: [] }),
        servicesApi.list({ page: 1, limit: 1000 }),
      ]);
      if (ignore) return;

      setRegions(regionsResult.status === "fulfilled" ? regionsResult.value.items : []);
      setCategories(categoriesResult.status === "fulfilled" ? categoriesResult.value.items : []);
      if (artistServicesResult.status === "fulfilled" && servicesResult.status === "fulfilled") {
        setValues((current) => {
          if (current.category_ids) return current;
          const categoryId = inferCategoryIdFromArtistServices(
            artistServicesResult.value.items,
            servicesResult.value.items,
          );
          return categoryId ? { ...current, category_ids: categoryId } : current;
        });
      }

      const resourceLoadError = getCatalogLoadError(
        [regionsResult, categoriesResult, artistServicesResult, servicesResult],
        labels.resourceLoadFailed,
      );
      if (resourceLoadError) toast.error(resourceLoadError);
    }

    void loadOptions();

    return () => {
      ignore = true;
    };
  }, [artistServiceLookupId, labels.resourceLoadFailed, toast]);

  const filteredDistricts = districts.filter((district) => {
    if (!selectedRegionId) return false;
    const regionId = Number(selectedRegionId);
    if (!Number.isFinite(regionId)) return true;
    return Number(district.region_id) === regionId;
  });

  const uploadProfilePhoto = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded = await filesApi.upload([file], "image");
      const fileRecord = firstUploadedFile(uploaded);
      const fileId = uploadedFileId(fileRecord);
      if (!fileId) throw new Error(labels.uploadFailed);
      setValues((current) => ({
        ...current,
        profile_photo_id: String(fileId),
        profile_photo_url: uploadedFileUrl(fileRecord),
      }));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : labels.uploadFailed;
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ReturnType<typeof initialArtistFormValues>, string>> = {};
    if (!values.first_name.trim()) nextErrors.first_name = labels.requiredField(labels.firstName);
    if (!values.phone.trim()) nextErrors.phone = labels.requiredField(labels.phone);
    if (!parseIdList(values.category_ids).length) nextErrors.category_ids = labels.requiredField(labels.category);
    const cardNumberError = validateArtistCardNumber(values.card_number, labels);
    if (cardNumberError) nextErrors.card_number = cardNumberError;
    const cardHolderNameError = validateArtistCardHolderName(values.card_holder_name, labels);
    if (cardHolderNameError) nextErrors.card_holder_name = cardHolderNameError;
    const ratingError = validateArtistRating(values.rating, labels);
    if (ratingError) nextErrors.rating = ratingError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setActiveTab(nextErrors.first_name || nextErrors.phone ? "basic" : nextErrors.category_ids ? "profile" : "account");
      return;
    }

    await onSubmit(buildArtistPayload(values));
  };

  return (
    <form
      id={formId}
      onSubmit={submit}
      className="space-y-6"
    >
      <Tabs
        activeKey={activeTab}
        className="artistbor-drawer-tabs"
        items={[
          {
            key: "basic",
            label: labels.formTabBasic,
            children: (
              <div className="space-y-6 pt-1">
                <ArtistFormSection title={labels.mainInfo}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField compact label={labels.firstName} required value={values.first_name} error={errors.first_name} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
                    <FormField compact label={labels.lastName} value={values.last_name} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
                    <FormField compact label={labels.gender} type="select" value={values.gender} placeholder={labels.gender} options={genderOptions(labels)} onChange={(gender) => setValues((current) => ({ ...current, gender }))} />
                  </div>
                </ArtistFormSection>
                <ArtistFormSection title={labels.contactInfo}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField compact label={labels.phone} required type="tel" value={values.phone} error={errors.phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.phone, () => setValues((current) => ({ ...current, phone: "+998 " })))} onChange={(phone) => setValues((current) => ({ ...current, phone: formatPhoneInput(phone) }))} />
                    <FormField compact label={labels.extraPhone} type="tel" value={values.extra_phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.extra_phone, () => setValues((current) => ({ ...current, extra_phone: "+998 " })))} onChange={(extra_phone) => setValues((current) => ({ ...current, extra_phone: formatPhoneInput(extra_phone) }))} />
                    <FormField compact className="md:col-span-2" label={labels.email} value={values.email} placeholder="name@example.com" onChange={(email) => setValues((current) => ({ ...current, email }))} />
                  </div>
                </ArtistFormSection>
                <ArtistFormSection title={labels.adminInfo}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField compact label={labels.adminName} value={values.administrator_name} onChange={(administrator_name) => setValues((current) => ({ ...current, administrator_name }))} />
                    <FormField compact label={labels.adminPhone} type="tel" value={values.administrator_phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.administrator_phone, () => setValues((current) => ({ ...current, administrator_phone: "+998 " })))} onChange={(administrator_phone) => setValues((current) => ({ ...current, administrator_phone: formatPhoneInput(administrator_phone) }))} />
                  </div>
                </ArtistFormSection>
                <ArtistFormSection title={labels.locationInfo}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField compact label={labels.region} type="select" value={values.region_id} placeholder={labels.region} options={regionOptions(regions, labels)} onChange={(region_id) => setValues((current) => ({ ...current, region_id, district_id: "" }))} />
                    <FormField compact label={labels.district} type="select" value={values.district_id} disabled={!selectedRegionId || districtsLoading} placeholder={districtsLoading ? labels.loadingTitle(labels.district) : selectedRegionId ? labels.district : labels.selectRegionFirst} options={districtOptions(filteredDistricts, labels)} onChange={(district_id) => setValues((current) => ({ ...current, district_id }))} />
                  </div>
                </ArtistFormSection>
              </div>
            ),
          },
          {
            key: "profile",
            label: labels.formTabProfile,
            children: (
              <div className="pt-1">
                <ArtistFormSection title={labels.artistInfo}>
                  <div className="grid gap-4">
                    <ArtistCategoryField
                      categories={categories}
                      error={errors.category_ids}
                      labels={labels}
                      required
                      value={values.category_ids}
                      onChange={(category_ids) => setValues((current) => ({ ...current, category_ids }))}
                    />
                    <FormField compact label={labels.bio} type="textarea" rows={5} value={values.bio} placeholder={labels.bio} onChange={(bio) => setValues((current) => ({ ...current, bio }))} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField compact label={labels.albumsCount} type="number" inputMode="numeric" value={values.albums_count} placeholder="0" onChange={(albums_count) => setValues((current) => ({ ...current, albums_count }))} />
                      <FormField compact label={labels.rating} type="number" inputMode="decimal" value={values.rating} error={errors.rating} placeholder="0.0" onChange={(rating) => {
                        setValues((current) => ({ ...current, rating }));
                        setErrors((current) => ({ ...current, rating: undefined }));
                      }} />
                    </div>
                    <ArtistPhotoField disabled={uploading} error={uploadError} labels={labels} photoId={profilePhotoId} photoUrl={profilePhotoUrl} uploading={uploading} onFile={uploadProfilePhoto} />
                  </div>
                </ArtistFormSection>
              </div>
            ),
          },
          {
            key: "account",
            label: labels.formTabAccount,
            children: (
              <div className="space-y-6 pt-1">
                <ArtistFormSection title={labels.cardDetails}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField compact label={labels.cardNumber} value={values.card_number} error={errors.card_number} inputMode="numeric" maxLength={32} autoComplete="off" placeholder="8600 1234 5678 4567" onChange={(card_number) => {
                      setValues((current) => ({ ...current, card_number }));
                      setErrors((current) => ({ ...current, card_number: undefined }));
                    }} />
                    <FormField compact label={labels.cardHolderName} value={values.card_holder_name} error={errors.card_holder_name} maxLength={255} autoComplete="off" placeholder="ALISHER USMONOV" onChange={(card_holder_name) => {
                      setValues((current) => ({ ...current, card_holder_name }));
                      setErrors((current) => ({ ...current, card_holder_name: undefined }));
                    }} />
                  </div>
                </ArtistFormSection>
                <ArtistFormSection title={labels.accountStatus}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField compact label={labels.status} type="select" value={values.status} options={artistStatusOptions(labels)} onChange={(status) => setValues((current) => ({ ...current, status }))} />
                    <ArtistToggleField label={labels.topArtist} checked={values.is_top} labels={labels} onChange={(is_top) => setValues((current) => ({ ...current, is_top }))} />
                  </div>
                </ArtistFormSection>
              </div>
            ),
          },
        ]}
        onChange={(key) => setActiveTab(key as ArtistFormTab)}
      />
    </form>
  );
}

function ArtistFormSection({
  hideTitle,
  title,
  children,
}: {
  hideTitle?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 pt-1 first:pt-0">
      {hideTitle ? null : (
        <p className="block text-[13px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
      )}
      {children}
    </section>
  );
}

function ArtistPhotoField({
  disabled,
  error,
  labels,
  photoId,
  photoUrl,
  uploading,
  onFile,
}: {
  disabled?: boolean;
  error?: string;
  labels: ArtistsLabels;
  photoId: string;
  photoUrl: string;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  };

  return (
    <div className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {labels.profilePhoto}
      </span>
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200/90 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <div
              className="size-14 shrink-0 rounded-xl border border-slate-200 bg-cover bg-center dark:border-white/10"
              style={{ backgroundImage: `url(${photoUrl})` }}
            />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-white/15">
              <ImagePlus className="size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-950 dark:text-white">
              {photoId ? labels.selectedPhoto(Number(photoId)) : labels.noProfilePhoto}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {labels.profilePhotoHint}
            </p>
          </div>
        </div>
        <label
          className={cn(
            "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200/90 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300",
            disabled && "pointer-events-none cursor-not-allowed opacity-60",
          )}
        >
          <ImagePlus className="size-4" />
          {uploading ? labels.uploading : labels.uploadProfilePhoto}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            disabled={disabled}
            onChange={onChange}
          />
        </label>
        {error ? <p className="text-xs font-semibold text-rose-500">{error}</p> : null}
      </div>
    </div>
  );
}

function ArtistToggleField({
  checked,
  label,
  labels,
  onChange,
}: {
  checked: boolean;
  label: string;
  labels: ArtistsLabels;
  onChange: (checked: boolean) => void;
}) {
  return (
                    <label className="relative block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border px-4 text-sm font-black transition",
          checked
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
            : "border-slate-200/90 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300",
        )}
      >
        <span>{checked ? labels.yes : labels.no}</span>
        <span
          className={cn(
            "relative h-5 w-9 rounded-full transition",
            checked ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-white transition",
              checked ? "left-4" : "left-0.5",
            )}
          />
        </span>
      </button>
    </label>
  );
}

function genderOptions(labels: ArtistsLabels): FormFieldOption[] {
  return [
    { label: labels.genderMale, value: "male" },
    { label: labels.genderFemale, value: "female" },
    { label: labels.genderOther, value: "other" },
  ];
}

function artistStatusOptions(labels: ArtistsLabels): FormFieldOption[] {
  return [
    { label: labels.deletedStatus, value: "0" },
    { label: labels.statusValueLabels.inactive, value: "9" },
    { label: labels.statusValueLabels.active, value: "10" },
    { label: labels.statusValueLabels.blocked, value: "20" },
  ];
}

function getCatalogLoadError(results: readonly PromiseSettledResult<unknown>[], fallback: string) {
  const failedResult = results.find((result) => result.status === "rejected");
  if (!failedResult || failedResult.status !== "rejected") return null;
  return failedResult.reason instanceof Error && failedResult.reason.message
    ? failedResult.reason.message
    : fallback;
}

function useArtistDistrictOptions(regionIdValue: string, fallback: string, toast: ReturnType<typeof useToast>) {
  const [state, setState] = useState<{ districts: District[]; loading: boolean }>({
    districts: [],
    loading: false,
  });

  useEffect(() => {
    let active = true;
    const regionId = Number(regionIdValue);

    const timer = window.setTimeout(() => {
      if (!Number.isFinite(regionId) || regionId <= 0) {
        if (active) setState({ districts: [], loading: false });
        return;
      }

      setState({ districts: [], loading: true });
      void districtsApi.list({ region_id: String(regionId), page: 1, limit: 100 })
        .then((result) => {
          if (active) setState({ districts: result.items, loading: false });
        })
        .catch((caught) => {
          if (!active) return;
          setState({ districts: [], loading: false });
          toast.error(caught instanceof Error ? caught.message : fallback);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [fallback, regionIdValue, toast]);

  return state;
}

function regionOptions(regions: Region[], labels: ArtistsLabels): FormFieldOption[] {
  return regions.map((region) => ({
    label: getLocalizedEntityName(region, labels.locale),
    value: String(region.id ?? ""),
  }));
}

function districtOptions(districts: District[], labels: ArtistsLabels): FormFieldOption[] {
  return districts.map((district) => ({
    label: getLocalizedEntityName(district, labels.locale),
    value: String(district.id ?? ""),
  }));
}

function categoryOptions(categories: Category[], labels: ArtistsLabels): FormFieldOption[] {
  const options = new Map<string, FormFieldOption>();

  const visit = (value: unknown, parentLabel?: string) => {
    if (!isRecord(value)) return;

    const id = value.id;
    const categoryId = typeof id === "number" || typeof id === "string" ? String(id) : "";
    const name = getLocalizedEntityName(value as Category, labels.locale);
    if (categoryId) {
      options.set(categoryId, {
        label: parentLabel ? `${parentLabel} — ${name}` : name,
        value: categoryId,
      });
    }

    const childLabel = parentLabel ? `${parentLabel} — ${name}` : name;
    for (const key of ["sub_categories", "subCategories", "children"]) {
      const children = value[key];
      if (Array.isArray(children)) children.forEach((child) => visit(child, childLabel));
    }
  };

  categories.forEach((category) => visit(category));
  return [...options.values()];
}

function ArtistCategoryField({
  categories,
  error,
  labels,
  required = false,
  value,
  onChange,
}: {
  categories: Category[];
  error?: string;
  labels: ArtistsLabels;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {labels.category}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <Select
        mode="multiple"
        allowClear
        className={cn("artistbor-drawer-select w-full", error && "artistbor-field-error")}
        value={parseIdList(value).map(String)}
        placeholder={labels.categoryPlaceholder}
        options={categoryOptions(categories, labels)}
        status={error ? "error" : undefined}
        onChange={(nextValue: Array<string | number>) => onChange(nextValue.map(String).join(","))}
      />
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</span> : null}
    </label>
  );
}

function serviceOptions(services: Service[], labels: ArtistsLabels): FormFieldOption[] {
  return services.map((service) => ({
    label: getLocalizedEntityName(service, labels.locale),
    value: String(service.id ?? ""),
  }));
}

function currencyOptions(): FormFieldOption[] {
  return [
    { label: "UZS — so'm", value: "UZS" },
    { label: "USD — US Dollar", value: "USD" },
  ];
}

function artistServiceStatusOptions(labels: ArtistsLabels): FormFieldOption[] {
  return [
    { label: labels.statusValueLabels.inactive, value: "0" },
    { label: labels.statusValueLabels.active, value: "1" },
  ];
}

function initialArtistFormValues(artist: ArtistProfile) {
  const profile = nestedArtistRecord(artist, "profile");
  const artistProfile = nestedArtistRecord(artist, "artistProfile") ?? nestedArtistRecord(artist, "artist_profile");
  const profilePhotoId = numberRecordValue(artistProfile, "profile_photo_id") ?? numberRecordValue(artist, "profile_photo_id");

  return {
    first_name: artist.first_name ?? getFirstNameFromArtist(artist),
    last_name: artist.last_name ?? getLastNameFromArtist(artist),
    phone: formatPhoneInput(artist.phone),
    email: artist.email ?? "",
    status: artist.status === undefined || artist.status === null ? "10" : String(artist.status),
    region_id: artist.region_id === undefined || artist.region_id === null ? "" : String(artist.region_id),
    district_id: artist.district_id === undefined || artist.district_id === null ? "" : String(artist.district_id),
    gender: normalizedGender(
      stringRecordValue(profile, "gender")
      ?? stringRecordValue(artistProfile, "gender")
      ?? artist.gender,
    ),
    category_ids: artistCategoryValue(artist),
    bio: stringRecordValue(artistProfile, "bio") ?? artist.bio ?? stringRecordValue(profile, "bio") ?? "",
    albums_count: String(numberRecordValue(artistProfile, "albums_count") ?? artist.albums_count ?? ""),
    rating: String(numberRecordValue(artistProfile, "rating") ?? artist.rating ?? ""),
    extra_phone: formatPhoneInput(stringRecordValue(artistProfile, "extra_phone") ?? artist.extra_phone),
    administrator_name: stringRecordValue(artistProfile, "administrator_name") ?? artist.administrator_name ?? "",
    administrator_phone: formatPhoneInput(stringRecordValue(artistProfile, "administrator_phone") ?? artist.administrator_phone),
    card_number: stringRecordValue(artistProfile, "card_number") ?? artist.card_number ?? "",
    card_holder_name: stringRecordValue(artistProfile, "card_holder_name") ?? artist.card_holder_name ?? "",
    profile_photo_id: profilePhotoId === undefined ? "" : String(profilePhotoId),
    profile_photo_url: getArtistPhotoUrl(artist) ?? "",
    is_top: booleanRecordValue(artistProfile, "is_top") ?? Boolean(artist.is_top),
  };
}

function nestedArtistRecord(artist: ArtistProfile, key: string) {
  const value = (artist as UnknownRecord)[key];
  return isRecord(value) ? value : undefined;
}

function stringRecordValue(record: UnknownRecord | undefined, key: string) {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberRecordValue(record: UnknownRecord | ArtistProfile | undefined, key: string) {
  if (!record) return undefined;
  const value = (record as UnknownRecord)[key];
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function booleanRecordValue(record: UnknownRecord | undefined, key: string) {
  if (!record) return undefined;
  const value = record[key];
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return undefined;
}

function artistCategoryValue(artist: ArtistProfile) {
  const record = artist as UnknownRecord;
  const artistProfile = nestedArtistRecord(artist, "artistProfile") ?? nestedArtistRecord(artist, "artist_profile");
  const candidates = [
    record.categories,
    record.category,
    record.category_ids,
    record.category_id,
    record.artistCategories,
    record.artist_categories,
    artistProfile?.categories,
    artistProfile?.category,
    artistProfile?.category_ids,
    artistProfile?.category_id,
    artistProfile?.artistCategories,
    artistProfile?.artist_categories,
  ];

  for (const candidate of candidates) {
    const values = categoryIdsFromValue(candidate);
    if (values.length) return values.join(",");
  }

  return "";
}

function inferCategoryIdFromArtistServices(artistServices: object[], services: object[]) {
  const serviceById = new Map<string, UnknownRecord>();
  for (const service of services) {
    if (!isRecord(service)) continue;
    const id = service.id;
    if (typeof id === "number" || typeof id === "string") {
      serviceById.set(String(id), service);
    }
  }

  for (const artistService of artistServices) {
    if (!isRecord(artistService)) continue;

    const directCategoryId = categoryIdFromServiceLike(artistService);
    if (directCategoryId) return directCategoryId;

    const nestedService = firstRecordValue(artistService, ["service", "service_data", "service_info"]);
    const nestedCategoryId = categoryIdFromServiceLike(nestedService);
    if (nestedCategoryId) return nestedCategoryId;

    const serviceId = artistService.service_id;
    if (typeof serviceId !== "number" && typeof serviceId !== "string") continue;

    const service = serviceById.get(String(serviceId));
    const serviceCategoryId = categoryIdFromServiceLike(service);
    if (serviceCategoryId) return serviceCategoryId;
  }

  return "";
}

function categoryIdFromServiceLike(record: UnknownRecord | undefined) {
  if (!record) return "";
  const candidates = [
    record.category_id,
    record.category_ids,
    record.category,
    record.categories,
    record.parent_category_id,
  ];

  for (const candidate of candidates) {
    const value = firstCategoryId(candidate);
    if (value) return value;
  }

  return "";
}

function categoryIdsFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.flatMap(categoryIdsFromValue)));
  }

  if (isRecord(value)) {
    const id = categoryId(value);
    return id ? [id] : [];
  }

  if (typeof value === "number" || typeof value === "string") {
    const normalized = String(value).trim();
    return normalized ? [normalized] : [];
  }

  return [];
}

function firstCategoryId(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const id = firstCategoryId(item);
      if (id) return id;
    }
    return "";
  }

  if (isRecord(value)) return categoryId(value);
  if (typeof value === "number" || typeof value === "string") return String(value);
  return "";
}

function getFirstNameFromArtist(artist: ArtistProfile) {
  const fullName = artist.full_name?.trim();
  if (!fullName) return "";
  return fullName.split(/\s+/)[0] ?? "";
}

function getLastNameFromArtist(artist: ArtistProfile) {
  const fullName = artist.full_name?.trim();
  if (!fullName) return "";
  return fullName.split(/\s+/).slice(1).join(" ");
}

function normalizedGender(value: ArtistProfile["gender"]) {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  return normalized === "male" || normalized === "female" || normalized === "other" ? normalized : "";
}

function ArtistVideosSummary({
  artistId,
  state,
}: {
  artistId: number | undefined;
  state: DetailResourceState;
}) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);

  if (state.loading) return <LoadingState label={labels.videosLoading} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const videoItems = rows
    .map((row, index) => videoItemFromRecord(row, index, labels))
    .filter((item) => item.title || item.videoUrl || item.thumbnailUrlCandidates.length);
  const href = artistId ? `/admin/videos?artist_id=${artistId}` : "/admin/videos";

  if (!videoItems.length) {
    return (
      <div className="rounded-2xl border border-dashed border-artistbor-border bg-artistbor-surface p-5 text-center">
        <PlayCircle className="mx-auto size-8 text-artistbor-muted" />
        <p className="mt-3 text-sm font-bold text-artistbor-primary">{labels.videosEmptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-artistbor-secondary">
          {labels.noVideoHint}
        </p>
        <Link href={href} className={cn(adminPrimaryActionButtonClass, "mt-4")}>
          <Plus className="size-4" />
          {labels.manageVideos}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.artistVideos}</h4>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {labels.videoItemCount(videoItems.length)}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.05]"
        >
          <ExternalLink className="size-4" />
          {labels.manageVideos}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {videoItems.map((item) => (
          <VideoPreviewCard key={item.key} item={item} labels={labels} />
        ))}
      </div>
    </div>
  );
}

type VideoItemView = {
  key: string;
  title: string;
  subtitle: string;
  thumbnailUrlCandidates: string[];
  videoUrl: string;
  status?: unknown;
  createdAt?: unknown;
  duration?: unknown;
  sortOrder?: unknown;
};

function VideoPreviewCard({ item, labels }: { item: VideoItemView; labels: ArtistsLabels }) {
  const preview = <VideoPreviewImage labels={labels} title={item.title} urls={item.thumbnailUrlCandidates} />;
  const chips = [
    item.duration !== undefined ? `${labels.duration}: ${toDisplay(item.duration)}` : "",
    item.sortOrder !== undefined ? `${labels.sortOrder}: ${toDisplay(item.sortOrder)}` : "",
    item.createdAt !== undefined ? formatDisplayValue("created_at", item.createdAt, labels) : "",
  ].filter(Boolean);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white p-3 dark:border-white/10 dark:bg-[#111827]">
      {item.videoUrl ? (
        <a href={item.videoUrl} target="_blank" rel="noreferrer" className="group block">
          {preview}
        </a>
      ) : (
        preview
      )}

      <div className="mt-3 min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-black text-slate-950 dark:text-white">{item.title}</p>
            {item.subtitle ? (
              <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.subtitle}</p>
            ) : null}
          </div>
          {item.status !== undefined ? (
            <LocalizedStatusBadge fieldKey="is_active" labels={labels} value={item.status} />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              {chip}
            </span>
          ))}
          {item.videoUrl ? (
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300"
            >
              {labels.openVideo}
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function VideoPreviewImage({
  labels,
  title,
  urls,
}: {
  labels: ArtistsLabels;
  title: string;
  urls: string[];
}) {
  const [urlIndex, setUrlIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const currentUrl = urls[urlIndex];

  if (!currentUrl || failed) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <PlayCircle className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 px-3 text-xs font-bold text-slate-400 dark:text-slate-500">{labels.noVideoPreview}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.04]">
      {/* eslint-disable-next-line @next/next/no-img-element -- External video thumbnails are backend-defined and need onError fallback probing. */}
      <img
        src={currentUrl}
        alt={title}
        className="size-full object-cover"
        loading="lazy"
        onError={() => {
          setUrlIndex((current) => {
            if (current < urls.length - 1) return current + 1;
            setFailed(true);
            return current;
          });
        }}
      />
      <div className="absolute inset-0 grid place-items-center bg-slate-950/10 opacity-100 transition group-hover:bg-slate-950/20">
        <span className="grid size-11 place-items-center rounded-full bg-white/90 text-slate-950 shadow-sm dark:bg-slate-950/85 dark:text-white">
          <PlayCircle className="size-6" />
        </span>
      </div>
    </div>
  );
}

function ArtistGalleryTab({
  artistId,
  canManage,
  labels,
  onChanged,
  state,
}: {
  artistId?: number;
  canManage: boolean;
  labels: ArtistsLabels;
  onChanged: ResourceReloader;
  state: DetailResourceState;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.gallery)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const galleryItems = rows
    .map((row, index) => galleryItemFromRecord(row, index, labels))
    .filter((item) => item.imageUrl || item.linkUrl || item.title);

  const uploadFiles = async (files: File[]) => {
    if (!artistId || !files.length) return;
    if (files.length > MAX_GALLERY_FILES) {
      toast.error(labels.galleryTooManyFiles);
      return;
    }
    const invalidType = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (invalidType) {
      toast.error(labels.galleryInvalidFileType);
      return;
    }
    const oversized = files.find((file) => file.size > MAX_GALLERY_FILE_SIZE);
    if (oversized) {
      toast.error(labels.galleryFileTooLarge);
      return;
    }

    setSubmitting(true);
    try {
      await artistGalleryApi.upload(artistId, files);
      toast.success(labels.galleryUploaded);
      await onChanged({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.galleryUploadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteItem = (item: GalleryItemView) => {
    if (!item.id) {
      toast.error(labels.galleryItemIdMissing);
      return;
    }
    Modal.confirm({
      title: labels.galleryDeleteTitle,
      content: labels.galleryDeleteConfirm,
      okText: labels.deleteSchedule,
      okButtonProps: { danger: true },
      cancelText: labels.cancel,
      rootClassName: "artistbor-confirm-modal",
      async onOk() {
        try {
          await artistGalleryApi.delete(item.id as number);
          toast.success(labels.galleryDeleted);
          await onChanged({ background: true });
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : labels.galleryDeleteFailed);
          throw caught;
        }
      },
    });
  };

  const uploadControl = canManage ? (
    <label className={cn(adminPrimaryActionButtonClass, submitting && "pointer-events-none opacity-60")}>
      {submitting ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
      {submitting ? labels.uploading : labels.galleryUpload}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={submitting}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void uploadFiles(files);
        }}
      />
    </label>
  ) : null;

  if (!galleryItems.length) {
    return (
      <div className="rounded-2xl border border-dashed border-artistbor-border bg-artistbor-surface p-5 text-center">
        <ImagePlus className="mx-auto size-8 text-artistbor-muted" />
        <p className="mt-3 text-sm font-bold text-artistbor-primary">{labels.galleryEmptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-artistbor-secondary">
          {labels.galleryEmptyDescription}
        </p>
        {uploadControl ? <div className="mt-4 flex justify-center">{uploadControl}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.gallery}</h4>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {labels.galleryItemCount(galleryItems.length)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {uploadControl}
          {state.meta ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
            {labels.page} {state.meta.currentPage ?? state.meta.page ?? 1} / {state.meta.pageCount ?? "—"}
          </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {galleryItems.map((item) => (
          <GalleryPreviewCard
            key={item.key}
            item={item}
            labels={labels}
            onDelete={canManage ? () => deleteItem(item) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function ArtistCommentsTab({
  labels,
  onChanged,
  state,
  readOnly = false,
}: {
  labels: ArtistsLabels;
  onChanged: ResourceReloader;
  state: DetailResourceState;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const [dialog, setDialog] = useState<{ mode: "edit"; item: CommentItemView } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.comments)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const comments = rows
    .map((row, index) => commentItemFromRecord(row, index, labels))
    .filter((item) => item.text || item.clientName || item.id !== undefined);

  const runCommentAction = async (action: "delete" | "publish" | "unpublish", item: CommentItemView) => {
    if (!item.id) {
      toast.error(labels.commentIdMissing);
      return;
    }
    const commentId = item.id;

    const config = {
      delete: {
        title: labels.deleteCommentTitle,
        content: labels.deleteCommentConfirm,
        okText: labels.deleteComment,
        danger: true,
        request: () => commentsApi.delete(commentId),
        success: labels.commentDeleted,
        failure: labels.commentDeleteFailed,
      },
      publish: {
        title: labels.publishCommentTitle,
        content: labels.publishCommentConfirm,
        okText: labels.publishComment,
        danger: false,
        request: () => commentsApi.publish(commentId),
        success: labels.commentPublished,
        failure: labels.commentPublishFailed,
      },
      unpublish: {
        title: labels.unpublishCommentTitle,
        content: labels.unpublishCommentConfirm,
        okText: labels.unpublishComment,
        danger: false,
        request: () => commentsApi.unpublish(commentId),
        success: labels.commentUnpublished,
        failure: labels.commentUnpublishFailed,
      },
    }[action];

    Modal.confirm({
      title: config.title,
      content: config.content,
      okText: config.okText,
      okButtonProps: { danger: config.danger },
      cancelText: labels.cancel,
      rootClassName: "artistbor-confirm-modal",
      async onOk() {
        try {
          await config.request();
          toast.success(config.success);
          void onChanged({ background: true });
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : config.failure);
          throw caught;
        }
      },
    });
  };

  const handleSubmit = async (values: CommentEditValues) => {
    if (!dialog?.item.id) {
      toast.error(labels.commentIdMissing);
      return;
    }

    const payload: UpdateCommentPayload = {};
    const comment = values.comment.trim();
    if (comment) payload.comment = comment;
    if (values.is_published !== "") payload.is_published = Number(values.is_published);

    if (!Object.keys(payload).length) {
      setDialog(null);
      return;
    }

    setSubmitting(true);
    try {
      await commentsApi.update(dialog.item.id, payload);
      toast.success(labels.commentUpdated);
      setDialog(null);
      void onChanged({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.commentUpdateFailed);
    } finally {
      setSubmitting(false);
    }
  };

  if (!comments.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5EAF2] bg-white p-5 text-center dark:border-white/10 dark:bg-transparent">
        <Mail className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{labels.commentsEmptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {labels.commentsEmptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.comments}</h4>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {labels.commentItemCount(comments.length)}
          </p>
        </div>
        {state.meta ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
            {labels.page} {state.meta.currentPage ?? state.meta.page ?? 1} / {state.meta.pageCount ?? "—"}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3">
        {comments.map((item) => (
          <CommentModerationCard
            key={item.key}
            item={item}
            labels={labels}
            onDelete={readOnly ? undefined : () => void runCommentAction("delete", item)}
            onEdit={readOnly ? undefined : () => setDialog({ mode: "edit", item })}
            onPublish={readOnly ? undefined : () => void runCommentAction("publish", item)}
            onUnpublish={readOnly ? undefined : () => void runCommentAction("unpublish", item)}
            readOnly={readOnly}
          />
        ))}
      </div>

      <CommentEditModal
        key={dialog?.item.key ?? "comment-edit-closed"}
        labels={labels}
        loading={submitting}
        item={dialog?.item ?? null}
        open={dialog?.mode === "edit"}
        onClose={() => setDialog(null)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

type CommentItemView = {
  key: string;
  id?: number;
  clientName: string;
  createdAt?: unknown;
  publication: { label: string; tone: "danger" | "neutral" | "success" | "warning"; value: string };
  rating?: unknown;
  raw: UnknownRecord;
  text: string;
};

type CommentEditValues = {
  comment: string;
  is_published: string;
};

function CommentModerationCard({
  item,
  labels,
  onDelete,
  onEdit,
  onPublish,
  onUnpublish,
  readOnly = false,
}: {
  item: CommentItemView;
  labels: ArtistsLabels;
  onDelete?: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  readOnly?: boolean;
}) {
  const canPublish = item.publication.value !== "published";

  return (
    <article className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              {item.clientName || labels.unknownClient}
            </p>
            <ArtistHeaderBadge label={item.publication.label} tone={item.publication.tone} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {item.createdAt !== undefined ? <span>{formatDisplayValue("created_at", item.createdAt, labels)}</span> : null}
            {item.rating !== undefined ? <span>{labels.rating}: {toDisplay(item.rating)}</span> : null}
          </div>
        </div>
        {!readOnly && (onEdit || onPublish || onUnpublish || onDelete) ? (
          <div className="flex shrink-0 gap-1.5">
          {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label={labels.editComment}
          >
            <Pencil className="size-4" />
          </button>
          ) : null}
          {onPublish || onUnpublish ? (
          <button
            type="button"
            onClick={canPublish ? onPublish : onUnpublish}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
            aria-label={canPublish ? labels.publishComment : labels.unpublishComment}
          >
            {canPublish ? <CheckCircle2 className="size-4" /> : <X className="size-4" />}
          </button>
          ) : null}
          {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
            aria-label={labels.deleteComment}
          >
            <Trash2 className="size-4" />
          </button>
          ) : null}
        </div>
        ) : null}
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium leading-6 text-slate-700 dark:bg-white/[0.04] dark:text-slate-200">
        {item.text || "—"}
      </p>
    </article>
  );
}

function CommentEditModal({
  item,
  labels,
  loading,
  onClose,
  onSubmit,
  open,
}: {
  item: CommentItemView | null;
  labels: ArtistsLabels;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: CommentEditValues) => Promise<void>;
  open: boolean;
}) {
  const [values, setValues] = useState<CommentEditValues>(() => initialCommentEditValues(item));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit(values);
  };

  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      onCancel={onClose}
      rootClassName="artistbor-confirm-modal"
      title={labels.editComment}
    >
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <FormField
          compact
          required
          label={labels.comment}
          placeholder={labels.commentPlaceholder}
          type="textarea"
          rows={5}
          value={values.comment}
          onChange={(comment) => setValues((current) => ({ ...current, comment }))}
        />
        <FormField
          compact
          label={labels.publicationStatus}
          type="select"
          value={values.is_published}
          options={[
            { label: labels.pendingStatus, value: 0 },
            { label: labels.publishedStatus, value: 1 },
          ]}
          onChange={(is_published) => setValues((current) => ({ ...current, is_published }))}
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--neutral text-sm font-bold"
          >
            <X className="size-4" />
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--success text-sm font-bold"
          >
            <Save className="size-4" />
            {labels.saveComment}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ArtistRatingsTab({
  labels,
  onChanged,
  state,
  readOnly = false,
}: {
  labels: ArtistsLabels;
  onChanged: ResourceReloader;
  state: DetailResourceState;
  readOnly?: boolean;
}) {
  const toast = useToast();

  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.ratings)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const ratings = rows
    .map((row, index) => ratingItemFromRecord(row, index, labels))
    .filter((item) => item.rating !== undefined || item.clientName || item.id !== undefined);
  const summary = ratingSummary(ratings);

  const handleDelete = (item: RatingItemView) => {
    if (!item.id) {
      toast.error(labels.ratingIdMissing);
      return;
    }
    const ratingId = item.id;

    Modal.confirm({
      title: labels.deleteRatingTitle,
      content: labels.deleteRatingConfirm,
      okText: labels.deleteRating,
      okButtonProps: { danger: true },
      cancelText: labels.cancel,
      rootClassName: "artistbor-confirm-modal",
      async onOk() {
        try {
          await ratingsApi.delete(ratingId);
          toast.success(labels.ratingDeleted);
          void onChanged({ background: true });
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : labels.ratingDeleteFailed);
          throw caught;
        }
      },
    });
  };

  if (!ratings.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5EAF2] bg-white p-5 text-center dark:border-white/10 dark:bg-transparent">
        <Star className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{labels.ratingsEmptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {labels.ratingsEmptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <RatingSummaryTile label={labels.averageRating} value={summary.averageText} accent />
        <RatingSummaryTile label={labels.totalRatings} value={toDisplay(ratings.length)} />
        <RatingSummaryTile label={labels.publishedRatings} value={toDisplay(summary.publishedCount)} />
      </div>

      <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.ratings}</h4>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {labels.ratingItemCount(ratings.length)}
            </p>
          </div>
          {state.meta ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              {labels.page} {state.meta.currentPage ?? state.meta.page ?? 1} / {state.meta.pageCount ?? "—"}
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {ratings.map((item) => (
            <RatingModerationCard
              key={item.key}
              item={item}
              labels={labels}
              onDelete={readOnly ? undefined : () => handleDelete(item)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

type RatingItemView = {
  key: string;
  id?: number;
  clientName: string;
  createdAt?: unknown;
  publication: { label: string; tone: "danger" | "neutral" | "success" | "warning"; value: string };
  rating?: number;
  text: string;
};

function RatingSummaryTile({
  accent,
  label,
  value,
}: {
  accent?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-4",
      accent
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"
        : "border-[#E5EAF2] bg-white text-slate-950 dark:border-white/10 dark:bg-[#111827] dark:text-white",
    )}>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function RatingModerationCard({
  item,
  labels,
  onDelete,
  readOnly = false,
}: {
  item: RatingItemView;
  labels: ArtistsLabels;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <RatingStars value={item.rating} />
            <ArtistHeaderBadge label={item.publication.label} tone={item.publication.tone} />
          </div>
          <p className="mt-2 truncate text-sm font-black text-slate-950 dark:text-white">
            {item.clientName || labels.unknownClient}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {item.createdAt !== undefined ? <span>{formatDisplayValue("created_at", item.createdAt, labels)}</span> : null}
          </div>
        </div>
        {!readOnly && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
            aria-label={labels.deleteRating}
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      {item.text ? (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 text-sm font-medium leading-6 text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
          {item.text}
        </p>
      ) : null}
    </article>
  );
}

function RatingStars({ value }: { value?: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value ?? 0)));

  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            index < rounded ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600",
          )}
        />
      ))}
      <span className="ml-1 text-xs font-black text-slate-700 dark:text-slate-200">
        {value !== undefined ? value.toFixed(value % 1 === 0 ? 0 : 1) : "—"}
      </span>
    </div>
  );
}

type GalleryItemView = {
  key: string;
  id?: number;
  imageUrl: string;
  imageUrlCandidates: string[];
  linkUrl: string;
  title: string;
  subtitle: string;
  status?: unknown;
  createdAt?: unknown;
};

function GalleryPreviewCard({
  item,
  labels,
  onDelete,
}: {
  item: GalleryItemView;
  labels: ArtistsLabels;
  onDelete?: () => void;
}) {
  const preview = item.imageUrlCandidates.length ? (
    <GalleryPreviewImage urls={item.imageUrlCandidates} title={item.title} />
  ) : (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400 dark:border-white/10 dark:bg-white/[0.03]">
      {labels.noImage}
    </div>
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white p-3 dark:border-white/10 dark:bg-[#111827]">
      {item.linkUrl ? (
        <a href={item.linkUrl} target="_blank" rel="noreferrer" className="block">
          {preview}
        </a>
      ) : (
        preview
      )}

      <div className="mt-3 min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.title}</p>
            {item.subtitle ? (
              <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.subtitle}</p>
            ) : null}
          </div>
          {item.status !== undefined ? (
            <LocalizedStatusBadge fieldKey="is_active" labels={labels} value={item.status} />
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300/40 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
              aria-label={labels.galleryDeleteTitle}
              title={labels.galleryDeleteTitle}
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.createdAt !== undefined ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              {formatDisplayValue("created_at", item.createdAt, labels)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function GalleryPreviewImage({ title, urls }: { title: string; urls: string[] }) {
  const [urlIndex, setUrlIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const currentUrl = urls[urlIndex];

  if (!currentUrl || failed) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400 dark:border-white/10 dark:bg-white/[0.03]">
        {title}
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.04]">
      {/* eslint-disable-next-line @next/next/no-img-element -- External gallery URLs are backend-defined and need onError fallback probing. */}
      <img
        src={currentUrl}
        alt={title}
        className="size-full object-cover"
        loading="lazy"
        onError={() => {
          setUrlIndex((current) => {
            if (current < urls.length - 1) return current + 1;
            setFailed(true);
            return current;
          });
        }}
      />
    </div>
  );
}

function ArtistServicesTab({
  artistId,
  state,
  labels,
  onChanged,
  onManage,
  readOnly = false,
}: {
  artistId?: number;
  state: DetailResourceState;
  labels: ArtistsLabels;
  onChanged: ResourceReloader;
  onManage?: () => void;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(!readOnly);
  const [formMode, setFormMode] = useState<ArtistServiceFormMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnknownRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    let ignore = false;

    Promise.all([
      regionsApi.list({ page: 1, limit: 1000 }),
      servicesApi.list({ page: 1, limit: 1000 }),
    ])
      .then(([regionsResult, servicesResult]) => {
        if (!ignore) {
          setRegions(regionsResult.items);
          setServices(servicesResult.items);
        }
      })
      .catch(() => {
        if (!ignore) {
          setRegions([]);
          setServices([]);
        }
      })
      .finally(() => {
        if (!ignore) setRegionsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [readOnly]);

  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.services)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);

  const submitServiceForm = async (values: ArtistServiceFormValues) => {
    if (!artistId) {
      toast.error(labels.artistIdMissing);
      return;
    }
    setSubmitting(true);
    try {
      if (formMode?.type === "edit") {
        const serviceId = getArtistServiceRecordId(formMode.service);
        if (!serviceId) throw new Error(labels.regionPriceServiceMissing);
        await artistServicesApi.update(serviceId, buildArtistServiceUpdatePayload(values));
      } else {
        await artistServicesApi.assign(buildArtistServiceAssignmentPayload(artistId, values));
      }
      toast.success(labels.artistServiceSaved);
      setFormMode(null);
      void onChanged({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.artistServiceSaveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteService = async () => {
    if (!deleteTarget) return;
    const serviceId = getArtistServiceRecordId(deleteTarget);
    if (!serviceId) {
      toast.error(labels.regionPriceServiceMissing);
      return;
    }
    setSubmitting(true);
    try {
      await artistServicesApi.delete(serviceId);
      toast.success(labels.artistServiceDeleted);
      setDeleteTarget(null);
      void onChanged({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.artistServiceDeleteFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.services}</h4>
        {readOnly ? (
          onManage ? (
            <button type="button" onClick={onManage} className={adminPrimaryActionButtonClass}>
              <Pencil className="size-4" />
              {labels.manageServices}
            </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={() => setFormMode({ type: "assign" })}
            className={adminPrimaryActionButtonClass}
          >
            <Plus className="size-4" />
            {labels.assignService}
          </button>
        )}
      </div>

      {!readOnly && formMode ? (
        <ArtistServiceForm
          key={formMode.type === "edit" ? `edit-${getArtistServiceRecordId(formMode.service) ?? "new"}` : "assign"}
          labels={labels}
          mode={formMode}
          regions={regions}
          services={services}
          submitting={submitting}
          onCancel={() => setFormMode(null)}
          onSubmit={submitServiceForm}
        />
      ) : null}

      {rows.length ? (
        <div className="space-y-3">
          {rows.map((service, index) => (
            <ArtistServiceCard
              key={String(resourceRowKey(service, index))}
              labels={labels}
              regions={regions}
              regionsLoading={regionsLoading}
              service={service}
              onDelete={readOnly ? undefined : () => setDeleteTarget(service)}
              onEdit={readOnly ? undefined : () => setFormMode({ type: "edit", service })}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={labels.notFoundTitle(labels.services)} />
      )}

      {!readOnly ? (
        <Modal
          open={Boolean(deleteTarget)}
          title={labels.deleteArtistServiceTitle}
          okText={labels.deleteArtistService}
          cancelText={labels.cancel}
          okButtonProps={{ danger: true, loading: submitting }}
          onCancel={() => setDeleteTarget(null)}
          onOk={() => void deleteService()}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {labels.deleteArtistServiceConfirm}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

function ArtistServiceCard({
  service,
  labels,
  regions,
  regionsLoading,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  service: UnknownRecord;
  labels: ArtistsLabels;
  regions: Region[];
  regionsLoading: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const title = getArtistServiceTitle(service, labels);
  const description = getArtistServiceDescription(service);
  const chips = getArtistServiceChips(service, labels);

  return (
    <article className="rounded-xl border border-slate-200/90 bg-white p-4 transition hover:border-amber-300/70 hover:bg-amber-50/20 dark:border-white/10 dark:bg-slate-950/30 dark:hover:border-amber-400/30 dark:hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[15px] font-semibold text-slate-950 dark:text-white">
            {title}
          </h4>
          {hasMeaningfulValue(description) ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
        </div>
        {hasMeaningfulValue(service.status) ? (
          <LocalizedStatusBadge fieldKey="is_active" labels={labels} value={service.status} />
        ) : null}
      </div>
      {!readOnly && (onEdit || onDelete) ? (
        <div className="mt-3 flex flex-wrap justify-end gap-1.5">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e6ebf2] bg-white px-2.5 text-xs font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              <Pencil className="size-3.5" />
              {labels.editArtistService}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#fecaca] bg-white px-2.5 text-xs font-bold text-[#f43f5e] transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-white/[0.03] dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="size-3.5" />
              {labels.deleteArtistService}
            </button>
          ) : null}
        </div>
      ) : null}
      {chips.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      <ArtistServiceRegionPrices
        labels={labels}
        regions={regions}
        regionsLoading={regionsLoading}
        service={service}
        readOnly={readOnly}
      />
    </article>
  );
}

type ArtistServiceFormMode =
  | { type: "assign" }
  | { type: "edit"; service: UnknownRecord };

type ArtistServiceFormValues = {
  service_id: string;
  price: string;
  advance_amount: string;
  currency: string;
  note: string;
  status: string;
  region_prices: RegionPriceRow[];
};

type ArtistServiceDraft = ArtistServiceFormValues & {
  localId: string;
};

function ArtistServiceForm({
  labels,
  mode,
  regions,
  services,
  submitting,
  onCancel,
  onSubmit,
}: {
  labels: ArtistsLabels;
  mode: ArtistServiceFormMode;
  regions: Region[];
  services: Service[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ArtistServiceFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ArtistServiceFormValues>(() => artistServiceFormValuesFromMode(mode));
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateArtistServiceForm(values, labels);
    setError(validationError);
    if (validationError) return;
    await onSubmit(values);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-[#e6ebf2] bg-[#f8fafc] p-3 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-950 dark:text-white">
          {mode.type === "edit" ? labels.editArtistService : labels.assignService}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="grid size-8 cursor-pointer place-items-center rounded-[10px] text-[#64748b] transition hover:bg-white hover:text-[#0f172a] dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
          aria-label={labels.cancel}
          title={labels.cancel}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          compact
          disabled={mode.type === "edit"}
          label={labels.services}
          type="select"
          required
          value={values.service_id}
          placeholder={labels.services}
          options={serviceOptions(services, labels)}
          onChange={(service_id) => setValues((current) => ({ ...current, service_id }))}
        />
        <FormField
          compact
          label={labels.price}
          required
          value={formatMoneyInput(values.price, labels.locale)}
          suffix={values.currency}
          onChange={(price) => setValues((current) => ({ ...current, price: parseMoneyInput(price) }))}
        />
        <FormField
          compact
          label={labels.advanceAmount}
          value={formatMoneyInput(values.advance_amount, labels.locale)}
          suffix={values.currency}
          onChange={(advance_amount) => setValues((current) => ({ ...current, advance_amount: parseMoneyInput(advance_amount) }))}
        />
        <FormField
          compact
          label={labels.currency}
          type="select"
          value={values.currency}
          options={currencyOptions()}
          onChange={(currency) => setValues((current) => ({ ...current, currency }))}
        />
        {mode.type === "edit" ? (
          <FormField
            compact
            label={labels.status}
            type="select"
            value={values.status}
            options={artistServiceStatusOptions(labels)}
            onChange={(status) => setValues((current) => ({ ...current, status }))}
          />
        ) : null}
        <FormField
          compact
          className="md:col-span-2"
          label={labels.reason}
          placeholder={labels.commentPlaceholder}
          type="textarea"
          rows={3}
          value={values.note}
          onChange={(note) => setValues((current) => ({ ...current, note }))}
        />
      </div>
      <ArtistServiceRegionPriceDraftFields
        labels={labels}
        regions={regions}
        value={values.region_prices}
        onChange={(region_prices) => setValues((current) => ({ ...current, region_prices }))}
      />
      {error ? <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e6ebf2] bg-white px-3 text-xs font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          {labels.cancel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {submitting ? labels.saving : labels.saveBusySlot}
        </button>
      </div>
    </form>
  );
}

function ArtistServiceDraftEditor({
  labels,
  regions,
  services,
  value,
  error,
  onChange,
}: {
  labels: ArtistsLabels;
  regions: Region[];
  services: Service[];
  value: ArtistServiceDraft[];
  error?: string;
  onChange: (value: ArtistServiceDraft[]) => void;
}) {
  const addDraft = () => onChange([...value, createArtistServiceDraft()]);
  const updateDraft = (localId: string, patch: Partial<ArtistServiceDraft>) => {
    onChange(value.map((draft) => (draft.localId === localId ? { ...draft, ...patch } : draft)));
  };
  const removeDraft = (localId: string) => onChange(value.filter((draft) => draft.localId !== localId));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addDraft}
          className={adminPrimaryActionButtonClass}
        >
          <Plus className="size-4" />
          {labels.assignService}
        </button>
      </div>
      {value.length ? (
        <div className="space-y-3">
          {value.map((draft) => (
            <div key={draft.localId} className="rounded-lg border border-[#e6ebf2] bg-white p-3 dark:border-white/10 dark:bg-slate-950">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-950 dark:text-white">{labels.services}</p>
                <button
                  type="button"
                  onClick={() => removeDraft(draft.localId)}
                  className="grid size-8 cursor-pointer place-items-center rounded-[10px] border border-[#fecaca] text-[#f43f5e] transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  aria-label={labels.deleteArtistService}
                  title={labels.deleteArtistService}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  compact
                  label={labels.services}
                  type="select"
                  value={draft.service_id}
                  placeholder={labels.services}
                  options={serviceOptions(services, labels)}
                  onChange={(service_id) => updateDraft(draft.localId, { service_id })}
                />
                <FormField
                  compact
                  label={labels.price}
                  value={formatMoneyInput(draft.price, labels.locale)}
                  suffix={draft.currency}
                  onChange={(price) => updateDraft(draft.localId, { price: parseMoneyInput(price) })}
                />
                <FormField
                  compact
                  label={labels.advanceAmount}
                  value={formatMoneyInput(draft.advance_amount, labels.locale)}
                  suffix={draft.currency}
                  onChange={(advance_amount) => updateDraft(draft.localId, { advance_amount: parseMoneyInput(advance_amount) })}
                />
                <FormField
                  compact
                  label={labels.currency}
                  type="select"
                  value={draft.currency}
                  options={currencyOptions()}
                  onChange={(currency) => updateDraft(draft.localId, { currency })}
                />
              </div>
              <ArtistServiceRegionPriceDraftFields
                labels={labels}
                regions={regions}
                value={draft.region_prices}
                onChange={(region_prices) => updateDraft(draft.localId, { region_prices })}
              />
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}

function ArtistServiceRegionPriceDraftFields({
  labels,
  regions,
  value,
  onChange,
}: {
  labels: ArtistsLabels;
  regions: Region[];
  value: RegionPriceRow[];
  onChange: (value: RegionPriceRow[]) => void;
}) {
  const addRow = () => onChange([...value, createRegionPriceRow()]);
  const updateRow = (localId: string, patch: Partial<RegionPriceRow>) => {
    onChange(value.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  };
  const removeRow = (localId: string) => onChange(value.filter((row) => row.localId !== localId));

  return (
    <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-white/10">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
        <p className="min-w-0 text-[13px] font-bold text-[#0f172a] dark:text-white">{labels.regionPrices}</p>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e6ebf2] bg-white px-2.5 text-xs font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          <Plus className="size-3.5" />
          {labels.add}
        </button>
      </div>
      {value.length ? (
        <div className="mt-3 space-y-2">
          {value.map((row) => (
            <div key={row.localId} className="grid gap-2 rounded-[10px] border border-[#e6ebf2] bg-white p-2 md:grid-cols-[minmax(0,1fr)_minmax(120px,160px)_minmax(100px,120px)_minmax(140px,180px)_auto] dark:border-white/10 dark:bg-slate-950">
              <FormField
                compact
                hideLabel
                label={labels.region}
                type="select"
                value={row.region_id}
                placeholder={labels.region}
                options={regionPriceOptions(regions, row, labels)}
                onChange={(region_id) => updateRow(row.localId, { region_id })}
              />
              <FormField
                compact
                hideLabel
                label={labels.price}
                value={formatMoneyInput(row.price, labels.locale)}
                placeholder={labels.price}
                suffix={row.currency}
                onChange={(price) => updateRow(row.localId, { price: parseMoneyInput(price) })}
              />
              <FormField
                compact
                hideLabel
                label={labels.currency}
                type="select"
                value={row.currency}
                options={currencyOptions()}
                onChange={(currency) => updateRow(row.localId, { currency })}
              />
              <div>
                <FormField
                  compact
                  hideLabel
                  label={labels.advanceAmount}
                  value={formatMoneyInput(row.advance_amount, labels.locale)}
                  placeholder={row.advance_effective ? formatMoneyWithCurrency(row.advance_effective, labels.locale, row.currency) : labels.advanceAmount}
                  suffix={row.currency}
                  onChange={(advance_amount) => updateRow(row.localId, { advance_amount: parseMoneyInput(advance_amount) })}
                />
                {!row.advance_amount && row.advance_effective ? <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{labels.effectiveAdvance}: {formatMoneyWithCurrency(row.advance_effective, labels.locale, row.currency)}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.localId)}
                className="grid size-10 cursor-pointer place-items-center rounded-[10px] border border-[#fecaca] bg-white text-[#f43f5e] transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-white/[0.03] dark:text-rose-300 dark:hover:bg-rose-500/10"
                aria-label={labels.deleteRegionPrice}
                title={labels.deleteRegionPrice}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-[10px] border border-dashed border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#64748b] dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
          {labels.regionPricesEmpty}
        </p>
      )}
    </div>
  );
}

type RegionPriceRow = {
  localId: string;
  id?: number;
  region_id: string;
  region_name?: string;
  price: string;
  currency: string;
  advance_amount: string;
  advance_effective?: string;
  is_advance_custom?: boolean;
  editing?: boolean;
};

function ArtistServiceRegionPrices({
  labels,
  regions,
  regionsLoading,
  service,
  readOnly = false,
}: {
  labels: ArtistsLabels;
  regions: Region[];
  regionsLoading: boolean;
  service: UnknownRecord;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const serviceId = getArtistServiceRecordId(service);
  const [rows, setRows] = useState<RegionPriceRow[]>(() => regionPriceRowsFromService(service));
  const [savingRow, setSavingRow] = useState("");
  const [deletingRow, setDeletingRow] = useState("");
  const [savedRow, setSavedRow] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const savedRowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedRowTimeout.current) clearTimeout(savedRowTimeout.current);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!serviceId) return () => {
      ignore = true;
    };

    artistServicesApi
      .regionPrices(serviceId)
      .then((items) => {
        if (!ignore) setRows(regionPriceRowsFromRecords(items));
      })
      .catch(() => {
        // The list response may already include region_prices; keep that data if the detail endpoint is unavailable.
      });

    return () => {
      ignore = true;
    };
  }, [serviceId]);

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        localId: `new-${Date.now()}`,
        advance_amount: "",
        currency: "UZS",
        editing: true,
        price: "",
        region_id: "",
      },
    ]);
  };

  const updateRow = (localId: string, patch: Partial<RegionPriceRow>) => {
    setRows((current) => current.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
    setRowErrors((current) => ({ ...current, [localId]: "" }));
    setSavedRow((current) => (current === localId ? "" : current));
  };

  const editRow = (localId: string) => {
    setRows((current) => current.map((row) => (row.localId === localId ? { ...row, editing: true } : row)));
    setRowErrors((current) => ({ ...current, [localId]: "" }));
    setSavedRow((current) => (current === localId ? "" : current));
  };

  const saveRow = async (row: RegionPriceRow) => {
    if (!serviceId) {
      setRowErrors((current) => ({ ...current, [row.localId]: labels.regionPriceServiceMissing }));
      return;
    }
    const regionId = Number(row.region_id);
    const price = Number(row.price);
    const advanceAmount = row.advance_amount === "" ? null : Number(row.advance_amount);
    if (!Number.isFinite(regionId) || regionId <= 0) {
      setRowErrors((current) => ({ ...current, [row.localId]: labels.regionPriceRegionRequired }));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setRowErrors((current) => ({ ...current, [row.localId]: labels.regionPricePriceRequired }));
      return;
    }
    if (advanceAmount !== null && (!Number.isFinite(advanceAmount) || advanceAmount < 0)) {
      setRowErrors((current) => ({ ...current, [row.localId]: labels.regionAdvanceInvalid }));
      return;
    }
    if (advanceAmount !== null && advanceAmount > price) {
      setRowErrors((current) => ({ ...current, [row.localId]: labels.regionAdvanceExceedsPrice }));
      return;
    }

    setSavingRow(row.localId);
    try {
      const savedRecord = await artistServicesApi.upsertRegionPrice(serviceId, {
        advance_amount: advanceAmount,
        currency: row.currency,
        price,
        region_id: regionId,
      });
      const nextRows = await artistServicesApi.regionPrices(serviceId);
      const normalizedRows = regionPriceRowsFromRecords(nextRows);
      const savedId = isRecord(savedRecord) ? numberFromUnknown(savedRecord.id) : undefined;
      const savedRegionId = isRecord(savedRecord) ? numberFromUnknown(savedRecord.region_id) : undefined;
      const savedLocalId =
        normalizedRows.find((item) => item.id === savedId)?.localId ??
        normalizedRows.find((item) => Number(item.region_id) === (savedRegionId ?? regionId))?.localId ??
        row.localId;

      setRows(normalizedRows);
      setSavedRow(savedLocalId);
      if (savedRowTimeout.current) clearTimeout(savedRowTimeout.current);
      savedRowTimeout.current = setTimeout(() => setSavedRow(""), 1200);
      toast.success(labels.regionPriceSaved);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.regionPriceSaveFailed);
    } finally {
      setSavingRow("");
    }
  };

  const deleteRow = async (row: RegionPriceRow) => {
    if (!row.id) {
      setRows((current) => current.filter((item) => item.localId !== row.localId));
      return;
    }

    setDeletingRow(row.localId);
    try {
      await artistServicesApi.deleteRegionPrice(row.id);
      setRows((current) => current.filter((item) => item.localId !== row.localId));
      toast.success(labels.regionPriceDeleted);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.regionPriceDeleteFailed);
    } finally {
      setDeletingRow("");
    }
  };

  return (
    <div className="mt-3 rounded-[10px] border border-[#e6ebf2] bg-[#f8fafc] p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#0f172a] dark:text-white">{labels.regionPrices}</p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e6ebf2] bg-white px-2.5 text-xs font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          >
            <Plus className="size-3.5" />
            {labels.add}
          </button>
        ) : null}
      </div>

      {rows.length ? (
        <div className="mt-3 space-y-2">
          {rows.map((row) => {
            const saved = savedRow === row.localId;
            const saving = savingRow === row.localId;
            const deleting = deletingRow === row.localId;
            const editing = !readOnly && (row.editing || !row.id);
            const disabled = saving || deleting || saved;
            const options = regionPriceOptions(regions, row, labels);
            return (
              <div key={row.localId} className="rounded-lg bg-slate-50 p-2 dark:bg-white/[0.04]">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(120px,160px)_minmax(100px,120px)_minmax(140px,180px)_auto]">
                  <label className="block">
                    <span className="sr-only">{labels.region}</span>
                    <Select
                      className={cn(
                        "artistbor-region-price-select w-full",
                        readOnly && "artistbor-region-price-select-readonly",
                      )}
                      size="large"
                      disabled={disabled || regionsLoading || !editing}
                      value={row.region_id || undefined}
                      placeholder={labels.region}
                      onChange={(value) => updateRow(row.localId, { region_id: value ? String(value) : "" })}
                      options={options.map((option) => ({ value: String(option.value), label: option.label }))}
                    />
                  </label>
                  <div>
                    <label className="relative block">
                      <span className="sr-only">{labels.advanceAmount}</span>
                      <input
                        disabled={disabled || !editing}
                        type="text"
                        inputMode="numeric"
                        value={formatMoneyInput(row.advance_amount, labels.locale)}
                        placeholder={row.advance_effective ? formatMoneyWithCurrency(row.advance_effective, labels.locale, row.currency) : labels.advanceAmount}
                        onChange={(event) => updateRow(row.localId, { advance_amount: parseMoneyInput(event.target.value) })}
                        className={cn(
                          "artistbor-table-filter-control h-10 w-full rounded-xl border border-[#e6ebf2] bg-[#f8fafc] px-3 pr-14 text-[13px] font-bold text-[#475569] shadow-none outline-none transition focus:border-orange-500/45 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-200",
                          readOnly && "border-transparent bg-transparent px-0 dark:border-transparent dark:bg-transparent",
                        )}
                      />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94a3b8] dark:text-slate-500">{row.currency}</span>
                    </label>
                    {!row.advance_amount && row.advance_effective ? <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{labels.effectiveAdvance}: {formatMoneyWithCurrency(row.advance_effective, labels.locale, row.currency)}</p> : null}
                  </div>
                  <label className="block">
                    <span className="sr-only">{labels.currency}</span>
                    <Select
                      className="artistbor-region-price-select w-full"
                      size="large"
                      disabled={disabled || !editing}
                      value={row.currency}
                      onChange={(currency) => updateRow(row.localId, { currency: String(currency) })}
                      options={currencyOptions().map((option) => ({ value: option.value, label: option.label }))}
                    />
                  </label>
                  <label className="relative block">
                    <span className="sr-only">{labels.price}</span>
                    <input
                      disabled={disabled || !editing}
                      type="text"
                      inputMode="numeric"
                      value={formatMoneyInput(row.price, labels.locale)}
                      placeholder={labels.price}
                      onChange={(event) => updateRow(row.localId, { price: parseMoneyInput(event.target.value) })}
                      className={cn(
                        "artistbor-table-filter-control h-10 w-full rounded-xl border border-[#e6ebf2] bg-[#f8fafc] px-3 pr-14 text-[13px] font-bold text-[#475569] shadow-none outline-none transition focus:border-orange-500/45 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-200",
                        readOnly && "border-transparent bg-transparent px-0 dark:border-transparent dark:bg-transparent",
                      )}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94a3b8] dark:text-slate-500">
                      {row.currency}
                    </span>
                  </label>
                  {!readOnly ? (
                    <div className="flex justify-end gap-1.5">
                      {editing || saving || saved ? (
                      <button
                        type="button"
                        onClick={() => void saveRow(row)}
                        disabled={disabled}
                        className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-80 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                        aria-label={labels.saveRegionPrice}
                        title={labels.saveRegionPrice}
                      >
                        {saving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : saved ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Save className="size-4" />
                        )}
                      </button>
                      ) : (
                      <button
                        type="button"
                        onClick={() => editRow(row.localId)}
                        disabled={disabled}
                        className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                        aria-label={labels.editRegionPrice}
                        title={labels.editRegionPrice}
                      >
                        <Pencil className="size-4" />
                      </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteRow(row)}
                        disabled={disabled}
                        className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-[#fecaca] bg-white text-[#f43f5e] transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-white/[0.03] dark:text-rose-300 dark:hover:bg-rose-500/10"
                        aria-label={labels.deleteRegionPrice}
                        title={labels.deleteRegionPrice}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {rowErrors[row.localId] ? (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300">{rowErrors[row.localId]}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-[10px] border border-dashed border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#64748b] dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
          {labels.regionPricesEmpty}
        </p>
      )}
    </div>
  );
}

function ArtistFinanceTab({
  labels,
  state,
}: {
  labels: ArtistsLabels;
  state: DetailResourceState;
}) {
  const { locale } = useI18n();

  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.finance)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const balance = isRecord(state.raw) ? (state.raw as ArtistBalanceRecord) : {};
  const transactions = (state.rows as ArtistTransactionRecord[]).filter(isRenderableArtistTransaction);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <ArtistFinanceMetric
          label={labels.balance}
          value={formatMoneyWithCurrency(balance.balance ?? balance.current_balance ?? 0, labels.locale, currencyFromRecord(balance)) || "—"}
        />
        <ArtistFinanceMetric
          label={labels.debt}
          value={formatMoneyWithCurrency(balance.debt ?? balance.current_debt ?? 0, labels.locale, currencyFromRecord(balance)) || "—"}
          tone="danger"
        />
      </div>
      {transactions.length ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.transactions}</h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {labels.recordCount(transactions.length)}
            </span>
          </div>
          <div className="space-y-2">
            {transactions.map((transaction, index) => (
              <ArtistTransactionCard
                key={String(transaction.id ?? resourceRowKey(transaction as UnknownRecord, index))}
                index={index}
                labels={labels}
                locale={locale}
                transaction={transaction}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArtistTransactionCard({
  index,
  labels,
  locale,
  transaction,
}: {
  index: number;
  labels: ArtistsLabels;
  locale: Locale;
  transaction: ArtistTransactionRecord;
}) {
  const type = firstMeaningfulValue(transaction, ["type", "transaction_type"]);
  const amount = firstMeaningfulValue(transaction, ["amount"]);
  const createdAt = firstMeaningfulValue(transaction, ["created_at", "createdAt"]);
  const balanceBefore = firstMeaningfulValue(transaction, ["balance_before"]);
  const balanceAfter = firstMeaningfulValue(transaction, ["balance_after"]);
  const orderId = firstMeaningfulValue(transaction, ["order_id", "orderId"]);
  const description = firstMeaningfulValue(transaction, ["description", "note"]);
  const currency = currencyFromRecord(transaction);
  const metaItems = [
    balanceBefore !== undefined
      ? `${labels.balanceBefore}: ${formatMoneyWithCurrency(balanceBefore, labels.locale, currency) || toDisplay(balanceBefore)}`
      : "",
    balanceAfter !== undefined
      ? `${labels.balanceAfter}: ${formatMoneyWithCurrency(balanceAfter, labels.locale, currency) || toDisplay(balanceAfter)}`
      : "",
    orderId !== undefined ? `${labels.orderId}: ${toDisplay(orderId)}` : "",
  ].filter(Boolean);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-transparent">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
            {type ? formatEnumValue("type", type, labels) : labels.recordNumber(index + 1)}
          </p>
          {createdAt !== undefined ? (
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {formatArtistActivityDate(createdAt, locale)}
            </p>
          ) : null}
        </div>
        {amount !== undefined ? (
          <p className="shrink-0 text-sm font-black text-slate-950 dark:text-white">
            {formatMoneyWithCurrency(amount, labels.locale, currency) || toDisplay(amount)}
          </p>
        ) : null}
      </div>
      {metaItems.length ? (
        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 md:grid-cols-3 dark:text-slate-300">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {description ? (
        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          {toDisplay(description)}
        </p>
      ) : null}
    </article>
  );
}

function isRenderableArtistTransaction(transaction: ArtistTransactionRecord) {
  return [
    "type",
    "transaction_type",
    "amount",
    "balance_before",
    "balance_after",
    "order_id",
    "orderId",
    "description",
    "note",
    "created_at",
    "createdAt",
  ].some((key) => hasMeaningfulValue((transaction as UnknownRecord)[key]));
}

function ArtistFinanceMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-transparent">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-black",
          tone === "danger" ? "text-rose-600 dark:text-rose-300" : "text-slate-950 dark:text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ArtistScheduleSummaryTab({
  artist,
  state,
  labels,
  onManage,
  onRangeChange,
}: {
  artist: ArtistProfile;
  state: DetailResourceState;
  labels: ArtistsLabels;
  onManage?: (schedule: UnknownRecord) => void;
  onRangeChange?: AvailabilityRangeReloader;
}) {
  const { locale } = useI18n();

  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.availability)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const schedules = scheduleRecordsFromState(state, artist);
  const schedule = schedules[0] ?? getDefaultScheduleRecord(artist);
  const availabilityRows = schedules.flatMap((item) => availabilityRowsFromSchedule(item, labels));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.availability}</h4>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
            {labels.busyDaysCount(countBusyDays(availabilityRows))}
          </span>
        </div>
        {onManage ? (
          <button
            type="button"
            className={adminPrimaryActionButtonClass}
            onClick={() => onManage(schedule)}
          >
            <CalendarDays className="size-4" />
            {labels.manageAvailability}
          </button>
        ) : null}
      </div>
      <ArtistAvailabilityCalendar
        labels={labels}
        locale={locale}
        rows={availabilityRows}
        schedule={schedule}
        onRangeChange={onRangeChange}
      />
    </div>
  );
}

function ArtistAvailabilityCalendar({
  labels,
  locale,
  onRangeChange,
  rows,
  schedule,
}: {
  labels: ArtistsLabels;
  locale: Locale;
  onRangeChange?: AvailabilityRangeReloader;
  rows: AvailabilityRow[];
  schedule: UnknownRecord;
}) {
  const initialMonth = startOfCalendarMonth(parseDateOnly(schedule.date_from) ?? new Date());
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(initialMonth));
  const [monthLoading, setMonthLoading] = useState(false);
  const committedMonthRef = useRef(initialMonth);
  const committedSelectedDateRef = useRef(dateKey(initialMonth));
  const monthRequestIdRef = useRef(0);
  const monthNames = calendarMonthNames(locale);
  const rowsByDate = new Map<string, AvailabilityRow[]>();

  rows.forEach((row) => {
    const key = normalizeDateInput(row.date) || row.date;
    if (!key || key === "—") return;
    const current = rowsByDate.get(key) ?? [];
    current.push(row);
    rowsByDate.set(key, current);
  });

  const days = calendarDaysForMonth(visibleMonth);
  const scheduleStart = parseDateOnly(schedule.date_from);
  const scheduleEnd = parseDateOnly(schedule.date_to);
  const isInScheduleRange = (day: Date) =>
    (!scheduleStart || day >= scheduleStart) && (!scheduleEnd || day <= scheduleEnd);
  const inRangeDays = days.filter((day) => day.getMonth() === visibleMonth.getMonth() && isInScheduleRange(day));
  const busyDayKeys = new Set(
    inRangeDays
      .map(dateKey)
      .filter((key) => (rowsByDate.get(key) ?? []).some((row) => row.tone !== "success")),
  );
  const selectedRows = rowsByDate.get(selectedDate) ?? [];
  const selectedBusy = selectedRows.some((row) => row.tone !== "success");
  const years = calendarYearOptions(schedule, visibleMonth);

  const changeMonth = (nextMonth: Date) => {
    const normalized = startOfCalendarMonth(nextMonth);
    const normalizedDateKey = dateKey(normalized);
    setVisibleMonth(normalized);
    setSelectedDate(normalizedDateKey);

    if (!onRangeChange) {
      committedMonthRef.current = normalized;
      committedSelectedDateRef.current = normalizedDateKey;
      return;
    }

    const requestId = ++monthRequestIdRef.current;
    setMonthLoading(true);

    void onRangeChange(calendarMonthRange(normalized))
      .then((loaded) => {
        if (monthRequestIdRef.current !== requestId) return;
        if (loaded) {
          committedMonthRef.current = normalized;
          committedSelectedDateRef.current = normalizedDateKey;
          return;
        }

        setVisibleMonth(committedMonthRef.current);
        setSelectedDate(committedSelectedDateRef.current);
      })
      .catch(() => {
        if (monthRequestIdRef.current !== requestId) return;
        setVisibleMonth(committedMonthRef.current);
        setSelectedDate(committedSelectedDateRef.current);
      })
      .finally(() => {
        if (monthRequestIdRef.current === requestId) setMonthLoading(false);
      });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.calendarPreview}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {monthLoading ? (
              <span
                aria-hidden="true"
                className="inline-block h-3 w-36 animate-pulse rounded bg-slate-200 align-middle dark:bg-white/10 motion-reduce:animate-none"
              />
            ) : (
              <>{labels.availableDaysCount(inRangeDays.length - busyDayKeys.size)} · {labels.busyDaysCount(busyDayKeys.size)}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => changeMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
            className="grid size-10 place-items-center rounded-xl border border-[#e6ebf2] bg-[#f8fafc] text-slate-500 transition hover:border-orange-500/45 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-amber-300/50 dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label={labels.previousMonth}
          >
            <ChevronLeft className="size-4" />
          </button>
          <Select
            className="artistbor-calendar-select"
            value={visibleMonth.getMonth()}
            onChange={(value) => changeMonth(new Date(visibleMonth.getFullYear(), Number(value), 1))}
            options={monthNames.map((month, index) => ({ value: index, label: month }))}
            aria-label={labels.selectMonth}
          />
          <button
            type="button"
            onClick={() => changeMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
            className="grid size-10 place-items-center rounded-xl border border-[#e6ebf2] bg-[#f8fafc] text-slate-500 transition hover:border-orange-500/45 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-amber-300/50 dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label={labels.nextMonth}
          >
            <ChevronRight className="size-4" />
          </button>
          <Select
            className="artistbor-calendar-year-select"
            value={visibleMonth.getFullYear()}
            onChange={(value) => changeMonth(new Date(Number(value), visibleMonth.getMonth(), 1))}
            options={years.map((year) => ({ value: year, label: year }))}
            aria-label={labels.selectYear}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" />{labels.availableStatus}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500" />{labels.busyStatus}</span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
        {labels.weekdays.map((day) => <span key={day}>{day}</span>)}
      </div>
      {monthLoading ? (
        <p className="sr-only" role="status" aria-live="polite">
          {labels.calendarLoading}
        </p>
      ) : null}
      <div className="mt-2 grid grid-cols-7 gap-1" aria-busy={monthLoading}>
        {monthLoading
          ? days.map((day) => (
              <div
                key={`calendar-skeleton-${dateKey(day)}`}
                aria-hidden="true"
                className="grid min-h-12 animate-pulse place-items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.04] motion-reduce:animate-none"
              >
                <span className="h-3 w-4 rounded bg-slate-200 dark:bg-white/10" />
              </div>
            ))
          : days.map((day) => {
              const key = dateKey(day);
              const dayRows = rowsByDate.get(key) ?? [];
              const busy = dayRows.some((row) => row.tone !== "success");
              const inCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const inRange = inCurrentMonth && isInScheduleRange(day);
              const selected = key === selectedDate;
              const statusLabel = !inRange ? labels.outsideSchedule : busy ? labels.busyStatus : labels.availableStatus;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!inRange}
                  onClick={() => setSelectedDate(key)}
                  aria-label={`${formatHumanDate(key, locale)} · ${statusLabel}`}
                  className={cn(
                    "relative grid min-h-12 place-items-center rounded-lg border text-xs font-bold transition",
                    !inCurrentMonth && "border-transparent text-slate-300 dark:text-slate-700",
                    inCurrentMonth && !inRange && "cursor-not-allowed border-transparent text-slate-300 dark:text-slate-600",
                    inRange && !busy && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/15",
                    inRange && busy && "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300 dark:hover:bg-rose-400/15",
                    selected && "ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-[#111827]",
                  )}
                >
                  <span>{day.getDate()}</span>
                  {inRange ? <span className={cn("absolute bottom-1 size-1 rounded-full", busy ? "bg-rose-500" : "bg-emerald-500")} /> : null}
                </button>
              );
            })}
      </div>

      {monthLoading ? (
        <div
          aria-hidden="true"
          className="mt-4 animate-pulse rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04] motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
            <span className="h-5 w-14 rounded-full bg-slate-200 dark:bg-white/10" />
          </div>
          <span className="mt-3 block h-3 w-16 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {formatHumanDate(selectedDate, locale)}
            </p>
            <ArtistHeaderBadge label={selectedBusy ? labels.busyStatus : labels.availableStatus} tone={selectedBusy ? "warning" : "success"} />
          </div>
          {selectedRows.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {selectedRows.map((row, index) => (
                <div key={`${row.date}-${row.time}-${index}`} className="rounded-lg bg-white px-3 py-2 dark:bg-[#111827]">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{row.time}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{row.sourceLabel}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{labels.availableStatus}</p>
          )}
        </div>
      )}
    </section>
  );
}

function ScheduleManagementDrawer({
  artist,
  labels,
  open,
  schedule,
  onClose,
  onChanged,
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
  open: boolean;
  schedule: UnknownRecord | null;
  onClose: () => void;
  onChanged: (options?: AvailabilityReloadOptions) => Promise<boolean>;
}) {
  const { locale } = useI18n();
  const toast = useToast();
  const [busySlotDialog, setBusySlotDialog] = useState<BusySlotDialogState>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectedSchedule = schedule ?? getDefaultScheduleRecord(artist);
  const availabilityRows = availabilityRowsFromSchedule(selectedSchedule, labels);
  const rawAvailability = getRawAvailabilityPreview(selectedSchedule, labels);
  const artistId = getArtistId(artist);
  const refreshSchedule = () => {
    void onChanged({
      background: true,
      date_from: normalizeDateInput(selectedSchedule.date_from) || undefined,
      date_to: normalizeDateInput(selectedSchedule.date_to) || undefined,
    });
  };

  const handleDeleteBusySlot = async (row: AvailabilityRow) => {
    const slotId = getAvailabilityRowId(row);
    if (!slotId) {
      toast.error(labels.busySlotIdMissing);
      return;
    }

    Modal.confirm({
      title: labels.deleteBusySlotTitle,
      content: labels.deleteBusySlotConfirm,
      okText: labels.deleteSchedule,
      okButtonProps: { danger: true },
      cancelText: labels.cancel,
      rootClassName: "artistbor-confirm-modal",
      async onOk() {
        try {
          await artistAvailabilityApi.deleteBusySlot(slotId);
          toast.success(labels.busySlotDeleted);
          refreshSchedule();
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : labels.busySlotDeleteFailed);
          throw caught;
        }
      },
    });
  };

  const handleSubmitBusySlot = async (values: BusySlotFormValues) => {
    if (!artistId) {
      toast.error(labels.artistIdMissing);
      return;
    }

    const currentDialog = busySlotDialog;
    if (!currentDialog) return;

    const validationError = validateBusySlotForm(values, labels);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const editingSlotId = currentDialog.mode === "edit"
      ? getAvailabilityRowId(currentDialog.row)
      : undefined;
    if (currentDialog.mode === "edit" && !editingSlotId) {
      toast.error(labels.busySlotIdMissing);
      return;
    }

    const overlappingRow = findOverlappingArtistAvailabilityInterval(
      {
        date: values.date,
        startTime: values.start_time,
        endTime: values.end_time,
      },
      availabilityRows,
      editingSlotId,
    );
    if (overlappingRow) {
      toast.error(labels.busySlotOverlap(overlappingRow.time, overlappingRow.sourceLabel));
      return;
    }

    const payload = buildArtistBusySlotPayload({
      date: values.date,
      startTime: values.start_time,
      endTime: values.end_time,
      note: values.note,
    });
    setSubmitting(true);
    try {
      if (currentDialog.mode === "edit") {
        const slotId = getAvailabilityRowId(currentDialog.row);
        if (!slotId) {
          toast.error(labels.busySlotIdMissing);
          return;
        }
        const rollbackValues = initialBusySlotValues(currentDialog);
        const rollbackPayload = buildArtistBusySlotPayload({
          date: rollbackValues.date,
          startTime: rollbackValues.start_time,
          endTime: rollbackValues.end_time,
          note: rollbackValues.note,
        });
        await artistAvailabilityApi.deleteBusySlot(slotId);
        try {
          await artistAvailabilityApi.createBusySlot(artistId, payload);
        } catch {
          try {
            await artistAvailabilityApi.createBusySlot(artistId, rollbackPayload);
          } catch {
            throw new Error(labels.busySlotUpdateFailedRestoreFailed);
          }
          throw new Error(labels.busySlotUpdateFailedRestored);
        }
        toast.success(labels.busySlotUpdated);
      } else {
        await artistAvailabilityApi.createBusySlot(artistId, payload);
        toast.success(labels.busySlotCreated);
      }

      setBusySlotDialog(null);
      refreshSchedule();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.busySlotSaveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        destroyOnClose
        maskClosable
        open={open}
        onClose={onClose}
        placement="right"
        size="min(100vw, 1040px)"
        closeIcon={<X className="size-5" />}
        rootClassName="artistbor-application-drawer"
        classNames={adminDrawerClassNames}
        title={
          <div className="min-w-0">
            <span className="block truncate text-lg font-bold text-slate-950 dark:text-white">
              {labels.scheduleManagementTitle}
            </span>
            <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {getArtistName(artist, labels)} · {formatPhone(artist.phone) || "—"}
            </p>
          </div>
        }
        footer={null}
        styles={adminDrawerSubtitleStyles}
      >
        <div className="min-h-full bg-slate-50/60 p-4 dark:bg-[#0f172a] sm:p-5">
          <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                  <CalendarDays className="size-5 text-amber-500" />
                  {labels.availabilityList}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {labels.scheduleManagementHint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBusySlotDialog({ mode: "create" })}
                className={cn(adminPrimaryActionButtonClass, "h-10 shrink-0 justify-center sm:min-w-48")}
              >
                <Plus className="size-4" />
                {labels.addAvailability}
              </button>
            </div>
          </section>

          <ScheduleSummaryStrip
            labels={labels}
            locale={locale}
            rows={availabilityRows}
            schedule={selectedSchedule}
          />

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <ScheduleCalendarPreview
              key={`${toDisplay(selectedSchedule.date_from)}-${toDisplay(selectedSchedule.date_to)}`}
              labels={labels}
              locale={locale}
              rows={availabilityRows}
              schedule={selectedSchedule}
              onAddDate={(date) => setBusySlotDialog({ mode: "create", date })}
            />
            <AvailabilityRows
              labels={labels}
              locale={locale}
              rows={availabilityRows}
              onDelete={handleDeleteBusySlot}
              onEdit={(row) => setBusySlotDialog({ mode: "edit", row })}
            />
          </div>

          {rawAvailability ? (
            <details className="mt-4 rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
              <summary className="cursor-pointer text-sm font-bold text-slate-950 dark:text-white">
                {labels.rawAvailability}
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                {rawAvailability}
              </pre>
            </details>
          ) : null}
        </div>
      </Drawer>
      <BusySlotModal
        key={busySlotDialogKey(busySlotDialog)}
        labels={labels}
        loading={submitting}
        open={Boolean(busySlotDialog)}
        state={busySlotDialog}
        onClose={() => setBusySlotDialog(null)}
        onDelete={busySlotDialog?.mode === "edit" ? () => {
          const row = busySlotDialog.row;
          setBusySlotDialog(null);
          void handleDeleteBusySlot(row);
        } : undefined}
        onSubmit={handleSubmitBusySlot}
      />
    </>
  );
}

function BusySlotModal({
  labels,
  loading,
  onClose,
  onDelete,
  onSubmit,
  open,
  state,
}: {
  labels: ArtistsLabels;
  loading: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (values: BusySlotFormValues) => Promise<void>;
  open: boolean;
  state: BusySlotDialogState;
}) {
  const [values, setValues] = useState<BusySlotFormValues>(() => initialBusySlotValues(state));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit(values);
  };

  return (
    <Modal
      destroyOnHidden
      open={open}
      onCancel={onClose}
      confirmLoading={loading}
      centered
      width={760}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-confirm-modal artistbor-busy-slot-modal"
      title={
        <div className="artistbor-busy-slot-modal__heading">
          <div className="artistbor-busy-slot-modal__icon">
            <CalendarDays className="size-6" />
          </div>
          <div className="min-w-0">
            <h2 className="artistbor-busy-slot-modal__title">
              {state?.mode === "edit" ? labels.editBusySlot : labels.addAvailability}
            </h2>
            <p className="artistbor-busy-slot-modal__subtitle">{labels.busySlotSubtitle}</p>
          </div>
        </div>
      }
      footer={null}
      styles={{
        body: { padding: 0 },
      }}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <FormField
          compact
          required
          label={labels.date}
          type="date"
          prefixIcon={<CalendarDays className="size-4 text-emerald-400" />}
          className="artistbor-busy-slot-field"
          inputClassName="artistbor-busy-slot-input"
          value={values.date}
          onChange={(date) => setValues((current) => ({ ...current, date }))}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <FormField
            compact
            required
            label={labels.startTime}
            type="time"
            prefixIcon={<Clock className="size-4 text-emerald-400" />}
            className="artistbor-busy-slot-field"
            inputClassName="artistbor-busy-slot-input"
            value={values.start_time}
            onChange={(start_time) => setValues((current) => ({ ...current, start_time }))}
          />
          <div className="hidden self-end px-1 pb-[18px] text-2xl font-light leading-none text-slate-400 sm:block">—</div>
          <FormField
            compact
            required
            label={labels.endTime}
            type="time"
            prefixIcon={<Clock className="size-4 text-emerald-400" />}
            className="artistbor-busy-slot-field"
            inputClassName="artistbor-busy-slot-input"
            value={values.end_time}
            onChange={(end_time) => setValues((current) => ({ ...current, end_time }))}
          />
        </div>
        <div className="artistbor-busy-slot-duration">
          <Clock className="size-4 shrink-0 text-emerald-300" />
          <span>
            {labels.duration}: {formatBusySlotDuration(values.start_time, values.end_time) || "—"}
          </span>
        </div>
        <FormField
          compact
          label={labels.reason}
          placeholder={labels.commentPlaceholder}
          type="textarea"
          rows={4}
          maxLength={200}
          showCount
          className="artistbor-busy-slot-field"
          inputClassName="artistbor-busy-slot-textarea"
          value={values.note}
          onChange={(note) => setValues((current) => ({ ...current, note }))}
        />
        <div className={cn("mt-2 grid gap-3", state?.mode === "edit" ? "sm:grid-cols-[1fr_1fr_1fr]" : "sm:grid-cols-2")}>
          {state?.mode === "edit" ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading}
              className="artistbor-busy-slot-action artistbor-busy-slot-action--danger text-sm font-semibold"
            >
              <Trash2 className="size-4" />
              {labels.deleteSchedule}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="artistbor-busy-slot-action artistbor-busy-slot-action--neutral text-sm font-semibold"
          >
            <X className="size-4" />
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="artistbor-busy-slot-action artistbor-busy-slot-action--success text-sm font-semibold"
          >
            <Save className="size-4" />
            {state?.mode === "edit" ? labels.saveBusySlot : labels.addAvailability}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleSummaryStrip({
  labels,
  locale,
  rows,
  schedule,
}: {
  labels: ArtistsLabels;
  locale: Locale;
  rows: AvailabilityRow[];
  schedule: UnknownRecord;
}) {
  const items = [
    { label: labels.schedulePeriod, value: formatScheduleRange(schedule, locale) },
    { label: labels.totalDays, value: countTotalDays(schedule) || "—" },
    { label: labels.busyDays, value: countBusyDays(rows) },
  ];

  return (
    <section className="mt-4 grid overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white dark:border-white/10 dark:bg-[#111827] sm:grid-cols-3">
      {items.map(({ label, value }, index) => (
        <div
          key={label}
          className={cn(
            "min-w-0 px-4 py-3.5",
            index > 0 && "border-t border-[#E5EAF2] dark:border-white/10 sm:border-l sm:border-t-0",
          )}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white" title={String(value)}>
            {toDisplay(value)}
          </p>
        </div>
      ))}
    </section>
  );
}

function AvailabilityRows({
  labels,
  locale,
  onDelete,
  onEdit,
  rows,
}: {
  labels: ArtistsLabels;
  locale: Locale;
  onDelete: (row: AvailabilityRow) => void;
  onEdit: (row: AvailabilityRow) => void;
  rows: AvailabilityRow[];
}) {
  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-950 dark:text-white">{labels.availabilityList}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {labels.busySlotCount(rows.length)}
          </p>
        </div>
        <ListChecks className="size-5 shrink-0 text-amber-500" />
      </div>

      {rows.length ? (
        <div className="mt-4 grid max-h-[560px] gap-2 overflow-y-auto pr-1">
          {rows.map((row, index) => {
            const editable = isEditableArtistAvailabilitySource(row.source);
            const lockDescription = row.source === "order" ? labels.orderBusyLocked : labels.holdBusyLocked;
            const orderPublicId = getArtistAvailabilityOrderPublicId(row.raw);

            return (
              <article
                key={`${row.id ?? "slot"}-${row.date}-${row.time}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">
                      {formatHumanDate(row.date, locale)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Clock className="size-3.5 shrink-0 text-slate-400" />
                      {row.time}
                    </p>
                  </div>
                  {editable ? (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-amber-400/40 dark:hover:text-amber-300"
                        aria-label={labels.editBusySlot}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:bg-white/[0.04] dark:text-rose-300 dark:hover:bg-rose-500/10"
                        aria-label={labels.deleteBusySlotTitle}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 dark:border-white/10 dark:text-slate-500"
                      title={lockDescription}
                    >
                      <LockKeyhole className="size-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ArtistHeaderBadge
                    label={row.sourceLabel}
                    tone={row.source === "hold" ? "warning" : row.source === "order" ? "success" : "neutral"}
                  />
                  {row.expiresAt ? (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {labels.busySlotExpiresAt}: {normalizeDate(row.expiresAt)}
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-xs leading-4 text-slate-500 dark:text-slate-400">
                  {editable ? labels.manualBusyStatus : lockDescription}
                </p>
                {row.note ? (
                  <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {row.note}
                  </p>
                ) : null}
                {orderPublicId ? (
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(orderPublicId)}`}
                    aria-label={`${labels.openOrder}: ${orderPublicId}`}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold !text-artistbor-secondary transition hover:border-amber-300 hover:bg-amber-50 hover:!text-artistbor-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 dark:border-white/10 dark:bg-white/[0.04] dark:!text-slate-200 dark:hover:border-amber-400/35 dark:hover:bg-amber-400/10 dark:hover:!text-amber-300"
                  >
                    {labels.openOrder}
                    <span className="font-black">{orderPublicId}</span>
                    <ExternalLink className="size-3.5" />
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <ScheduleEmptyState labels={labels} />
      )}
    </section>
  );
}

function ScheduleCalendarPreview({
  labels,
  locale,
  onAddDate,
  rows,
  schedule,
}: {
  labels: ArtistsLabels;
  locale: Locale;
  onAddDate: (date: string) => void;
  rows: AvailabilityRow[];
  schedule: UnknownRecord;
}) {
  const start = parseDateOnly(schedule.date_from);
  const rangeEnd = parseDateOnly(schedule.date_to) ?? start;
  const [visibleMonth, setVisibleMonth] = useState(() => startOfCalendarMonth(start ?? new Date()));
  const busyRowsByDate = new Map<string, AvailabilityRow[]>();

  rows
    .filter((row) => row.tone !== "success")
    .forEach((row) => {
      const key = normalizeDateInput(row.date) || row.date;
      const current = busyRowsByDate.get(key) ?? [];
      current.push(row);
      busyRowsByDate.set(key, current);
    });

  if (!start || !rangeEnd) {
    return (
      <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
        <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.calendarPreview}</h3>
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">—</p>
      </section>
    );
  }

  const days = calendarDaysForMonth(visibleMonth);
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const canGoPrevious = endOfCalendarMonth(previousMonth) >= start;
  const canGoNext = startOfCalendarMonth(nextMonth) <= rangeEnd;

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.calendarPreview}</h3>
          <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">{labels.calendarHint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={!canGoPrevious}
            onClick={() => setVisibleMonth(previousMonth)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label={labels.previousMonth}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setVisibleMonth(nextMonth)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label={labels.nextMonth}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
        {formatArtistAvailabilityMonth(visibleMonth, locale)}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400">
        {labels.weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = dateKey(day);
          const inRange = day >= start && day <= rangeEnd;
          const busyRows = busyRowsByDate.get(key) ?? [];
          const hasBusy = busyRows.length > 0;
          const hasManualBusy = busyRows.some((row) => isEditableArtistAvailabilitySource(row.source));
          const hasLockedBusy = busyRows.some((row) => !isEditableArtistAvailabilitySource(row.source));
          const inVisibleMonth = day.getMonth() === visibleMonth.getMonth();
          const actionLabel = !inRange
            ? labels.outsideSchedule
            : hasLockedBusy
              ? `${labels.lockedBusyStatus}. ${labels.busyDateAction}`
              : hasManualBusy
                ? `${labels.manualBusyStatus}. ${labels.busyDateAction}`
                : labels.availableDayAction;

          return (
            <button
              key={key}
              type="button"
              disabled={!inRange}
              title={actionLabel}
              aria-label={`${formatHumanDate(key, locale)}. ${actionLabel}`}
              onClick={() => {
                if (!inRange) return;
                onAddDate(key);
              }}
              className={cn(
                "group relative grid min-h-12 place-items-center rounded-xl border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
                !inVisibleMonth && "text-slate-300 dark:text-slate-600",
                inVisibleMonth && "text-slate-700 dark:text-slate-200",
                inRange && "cursor-pointer border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/70 hover:text-amber-800 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-amber-400/35 dark:hover:bg-amber-400/10 dark:hover:text-amber-300",
                !inRange && "cursor-not-allowed border-transparent bg-transparent opacity-45",
                hasManualBusy && !hasLockedBusy && "border-amber-300 text-amber-800 dark:border-amber-400/35 dark:text-amber-300",
                hasLockedBusy && "border-rose-300 text-rose-700 dark:border-rose-400/30 dark:text-rose-300",
              )}
            >
              <span>{day.getDate()}</span>
              {inRange && !hasBusy ? (
                <span className="absolute bottom-1 left-1 size-1 rounded-full bg-emerald-500" aria-hidden="true" />
              ) : null}
              {hasBusy ? (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1 flex items-center gap-0.5 text-[9px] font-bold",
                    hasLockedBusy ? "text-rose-500 dark:text-rose-300" : "text-amber-600 dark:text-amber-300",
                  )}
                  aria-hidden="true"
                >
                  <Clock className="size-2.5" />
                  {busyRows.length}
                </span>
              ) : null}
              {inRange ? (
                <Plus className="absolute bottom-1 right-1 size-3 opacity-55 transition group-hover:opacity-100" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 text-xs font-medium text-slate-600 dark:border-white/10 dark:text-slate-300 sm:grid-cols-3">
        <CalendarLegendItem className="bg-emerald-500" label={labels.availableDayAction} />
        <CalendarLegendItem className="bg-amber-500" label={labels.busyDateAction} />
        <CalendarLegendItem className="bg-rose-500" label={labels.lockedBusyStatus} />
      </div>
    </section>
  );
}

function CalendarLegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-start gap-2 leading-4">
      <span className={cn("mt-1 size-2 shrink-0 rounded-full", className)} aria-hidden="true" />
      {label}
    </span>
  );
}

function ScheduleEmptyState({ labels }: { labels: ArtistsLabels }) {
  return (
    <div className="mt-4 flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E5EAF2] bg-slate-50/70 p-5 text-center dark:border-white/10 dark:bg-white/[0.025]">
      <ListChecks className="size-8 text-amber-400" />
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{labels.noAvailabilityData}</p>
        <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">{labels.calendarHint}</p>
      </div>
    </div>
  );
}

function ProfileData({
  entries,
  labels,
}: {
  entries: readonly (readonly [string, unknown])[];
  labels: ArtistsLabels;
}) {
  if (!entries.length) return <EmptyState title={labels.emptyArtistDetails} />;

  return (
    <div className={cn("grid gap-2", entries.length > 1 && "md:grid-cols-2")}>
      {entries.map(([key, value]) => (
        <DetailValue key={key} fieldKey={key} value={value} />
      ))}
    </div>
  );
}

const displayedArtistFields = new Set([
  "id",
  "user_id",
  "first_name",
  "last_name",
  "full_name",
  "public_id",
  "stage_name",
  "stage_name",
  "phone",
  "extra_phone",
  "email",
  "badges",
  "language",
  "timezone",
  "created_at",
  "avatar_url",
  "profile_photo_id",
  "profile_photo_url",
  "status",
  "status_label",
  "role",
  "role_label",
  "region_id",
  "district_id",
  "region",
  "district",
  "profile",
  "artistProfile",
  "artist_profile",
  "categories",
  "category",
  "category_id",
  "category_ids",
  "is_top",
  "is_verified",
  "bio",
  "short_description",
  "experience_years",
  "titles",
  "achievements",
  "rating",
  "fans_count",
  "albums_count",
  "administrator_name",
  "administrator_phone",
  "birth_date",
  "gender",
  "card_number",
  "card_number_masked",
  "card_holder_name",
  "balance",
  "debt",
  "profile_gaps",
  "profileGaps",
  "quota",
]);

const nestedDisplayedArtistFields = new Set([
  "id",
  "user_id",
  "artist_id",
  "first_name",
  "last_name",
  "full_name",
  "public_id",
  "stage_name",
  "phone",
  "extra_phone",
  "email",
  "language",
  "timezone",
  "created_at",
  "avatar_url",
  "profile_photo_id",
  "profile_photo_url",
  "status",
  "status_label",
  "role",
  "role_label",
  "region_id",
  "district_id",
  "region",
  "district",
  "profile",
  "artistProfile",
  "artist_profile",
  "categories",
  "category",
  "category_id",
  "category_ids",
  "is_top",
  "is_verified",
  "bio",
  "short_description",
  "experience_years",
  "titles",
  "achievements",
  "rating",
  "fans_count",
  "albums_count",
  "administrator_name",
  "administrator_phone",
  "birth_date",
  "gender",
  "card_number",
  "card_number_masked",
  "card_holder_name",
  "balance",
  "debt",
  "profile_gaps",
  "profileGaps",
  "quota",
]);

function additionalArtistEntries(artist: ArtistProfile) {
  return Object.entries(artist)
    .filter(([key, value]) => hasMeaningfulValue(value) && !displayedArtistFields.has(key))
    .map(([key, value]) => [key, cleanAdditionalArtistValue(value)] as const)
    .filter(([, value]) => hasMeaningfulValue(value) && !isEmptyAdditionalObject(value));
}

function cleanAdditionalArtistValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => (isRecord(item) ? cleanAdditionalArtistRecord(item) : item))
      .filter((item) => hasMeaningfulValue(item) && !isEmptyAdditionalObject(item));
    return cleaned.length ? cleaned : undefined;
  }

  if (isRecord(value)) {
    return cleanAdditionalArtistRecord(value);
  }

  return value;
}

function cleanAdditionalArtistRecord(record: UnknownRecord) {
  const cleaned = Object.fromEntries(
    Object.entries(record)
      .filter(([key, value]) => hasMeaningfulValue(value) && !nestedDisplayedArtistFields.has(key))
      .map(([key, value]) => [key, cleanAdditionalArtistValue(value)] as const)
      .filter(([, value]) => hasMeaningfulValue(value) && !isEmptyAdditionalObject(value)),
  ) as UnknownRecord;

  return isEmptyAdditionalObject(cleaned) ? undefined : cleaned;
}

function isEmptyAdditionalObject(value: unknown) {
  return isRecord(value) && Object.keys(value).length === 0;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (isRecord(value)) return Object.values(value).some(hasMeaningfulValue);
  return true;
}

function getArtistServiceTitle(service: UnknownRecord, labels: ArtistsLabels) {
  const nestedService = firstRecordValue(service, ["service", "service_data", "service_info"]);
  const source = nestedService ?? service;
  const name = firstMeaningfulValue(source, [
    "name_uz",
    "name_ru",
    "name_en",
    "name",
    "title_uz",
    "title_ru",
    "title_en",
    "title",
    "slug",
  ]);

  if (name) return String(name);

  const serviceId = firstMeaningfulValue(service, ["service_id", "id"]);
  return serviceId ? `${labels.services} #${toDisplay(serviceId)}` : labels.services;
}

function getArtistServiceDescription(service: UnknownRecord) {
  const nestedService = firstRecordValue(service, ["service", "service_data", "service_info"]);
  const source = nestedService ?? service;
  const description = firstMeaningfulValue(source, [
    "description_uz",
    "description_ru",
    "description_en",
    "description",
    "comment",
  ]);

  return description ? String(description) : "";
}

function getArtistServiceChips(service: UnknownRecord, labels: ArtistsLabels) {
  const chips: string[] = [];
  const price = firstMeaningfulValue(service, ["price", "amount"]);
  const duration = firstMeaningfulValue(service, ["duration_minutes", "duration"]);
  const priceText = formatMoneyWithCurrency(price, labels.locale, currencyFromRecord(service));

  if (priceText) chips.push(`${labels.price}: ${priceText}`);
  if (duration) chips.push(`${labels.duration}: ${toDisplay(duration)} ${labels.minutesShort}`);

  return chips;
}

function getArtistServiceRecordId(service: UnknownRecord) {
  const id = firstMeaningfulValue(service, ["id", "artist_service_id"]);
  const numberId = Number(id);
  return Number.isFinite(numberId) && numberId > 0 ? numberId : undefined;
}

function getAttachedServiceId(service: UnknownRecord) {
  const nestedService = firstRecordValue(service, ["service", "service_data", "service_info"]);
  const id = firstMeaningfulValue(nestedService ?? service, ["service_id", "id"]);
  const numberId = Number(id);
  return Number.isFinite(numberId) && numberId > 0 ? numberId : undefined;
}

function regionPriceRowsFromService(service: UnknownRecord): RegionPriceRow[] {
  const value = service.region_prices ?? service.regionPrices;
  if (!Array.isArray(value)) return [];
  return regionPriceRowsFromRecords(value.filter(isRecord) as ArtistRegionPriceRecord[]);
}

function regionPriceRowsFromRecords(records: ArtistRegionPriceRecord[]): RegionPriceRow[] {
  return records.map((record, index) => {
    const id = numberFromUnknown(record.id);
    const regionId = numberFromUnknown(record.region_id);
    const price = record.price === undefined || record.price === null ? "" : String(record.price);
    return {
      advance_amount: record.advance_amount === undefined || record.advance_amount === null ? "" : String(record.advance_amount),
      advance_effective: record.advance_effective === undefined || record.advance_effective === null ? undefined : String(record.advance_effective),
      currency: typeof record.currency === "string" && record.currency.trim() ? record.currency : "UZS",
      id,
      is_advance_custom: record.is_advance_custom,
      localId: id ? `saved-${id}` : `loaded-${index}-${regionId ?? "unknown"}`,
      price,
      region_id: regionId ? String(regionId) : "",
      region_name: typeof record.region_name === "string" ? record.region_name : undefined,
    };
  });
}

function regionPriceOptions(regions: Region[], row: RegionPriceRow, labels: ArtistsLabels): FormFieldOption[] {
  const options = regionOptions(regions, labels);
  if (row.region_id && !options.some((option) => String(option.value) === row.region_id)) {
    options.push({
      label: row.region_name || `${labels.region} #${row.region_id}`,
      value: row.region_id,
    });
  }
  return options;
}

function numberFromUnknown(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function firstMeaningfulValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (hasMeaningfulValue(value) && !isRecord(value) && !Array.isArray(value)) return value;
  }
  return undefined;
}

function firstRecordValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }
  return undefined;
}

function galleryItemFromRecord(record: UnknownRecord, index: number, labels: ArtistsLabels): GalleryItemView {
  const fileRecord = firstRecordValue(record, ["file", "image", "photo", "media", "attachment"]);
  const source = fileRecord ? { ...fileRecord, ...record } : record;
  const imageSource = firstStringValue(source, [
    "url",
    "file_url",
    "full_url",
    "path",
    "image_url",
    "photo_url",
    "thumbnail_url",
    "preview_url",
    "src",
  ]);
  const imageUrlCandidates = mediaUrlCandidates(imageSource);
  const imageUrl = imageUrlCandidates[0] ?? "";
  const linkSource = firstStringValue(source, ["original_url", "download_url", "url", "file_url", "full_url"]) || imageSource;
  const linkUrl = mediaUrlCandidates(linkSource)[0] ?? imageUrl;
  const title =
    firstStringValue(source, ["title", "title_uz", "name", "caption", "alt", "file_name", "filename"]) ||
    `${labels.galleryItem}`;
  const subtitle = [
    firstStringValue(source, ["type", "mime_type", "category"]),
    firstStringValue(source, ["description", "comment"]),
  ].filter(Boolean).join(" · ");

  return {
    key: String(resourceRowKey(record, index)),
    id: numberFromUnknown(record.id),
    imageUrl,
    imageUrlCandidates,
    linkUrl,
    title,
    subtitle,
    status: firstMeaningfulValue(record, ["status", "is_active", "active"]),
    createdAt: firstMeaningfulValue(record, ["created_at", "uploaded_at", "createdAt"]),
  };
}

function videoItemFromRecord(record: UnknownRecord, index: number, labels: ArtistsLabels): VideoItemView {
  const videoRecord = firstRecordValue(record, ["video", "media", "file", "attachment"]);
  const source = videoRecord ? { ...videoRecord, ...record } : record;
  const videoSource = firstStringValue(source, [
    "youtube_url",
    "video_url",
    "embed_url",
    "url",
    "file_url",
    "full_url",
    "path",
  ]);
  const thumbnailSource =
    firstStringValue(source, ["thumbnail_url", "thumbnail", "preview_url", "image_url", "poster_url", "cover_url"]) ||
    youtubeThumbnailUrl(videoSource);
  const title =
    firstStringValue(source, ["title", "title_uz", "title_ru", "name", "caption"]) ||
    `${labels.videoItem}`;
  const subtitle = [
    videoSource ? videoSourceLabel(videoSource) : "",
    firstStringValue(source, ["type", "source", "platform"]),
  ].filter(Boolean).join(" · ");

  return {
    key: String(resourceRowKey(record, index)),
    title,
    subtitle,
    thumbnailUrlCandidates: mediaUrlCandidates(thumbnailSource),
    videoUrl: videoUrlCandidates(videoSource)[0] ?? "",
    status: firstMeaningfulValue(source, ["status", "is_active", "active"]),
    createdAt: firstMeaningfulValue(source, ["created_at", "published_at", "createdAt"]),
    duration: firstMeaningfulValue(source, ["duration", "duration_seconds", "duration_minutes"]),
    sortOrder: firstMeaningfulValue(source, ["sort_order", "position", "order"]),
  };
}

function commentItemFromRecord(record: UnknownRecord, index: number, labels: ArtistsLabels): CommentItemView {
  const client = firstRecordValue(record, ["client", "user", "author", "customer"]);
  const source = client ? { ...client, ...record } : record;
  const text = firstStringValue(source, ["comment", "message", "text", "body", "content", "description"]);
  const clientName =
    firstStringValue(source, ["client_name", "author_name", "user_name", "full_name", "name", "phone"]) ||
    (hasMeaningfulValue(record.client_id) ? `${labels.client} #${toDisplay(record.client_id)}` : "");

  return {
    key: String(resourceRowKey(record, index)),
    id: numericId(firstMeaningfulValue(record, ["id", "comment_id"])),
    clientName,
    createdAt: firstMeaningfulValue(record, ["created_at", "createdAt", "date"]),
    publication: commentPublicationStatus(record, labels),
    rating: firstMeaningfulValue(record, ["rating", "score", "stars"]),
    raw: record,
    text,
  };
}

function commentPublicationStatus(record: UnknownRecord, labels: ArtistsLabels): CommentItemView["publication"] {
  const explicit = firstMeaningfulValue(record, ["is_published", "published", "is_visible", "visible"]);
  const status = firstMeaningfulValue(record, ["status", "status_label"]);
  const value = explicit ?? status;
  const normalized = normalizeEnumToken(String(value ?? ""));

  if (normalized === "true" || normalized === "1" || normalized === "published" || normalized === "active") {
    return { label: labels.publishedStatus, tone: "success", value: "published" };
  }

  if (normalized === "false" || normalized === "0" || normalized === "pending") {
    return { label: labels.pendingStatus, tone: "warning", value: "pending" };
  }

  if (normalized.includes("delete")) {
    return { label: labels.deletedStatus, tone: "danger", value: "deleted" };
  }

  if (normalized.includes("unpublish") || normalized.includes("hidden") || normalized.includes("inactive")) {
    return { label: labels.unpublishedStatus, tone: "neutral", value: "unpublished" };
  }

  return { label: labels.unknownType, tone: "neutral", value: "unknown" };
}

function ratingItemFromRecord(record: UnknownRecord, index: number, labels: ArtistsLabels): RatingItemView {
  const client = firstRecordValue(record, ["client", "user", "author", "customer"]);
  const source = client ? { ...client, ...record } : record;
  const ratingValue = numericValue(firstMeaningfulValue(source, ["rating", "score", "stars", "value"]));
  const clientName =
    firstStringValue(source, ["client_name", "author_name", "user_name", "full_name", "name", "phone"]) ||
    (hasMeaningfulValue(record.client_id) ? `${labels.client} #${toDisplay(record.client_id)}` : "");

  return {
    key: String(resourceRowKey(record, index)),
    id: numericId(firstMeaningfulValue(record, ["id", "rating_id"])),
    clientName,
    createdAt: firstMeaningfulValue(record, ["created_at", "createdAt", "date"]),
    publication: commentPublicationStatus(record, labels),
    rating: ratingValue,
    text: firstStringValue(source, ["comment", "message", "text", "review", "description"]),
  };
}

function ratingSummary(items: RatingItemView[]) {
  const values = items
    .map((item) => item.rating)
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  return {
    averageText: values.length ? average.toFixed(average % 1 === 0 ? 0 : 1) : "—",
    publishedCount: items.filter((item) => item.publication.value === "published").length,
  };
}

function initialCommentEditValues(item: CommentItemView | null): CommentEditValues {
  return {
    comment: item?.text ?? "",
    is_published: item?.publication.value === "published" ? "1" : item ? "0" : "",
  };
}

function firstStringValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function mediaUrlCandidates(value: string) {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (/^https?:\/\//i.test(trimmed)) return [trimmed];
  if (trimmed.startsWith("//")) return [`https:${trimmed}`];

  const normalized = trimmed.replace(/^\/+/, "");
  const origin = apiOrigin();
  const candidates = new Set<string>();

  candidates.add(`${origin}/${normalized}`);

  if (!normalized.includes("/")) {
    candidates.add(`${origin}/uploads/admin/image/${normalized}`);
    candidates.add(`${origin}/uploads/client/image/${normalized}`);
    candidates.add(`${origin}/uploads/image/${normalized}`);
  }

  return [...candidates];
}

function videoUrlCandidates(value: string) {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (/^https?:\/\//i.test(trimmed)) return [trimmed];
  if (trimmed.startsWith("//")) return [`https:${trimmed}`];

  const normalized = trimmed.replace(/^\/+/, "");
  const origin = apiOrigin();
  const candidates = new Set<string>();

  candidates.add(`${origin}/${normalized}`);

  if (!normalized.includes("/")) {
    candidates.add(`${origin}/uploads/admin/video/${normalized}`);
    candidates.add(`${origin}/uploads/client/video/${normalized}`);
    candidates.add(`${origin}/uploads/video/${normalized}`);
  }

  return [...candidates];
}

function youtubeThumbnailUrl(value: string) {
  const id = youtubeVideoId(value);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function youtubeVideoId(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    if (url.hostname.includes("youtube.com")) {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return fromQuery;
      const embedMatch = url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/);
      if (embedMatch?.[1]) return embedMatch[1];
    }
  } catch {
    return "";
  }
  return "";
}

function videoSourceLabel(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtube")) return "YouTube";
    if (url.hostname.includes("youtu.be")) return "YouTube";
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function apiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/+$/, "");
  }
}

function initialBusySlotValues(state: BusySlotDialogState): BusySlotFormValues {
  if (state?.mode === "edit") {
    return {
      date: normalizeDateInput(state.row.date),
      start_time: state.row.startTime,
      end_time: state.row.endTime,
      note: state.row.note,
    };
  }

  return {
    date: normalizeDateInput(state?.date) || formatDateInputValue(new Date()),
    start_time: "09:00",
    end_time: "12:00",
    note: "",
  };
}

function busySlotDialogKey(state: BusySlotDialogState) {
  if (!state) return "closed";
  if (state.mode === "edit") return `edit-${getAvailabilityRowId(state.row) ?? state.row.date}-${state.row.startTime}-${state.row.endTime}`;
  return `create-${state.date ?? "default"}`;
}

function validateBusySlotForm(values: BusySlotFormValues, labels: ArtistsLabels) {
  if (!values.date) return labels.requiredField(labels.date);
  if (!values.start_time) return labels.requiredField(labels.startTime);
  if (!values.end_time) return labels.requiredField(labels.endTime);
  if (values.end_time <= values.start_time) return labels.timeRangeInvalid;
  return "";
}

function formatBusySlotDuration(startTime: string, endTime: string) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return "";

  const totalMinutes = endMinutes - startMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} soat`);
  if (minutes > 0) parts.push(`${minutes} daqiqa`);
  return parts.join(" ") || "";
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getAvailabilityRowId(row: AvailabilityRow) {
  return row.id ?? numericId(firstMeaningfulValue(row.raw, ["id", "busy_slot_id", "slot_id"]));
}

function numericId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const id = Number(value);
    if (Number.isFinite(id)) return id;
  }
  return undefined;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function getDefaultScheduleRecord(artist: ArtistProfile): UnknownRecord {
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 30);

  return {
    artist_id: getArtistId(artist),
    date_from: formatDateInputValue(from),
    date_to: formatDateInputValue(to),
    availability: [],
  };
}

type AvailabilityRow = {
  date: string;
  endTime: string;
  id?: number;
  source: string;
  sourceLabel: string;
  expiresAt?: number;
  note: string;
  startTime: string;
  time: string;
  statusLabel: string;
  tone: "danger" | "neutral" | "success" | "warning";
  raw: UnknownRecord;
};

function scheduleRecordsFromState(state: DetailResourceState, artist: ArtistProfile) {
  const rawSchedule = isRecord(state.raw) && isScheduleRecord(state.raw) ? state.raw : null;
  if (state.rows.length) {
    if (state.rows.every(isScheduleRecord)) return state.rows;
    return [{
      ...(rawSchedule ?? {}),
      artist_id: firstMeaningfulValue(rawSchedule ?? {}, ["artist_id"]) ?? getArtistId(artist),
      availability: state.rows,
    }];
  }

  if (rawSchedule) return [rawSchedule];

  if (isRecord(state.raw)) {
    const direct = firstResourceArray(state.raw);
    if (direct.length) return [{ artist_id: getArtistId(artist), availability: direct }];
  }

  return [];
}

function isScheduleRecord(record: UnknownRecord) {
  return ["date_from", "date_to", "availability", "busy_slots", "available_slots", "free_slots"].some((key) => key in record);
}

function firstResourceArray(record: UnknownRecord) {
  const value = Object.entries(record).find(([key, item]) => !isMetaKey(key) && Array.isArray(item))?.[1];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function availabilityRowsFromSchedule(schedule: UnknownRecord, labels: ArtistsLabels): AvailabilityRow[] {
  const availability = schedule.availability ?? schedule.busy_slots ?? schedule.available_slots ?? schedule.free_slots;

  if (Array.isArray(availability)) {
    return availability.flatMap((item) =>
      isRecord(item) && isVisibleArtistAvailabilityRecord(item)
        ? [availabilityRowFromRecord(item, labels)]
        : [],
    );
  }

  if (isRecord(availability)) {
    if (looksLikeAvailabilityRow(availability)) {
      return isVisibleArtistAvailabilityRecord(availability)
        ? [availabilityRowFromRecord(availability, labels)]
        : [];
    }

    return Object.entries(availability).flatMap(([group, value]) => {
      if (Array.isArray(value)) {
        return value.flatMap((item) =>
          isRecord(item) && isVisibleArtistAvailabilityRecord(item)
            ? [availabilityRowFromRecord({ ...item, group }, labels)]
            : [],
        );
      }
      if (isRecord(value) && isVisibleArtistAvailabilityRecord(value)) {
        return [availabilityRowFromRecord({ ...value, group }, labels)];
      }
      return [];
    });
  }

  return [];
}

function availabilityRowFromRecord(record: UnknownRecord, labels: ArtistsLabels): AvailabilityRow {
  const id = numericId(firstMeaningfulValue(record, ["id", "busy_slot_id", "slot_id"]));
  const date = firstMeaningfulValue(record, ["date", "day", "date_from", "start_date", "available_date"]);
  const group = firstMeaningfulValue(record, ["group"]);
  const start = firstMeaningfulValue(record, ["start_time", "time_from", "from"]);
  const end = firstMeaningfulValue(record, ["end_time", "time_to", "to"]);
  const note = firstMeaningfulValue(record, ["note", "reason", "comment", "notes", "description"]);
  const source = String(firstMeaningfulValue(record, ["source"]) ?? "manual").trim().toLowerCase();
  const localizedSource = getDashboardStatus("availability_source", source, labels.locale);
  const sourceLabel = localizedSource.key === "unknown"
    ? String(firstMeaningfulValue(record, ["source_label"]) ?? source)
    : localizedSource.label;
  const expiresAt = numberFromUnknown(firstMeaningfulValue(record, ["expires_at"]));
  const status = availabilityStatus(record, labels);
  const startTime = start ? String(start) : "";
  const endTime = end ? String(end) : "";

  return {
    id,
    date: String(date ?? group ?? "—"),
    endTime,
    note: note ? String(note) : "",
    source,
    sourceLabel,
    expiresAt,
    startTime,
    time: start || end ? `${toDisplay(start)} — ${toDisplay(end)}` : "—",
    statusLabel: status.label,
    tone: status.tone,
    raw: record,
  };
}

function looksLikeAvailabilityRow(record: UnknownRecord) {
  return ["date", "day", "start_time", "end_time", "time_from", "time_to", "status", "is_available"].some((key) => key in record);
}

function availabilityStatus(record: UnknownRecord, labels: ArtistsLabels) {
  const value = firstMeaningfulValue(record, ["status", "is_available", "available", "busy"]);
  const normalized = String(value ?? "").toLowerCase();
  const hasBusySlotShape = ["start_time", "end_time", "time_from", "time_to", "from", "to"].some((key) =>
    hasMeaningfulValue(record[key]),
  );
  const unavailable = hasMeaningfulValue(value)
    ? normalized.includes("busy") || normalized.includes("false") || normalized === "0"
    : hasBusySlotShape;

  return unavailable
    ? { label: labels.busyStatus, tone: "warning" as const }
    : { label: labels.availableStatus, tone: "success" as const };
}

function getRawAvailabilityPreview(schedule: UnknownRecord, labels: ArtistsLabels) {
  const availability = schedule.availability;
  if (!hasMeaningfulValue(availability)) return "";
  if (availabilityRowsFromSchedule(schedule, labels).length) return "";
  return JSON.stringify(availability, null, 2);
}

function formatScheduleRange(schedule: UnknownRecord, locale: Locale) {
  const from = formatHumanDate(schedule.date_from, locale);
  const to = formatHumanDate(schedule.date_to, locale);
  if (from !== "—" && to !== "—") return `${from} — ${to}`;
  return from !== "—" ? from : to;
}

function formatHumanDate(value: unknown, locale: Locale) {
  const date = parseDateOnly(value);
  if (!date) return "—";
  const months = locale === "ru"
    ? ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]
    : ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function calendarMonthRange(date: Date) {
  return {
    date_from: dateKey(startOfCalendarMonth(date)),
    date_to: dateKey(endOfCalendarMonth(date)),
  };
}

function calendarMonthNames(locale: Locale) {
  return locale === "ru"
    ? [
        "январь",
        "февраль",
        "март",
        "апрель",
        "май",
        "июнь",
        "июль",
        "август",
        "сентябрь",
        "октябрь",
        "ноябрь",
        "декабрь",
      ]
    : [
        "yanvar",
        "fevral",
        "mart",
        "aprel",
        "may",
        "iyun",
        "iyul",
        "avgust",
        "sentabr",
        "oktabr",
        "noyabr",
        "dekabr",
      ];
}

function calendarYearOptions(schedule: UnknownRecord, visibleMonth: Date) {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 5; year <= currentYear + 5; year += 1) years.add(year);
  for (const key of ["date_from", "date_to"]) {
    const value = parseDateOnly(schedule[key]);
    if (value) years.add(value.getFullYear());
  }
  years.add(visibleMonth.getFullYear());
  return Array.from(years).sort((a, b) => a - b);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateInputValue(date: Date) {
  return dateKey(date);
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const date = parseDateOnly(value);
  return date ? dateKey(date) : "";
}

function calendarDaysForMonth(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function countTotalDays(schedule: UnknownRecord) {
  const start = parseDateOnly(schedule.date_from);
  const end = parseDateOnly(schedule.date_to);
  if (!start || !end) return 0;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function countBusyDays(rows: AvailabilityRow[]) {
  return new Set(rows.filter((row) => row.tone !== "success").map((row) => row.date)).size;
}

function ResourcePanel({
  title,
  state,
}: {
  title: string;
  state: DetailResourceState;
}) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);

  if (state.loading) return <LoadingState label={labels.loadingTitle(title)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const rawRecord =
    !state.rows.length && isRecord(state.raw) && !hasResourceArray(state.raw)
      ? state.raw
      : null;

  if (!rows.length && !rawRecord) return <EmptyState title={labels.notFoundTitle(title)} />;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-white/10 dark:bg-slate-950">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{title}</p>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            {rows.length ? labels.recordCount(rows.length) : labels.oneObject}
          </p>
        </div>
        {state.meta ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {labels.page} {state.meta.currentPage ?? state.meta.page ?? 1} /{" "}
            {state.meta.pageCount ?? "—"}
          </p>
        ) : null}
      </div>
      {rows.length ? <ResourceCards rows={rows} /> : <ObjectDetails record={rawRecord ?? {}} />}
    </div>
  );
}

function TabStateBadge({ state }: { state: DetailResourceState }) {
  const count = state.rows.length || rowsFromRawResource(state.raw).length;

  if (state.loading) {
    return (
      <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-current/10">
        <span className="size-2 animate-pulse rounded-full bg-current" />
      </span>
    );
  }

  if (state.error) {
    return (
      <span className="ml-2 inline-flex h-5 items-center rounded-full bg-rose-100 px-1.5 text-[10px] font-bold leading-none text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        !
      </span>
    );
  }

  if (state.loaded === false) return null;

  return (
    <span className="ml-2 inline-flex h-5 items-center rounded-full bg-current/10 px-1.5 text-[10px] font-bold leading-none">
      {count}
    </span>
  );
}

function ResourceCards({ rows }: { rows: UnknownRecord[] }) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <div
          key={String(resourceRowKey(row, index))}
          className="rounded-xl border border-slate-100 bg-white p-3 dark:border-white/10 dark:bg-slate-950"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              {labels.recordNumber(index + 1)}
            </p>
            {typeof row.public_id === "string" && row.public_id ? (
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300">
                Public ID {row.public_id}
              </span>
            ) : null}
          </div>
          <ObjectDetails record={row} />
        </div>
      ))}
    </div>
  );
}

function DetailValue({
  fieldKey,
  value,
}: {
  fieldKey: string;
  value: unknown;
}) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);

  return (
    <div className="min-w-0 bg-slate-50 p-3 dark:bg-[#121a2a]">
      <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {humanizeKey(fieldKey, labels)}
      </p>
      <div className="mt-1 break-words text-sm font-semibold leading-5 text-slate-950 dark:text-white">
        <ValueBlock fieldKey={fieldKey} value={value} />
      </div>
    </div>
  );
}

function ValueBlock({
  fieldKey,
  value,
}: {
  fieldKey: string;
  value: unknown;
}) {
  if (Array.isArray(value)) {
    if (!value.length) return <span>—</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg bg-slate-50 dark:bg-white/[0.04]"
          >
            {isRecord(item) ? <ObjectDetails record={item} /> : <PrimitiveValue fieldKey={fieldKey} value={item} />}
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    return <ObjectDetails record={value} />;
  }

  return <PrimitiveValue fieldKey={fieldKey} value={value} />;
}

function ObjectDetails({ record }: { record: UnknownRecord }) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);
  const isArtistProfileFinance = isArtistProfileFinanceRecord(record);
  const entries = Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .sort(([leftKey], [rightKey]) => objectDetailSortWeight(leftKey, isArtistProfileFinance) - objectDetailSortWeight(rightKey, isArtistProfileFinance));

  if (!entries.length) return <span>—</span>;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className={cn(
            "min-w-0 bg-slate-50 p-3 dark:bg-[#121a2a]",
            isArtistProfileFinance && (key === "balance" || key === "debt") && "sm:col-span-2",
          )}
        >
          <span className="block text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-slate-500 dark:text-slate-400">
            {humanizeKey(key, labels)}
          </span>
          <div className="mt-1 break-words text-sm font-semibold leading-5 text-slate-950 dark:text-white">
            {Array.isArray(value) || isRecord(value) ? (
              <ValueBlock fieldKey={key} value={value} />
            ) : (
              <PrimitiveValue fieldKey={key} value={value} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function isArtistProfileFinanceRecord(record: UnknownRecord) {
  return ("card_number" in record || "card_number_masked" in record) && "balance" in record && "debt" in record;
}

function objectDetailSortWeight(key: string, isArtistProfileFinance: boolean) {
  if (!isArtistProfileFinance) return 100;
  if (key === "balance") return 10;
  if (key === "card_number" || key === "card_number_masked") return 20;
  if (key === "card_holder_name") return 30;
  if (key === "debt") return 40;
  return 100;
}

function PrimitiveValue({
  fieldKey,
  value,
}: {
  fieldKey: string;
  value: unknown;
}) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);

  if (isLocationIdKey(fieldKey)) {
    return (
      <span className="break-words">
        <LocationName
          fieldKey={fieldKey}
          value={value}
          fallback={formatDisplayValue(fieldKey, value, labels)}
        />
      </span>
    );
  }
  if (isStatusField(fieldKey)) return <LocalizedStatusBadge fieldKey={fieldKey} labels={labels} value={value} />;

  if (typeof value === "string" && value.startsWith("http")) {
    if (isMediaUrl(fieldKey, value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="block h-24 w-24 rounded-xl border border-slate-200 bg-cover bg-center dark:border-white/10"
          style={{ backgroundImage: `url(${value})` }}
          aria-label={value}
        />
      );
    }
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-amber-700 underline decoration-amber-300 underline-offset-4 dark:text-amber-300"
      >
        {value}
      </a>
    );
  }

  return <span className="break-words">{formatDisplayValue(fieldKey, value, labels)}</span>;
}

function createDetailResources(
  loading = false,
  error: string | null = null,
): Record<ResourceTab, DetailResourceState> {
  return resourceTabs.reduce(
    (resources, tab) => ({
      ...resources,
      [tab]: { loading, loaded: false, error, rows: [] },
    }),
    {} as Record<ResourceTab, DetailResourceState>,
  );
}

function createResourceRequestIds(): Record<ResourceTab, number> {
  return resourceTabs.reduce(
    (requestIds, tab) => ({ ...requestIds, [tab]: 0 }),
    {} as Record<ResourceTab, number>,
  );
}

function resourceRowKey(row: UnknownRecord, index: number) {
  const id = row.id ?? row.artist_id ?? row.service_id ?? row.file_id ?? row.video_id;
  return typeof id === "number" || typeof id === "string" ? id : index;
}

function rowsFromRawResource(raw: unknown): UnknownRecord[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];

  const direct = Object.entries(raw).find(
    ([key, value]) => !isMetaKey(key) && Array.isArray(value),
  )?.[1];

  if (Array.isArray(direct)) return direct.filter(isRecord);

  const entries = Object.entries(raw).filter(
    ([key, value]) => !isMetaKey(key) && value !== undefined && value !== null,
  );

  if (!entries.length) return [];

  return [Object.fromEntries(entries)];
}

function hasResourceArray(raw: UnknownRecord) {
  return Object.entries(raw).some(
    ([key, value]) => !isMetaKey(key) && Array.isArray(value),
  );
}

function isMetaKey(key: string) {
  return ["meta", "_meta", "pagination", "success", "message", "errors"].includes(key);
}

function humanizeKey(key: string, labels: ArtistsLabels) {
  return labels.fieldLabels[key] ?? key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();
}

function isStatusField(key: string) {
  return (
    key === "status" ||
    key.endsWith("_status") ||
    key.endsWith("_label") ||
    key.startsWith("is_") ||
    key === "role" ||
    key === "role_label"
  );
}

function isMediaUrl(key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  const normalizedValue = value.toLowerCase();
  return (
    normalizedKey.includes("avatar") ||
    normalizedKey.includes("image") ||
    normalizedKey.includes("photo") ||
    normalizedKey.includes("thumb") ||
    /\.(png|jpe?g|webp|gif)(\?.*)?$/.test(normalizedValue)
  );
}

function formatDisplayValue(key: string, value: unknown, labels = getArtistsLabels("uz")) {
  if (key.endsWith("_at") || key === "created_at" || key === "updated_at") {
    return normalizeDate(value);
  }
  if (isPhoneField(key)) return formatPhone(value) || toDisplay(value);
  if (typeof value === "boolean") return value ? labels.yes : labels.no;
  if (isStatusField(key)) return formatEnumValue(key, value, labels);
  return toDisplay(value);
}

function isPhoneField(key: string) {
  const normalized = key.toLowerCase();
  return normalized === "phone" || normalized.endsWith("_phone") || normalized.includes("phone_number");
}

function formatEnumValue(fieldKey: string, value: unknown, labels: ArtistsLabels) {
  if (value === null || value === undefined || value === "") return "—";
  const raw = String(value);
  const normalized = normalizeEnumToken(raw);
  const booleanLike =
    typeof value === "boolean" ||
    fieldKey.startsWith("is_") ||
    normalized === "true" ||
    normalized === "false";

  if (booleanLike) {
    if (fieldKey === "is_active" || fieldKey === "active") {
      if (normalized === "true" || normalized === "1") return labels.statusValueLabels.active;
      if (normalized === "false" || normalized === "0") return labels.statusValueLabels.inactive;
    }
    if (normalized === "true" || normalized === "1") return labels.yes;
    if (normalized === "false" || normalized === "0") return labels.no;
  }

  if (fieldKey === "status" || fieldKey === "status_label" || fieldKey.endsWith("_status")) {
    return getDashboardStatus(getDashboardStatusDomain(fieldKey), value, labels.locale).label;
  }

  return labels.statusValueLabels[normalized] ?? raw;
}

function normalizeEnumToken(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function toArtistStatusTone(tone: DashboardStatusTone): "danger" | "neutral" | "success" | "warning" {
  if (tone === "danger") return "danger";
  if (tone === "success") return "success";
  if (tone === "neutral") return "neutral";
  return "warning";
}

function isDeletedArtist(artist: ArtistProfile) {
  const status = String(artist.status_label ?? artist.status ?? "").toLowerCase();
  return status.includes("deleted") || status.includes("o'ch") || status === "0";
}

function getArtistId(artist: ArtistProfile) {
  return artist.user_id ?? artist.id;
}

function getArtistProfileId(artist: ArtistProfile) {
  const artistProfile = firstRecordValue(artist as UnknownRecord, ["artistProfile", "artist_profile"]);
  const id = artistProfile?.id;
  if (typeof id === "number") return id;
  if (typeof id === "string") {
    const numericId = Number(id);
    return Number.isFinite(numericId) ? numericId : undefined;
  }
  return undefined;
}

function getArtistName(artist: ArtistProfile, labels = getArtistsLabels("uz")) {
  const fromParts = [artist.first_name, artist.last_name].filter(Boolean).join(" ").trim();
  return artist.stage_name || artist.full_name || fromParts || artist.administrator_name || `${labels.artist} ${artist.public_id ?? "—"}`;
}

function getArtistInitials(artist: ArtistProfile, labels: ArtistsLabels) {
  const name = getArtistName(artist, labels);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return initials || "A";
}

function applyPhonePrefix(value: unknown, setValue: () => void) {
  if (typeof value === "string" && value.trim()) return;
  setValue();
}

function formatPhoneInput(value: unknown) {
  return formatPhone(value);
}

function buildArtistPayload(values: {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: string;
  region_id: string;
  district_id: string;
  gender: string;
  category_ids: string;
  bio: string;
  albums_count: string;
  rating: string;
  extra_phone: string;
  administrator_name: string;
  administrator_phone: string;
  card_number: string;
  card_holder_name: string;
  profile_photo_id: string;
  is_top: boolean;
}) {
  const payload: UpdateArtistPayload = {};
  assignUpdateString(payload, "first_name", values.first_name);
  assignUpdateString(payload, "last_name", values.last_name);
  assignUpdatePhone(payload, "phone", values.phone);
  assignUpdateString(payload, "email", values.email);
  assignUpdateNumber(payload, "status", values.status);
  assignUpdateNumber(payload, "region_id", values.region_id);
  assignUpdateNumber(payload, "district_id", values.district_id);
  const categoryIds = parseIdList(values.category_ids);
  if (categoryIds.length) payload.category_ids = categoryIds;
  if (values.gender === "male" || values.gender === "female" || values.gender === "other") {
    payload.gender = values.gender;
  }
  assignUpdateString(payload, "bio", values.bio);
  assignUpdateNumber(payload, "albums_count", values.albums_count);
  assignUpdateNumber(payload, "rating", values.rating);
  assignUpdatePhone(payload, "extra_phone", values.extra_phone);
  assignUpdateString(payload, "administrator_name", values.administrator_name);
  assignUpdatePhone(payload, "administrator_phone", values.administrator_phone);
  assignUpdateString(payload, "card_number", values.card_number);
  assignUpdateString(payload, "card_holder_name", values.card_holder_name);
  assignUpdateNumber(payload, "profile_photo_id", values.profile_photo_id);
  payload.is_top = Boolean(values.is_top);
  return payload;
}

function splitArtistUpdatePayload(payload: UpdateArtistPayload, artist: ArtistProfile) {
  const artistPayload: UpdateArtistPayload = { ...payload };
  const userFields: Array<keyof UpdateArtistPayload> = [
    "first_name",
    "last_name",
    "phone",
    "email",
    "status",
  ];
  const hasUserPayload = userFields.some((field) => (payload as Record<string, unknown>)[field] !== undefined);

  for (const field of userFields) {
    delete artistPayload[field];
  }

  if (!hasUserPayload) {
    return { artistPayload };
  }

  const userPayload: UpdateUserPayload = {
    first_name: String(payload.first_name ?? artist.first_name ?? getFirstNameFromArtist(artist) ?? "").trim(),
    phone: normalizePhoneForApi(payload.phone ?? artist.phone),
    status: Number(payload.status ?? artist.status ?? 10),
  };
  const lastName = String(payload.last_name ?? artist.last_name ?? getLastNameFromArtist(artist) ?? "").trim();
  const email = String(payload.email ?? artist.email ?? "").trim();

  userPayload.last_name = lastName;
  userPayload.email = email;

  return { userPayload, artistPayload };
}

function assignUpdateString(payload: UpdateArtistPayload, key: keyof UpdateArtistPayload, value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
  if (value !== null && value !== undefined) {
    (payload as Record<string, unknown>)[key] = normalized;
  }
}

function assignUpdatePhone(payload: UpdateArtistPayload, key: keyof UpdateArtistPayload, value: unknown) {
  const normalized = normalizePhoneForApi(value);
  if (value !== null && value !== undefined) {
    (payload as Record<string, unknown>)[key] = normalized;
  }
}

function assignUpdateNumber(payload: UpdateArtistPayload, key: keyof UpdateArtistPayload, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  const number = Number(value);
  if (Number.isFinite(number)) {
    (payload as Record<string, unknown>)[key] = number;
  }
}

function initialCreateArtistValues() {
  return {
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    status: "10",
    region_id: "",
    district_id: "",
    bio: "",
    birth_date: "",
    gender: "male",
    extra_phone: "",
    administrator_name: "",
    administrator_phone: "",
    card_number: "",
    card_holder_name: "",
    albums_count: "",
    fans_count: "",
    profile_photo_id: "",
    profile_photo_url: "",
	    is_verified: true,
	    is_top: false,
	    category_ids: "",
	    services: [] as ArtistServiceDraft[],
  };
}

const GENERATED_ARTIST_PASSWORD_LENGTH = 24;
const GENERATED_ARTIST_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*_-";

function generateArtistPassword() {
  const alphabetLength = GENERATED_ARTIST_PASSWORD_ALPHABET.length;
  const maximumUnbiasedByte = 256 - (256 % alphabetLength);
  let password = "";
  const bytes = new Uint8Array(GENERATED_ARTIST_PASSWORD_LENGTH * 2);

  while (password.length < GENERATED_ARTIST_PASSWORD_LENGTH) {
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= maximumUnbiasedByte) continue;
      password += GENERATED_ARTIST_PASSWORD_ALPHABET[byte % alphabetLength];
      if (password.length === GENERATED_ARTIST_PASSWORD_LENGTH) return password;
    }
  }

  return password;
}

function buildCreateArtistPayload(values: ReturnType<typeof initialCreateArtistValues>): CreateArtistPayload {
  const payload: CreateArtistPayload = {
    first_name: values.first_name.trim(),
    phone: normalizePhoneForApi(values.phone),
    password: generateArtistPassword(),
  };

  assignString(payload, "last_name", values.last_name);
  assignString(payload, "email", values.email);
  assignNumber(payload, "status", values.status);
  assignNumber(payload, "region_id", values.region_id);
  assignNumber(payload, "district_id", values.district_id);
  assignString(payload, "bio", values.bio);
  assignString(payload, "birth_date", values.birth_date);
  if (values.gender === "male" || values.gender === "female" || values.gender === "other") {
    payload.gender = values.gender;
  }
  assignPhone(payload, "extra_phone", values.extra_phone);
  assignString(payload, "administrator_name", values.administrator_name);
  assignPhone(payload, "administrator_phone", values.administrator_phone);
  assignString(payload, "card_number", values.card_number);
  assignString(payload, "card_holder_name", values.card_holder_name);
  assignNumber(payload, "albums_count", values.albums_count);
  assignNumber(payload, "fans_count", values.fans_count);
  assignNumber(payload, "profile_photo_id", values.profile_photo_id);
  assignBoolean(payload, "is_verified", values.is_verified);
  assignBoolean(payload, "is_top", values.is_top);

	  const categoryIds = parseIdList(values.category_ids);
	  if (categoryIds.length) payload.category_ids = categoryIds;

	  const services = buildCreateArtistServices(values.services);
	  if (services.length) payload.services = services;

  return payload;
}

function createArtistServiceDraft(): ArtistServiceDraft {
  return {
    localId: `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    service_id: "",
    price: "",
    advance_amount: "",
    currency: "UZS",
    note: "",
    status: "1",
    region_prices: [],
  };
}

function createRegionPriceRow(): RegionPriceRow {
  return {
    advance_amount: "",
    localId: `region-price-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    region_id: "",
    price: "",
    currency: "UZS",
    editing: true,
  };
}

function artistServiceFormValuesFromMode(mode: ArtistServiceFormMode): ArtistServiceFormValues {
  if (mode.type === "assign") {
    return {
      service_id: "",
      price: "",
      advance_amount: "",
      currency: "UZS",
      note: "",
      status: "1",
      region_prices: [],
    };
  }

  const attachedServiceId = getAttachedServiceId(mode.service);
  return {
    service_id: attachedServiceId ? String(attachedServiceId) : "",
    price: firstMeaningfulValue(mode.service, ["price", "amount"])?.toString() ?? "",
    advance_amount: firstMeaningfulValue(mode.service, ["advance_amount"])?.toString() ?? "",
    currency: firstMeaningfulValue(mode.service, ["currency"])?.toString() ?? "UZS",
    note: firstMeaningfulValue(mode.service, ["note", "comment", "description"])?.toString() ?? "",
    status: firstMeaningfulValue(mode.service, ["status"])?.toString() ?? "1",
    region_prices: regionPriceRowsFromService(mode.service).map((row) => ({
      ...row,
      localId: `form-${row.localId}`,
      editing: true,
    })),
  };
}

function buildArtistServiceAssignmentPayload(
  artistId: number,
  values: ArtistServiceFormValues,
): ArtistServiceAssignmentPayload {
  const payload: ArtistServiceAssignmentPayload = {
    artist_id: artistId,
    service_id: Number(values.service_id),
    price: Number(values.price),
    advance_amount: values.advance_amount === "" ? null : Number(values.advance_amount),
    currency: values.currency,
  };
  const note = values.note.trim();
  if (note) payload.note = note;
  const regionPrices = buildArtistServiceRegionPricePayload(values.region_prices);
  if (regionPrices.length) payload.region_prices = regionPrices;
  return payload;
}

function buildArtistServiceUpdatePayload(values: ArtistServiceFormValues): ArtistServiceUpdatePayload {
  const payload: ArtistServiceUpdatePayload = {
    price: Number(values.price),
    advance_amount: values.advance_amount === "" ? null : Number(values.advance_amount),
    currency: values.currency,
    region_prices: buildArtistServiceRegionPricePayload(values.region_prices),
  };
  const note = values.note.trim();
  if (note) payload.note = note;
  const status = Number(values.status);
  if (Number.isFinite(status)) payload.status = status;
  return payload;
}

function buildCreateArtistServices(values: ArtistServiceDraft[]): NonNullable<CreateArtistPayload["services"]> {
  return values
    .filter((item) => item.service_id || item.price || item.region_prices.length)
    .map((item) => {
      const service: NonNullable<CreateArtistPayload["services"]>[number] = {
        service_id: Number(item.service_id),
        price: Number(item.price),
        advance_amount: item.advance_amount === "" ? null : Number(item.advance_amount),
        currency: item.currency,
      };
      const note = item.note.trim();
      if (note) service.note = note;
      const regionPrices = buildArtistServiceRegionPricePayload(item.region_prices);
      if (regionPrices.length) service.region_prices = regionPrices;
      return service;
    });
}

function buildArtistServiceRegionPricePayload(rows: RegionPriceRow[]): ArtistServiceRegionPricePayload[] {
  return rows
    .map((row) => ({
      advance_amount: row.advance_amount === "" ? null : Number(row.advance_amount),
      currency: row.currency,
      region_id: Number(row.region_id),
      price: Number(row.price),
    }))
    .filter((row) => Number.isFinite(row.region_id) && row.region_id > 0 && Number.isFinite(row.price) && row.price > 0);
}

function validateArtistServiceForm(values: ArtistServiceFormValues, labels: ArtistsLabels) {
  if (!Number.isFinite(Number(values.service_id)) || Number(values.service_id) <= 0) return labels.requiredField(labels.services);
  if (!Number.isFinite(Number(values.price)) || Number(values.price) <= 0) return labels.requiredField(labels.price);
  if (!values.currency) return labels.requiredField(labels.currency);
  const advanceAmount = values.advance_amount === "" ? null : Number(values.advance_amount);
  if (advanceAmount !== null && (!Number.isFinite(advanceAmount) || advanceAmount < 0)) return labels.regionAdvanceInvalid;
  if (advanceAmount !== null && advanceAmount > Number(values.price)) return labels.regionAdvanceExceedsPrice;
  return validateRegionPriceRows(values.region_prices, labels);
}

function validateArtistServiceDrafts(values: ArtistServiceDraft[], labels: ArtistsLabels) {
  for (const item of values) {
    const hasAnyValue = item.service_id || item.price || item.region_prices.length;
    if (!hasAnyValue) continue;
    const error = validateArtistServiceForm(item, labels);
    if (error) return error;
  }
  return "";
}

function validateArtistCardNumber(value: string, labels: ArtistsLabels) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (!/^[0-9 -]+$/.test(normalized)) return labels.cardNumberFormatError;
  const digitCount = normalized.replace(/[^0-9]/g, "").length;
  if (digitCount < 16 || digitCount > 19) return labels.cardNumberLengthError;
  return "";
}

function validateArtistCardHolderName(value: string, labels: ArtistsLabels) {
  return value.trim().length > 255 ? labels.cardHolderNameLengthError : "";
}

function validateArtistRating(value: string, labels: ArtistsLabels) {
  if (!value.trim()) return "";
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 0 && rating <= 5 ? "" : labels.ratingRangeError;
}

function validateRegionPriceRows(rows: RegionPriceRow[], labels: ArtistsLabels) {
  for (const row of rows) {
    const hasAnyValue = row.region_id || row.price || row.advance_amount;
    if (!hasAnyValue) continue;
    if (!Number.isFinite(Number(row.region_id)) || Number(row.region_id) <= 0) return labels.regionPriceRegionRequired;
    if (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0) return labels.regionPricePriceRequired;
    if (!row.currency) return labels.requiredField(labels.currency);
    if (row.advance_amount !== "" && (!Number.isFinite(Number(row.advance_amount)) || Number(row.advance_amount) < 0)) return labels.regionAdvanceInvalid;
    if (row.advance_amount !== "" && Number(row.advance_amount) > Number(row.price)) return labels.regionAdvanceExceedsPrice;
  }
  return "";
}

function assignString(payload: CreateArtistPayload, key: keyof CreateArtistPayload, value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
  if (normalized) {
    (payload as Record<string, unknown>)[key] = normalized;
  }
}

function assignPhone(payload: CreateArtistPayload, key: keyof CreateArtistPayload, value: unknown) {
  const normalized = normalizePhoneForApi(value);
  if (normalized) {
    (payload as Record<string, unknown>)[key] = normalized;
  }
}

function assignNumber(payload: CreateArtistPayload, key: keyof CreateArtistPayload, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  const number = Number(value);
  if (Number.isFinite(number)) {
    (payload as Record<string, unknown>)[key] = number;
  }
}

function assignBoolean(payload: CreateArtistPayload, key: keyof CreateArtistPayload, value: string | boolean) {
  if (typeof value === "boolean") {
    (payload as Record<string, unknown>)[key] = value;
    return;
  }
  if (value === "true") (payload as Record<string, unknown>)[key] = true;
  if (value === "false") (payload as Record<string, unknown>)[key] = false;
}

function parseIdList(value: unknown) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id));
}

function firstUploadedFile(uploaded: UploadedFileRecord[] | UploadedFileRecord) {
  if (Array.isArray(uploaded)) return uploaded[0];
  const files = uploaded.files ?? uploaded.items ?? uploaded.data;
  if (Array.isArray(files)) return files.find(isRecord) as UploadedFileRecord | undefined;
  return uploaded;
}

function uploadedFileId(file: UploadedFileRecord | undefined) {
  if (!file) return undefined;
  const value = file.id ?? file.file_id ?? file.image_id;
  const id = Number(value);
  return Number.isFinite(id) ? id : undefined;
}

function uploadedFileUrl(file: UploadedFileRecord | undefined) {
  if (!file) return "";
  const value = file.url ?? file.file_url ?? file.path ?? file.full_url;
  return typeof value === "string" ? value : "";
}

type LocalizedEntity = {
  id?: number;
  public_id?: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  slug?: string;
};

function getLocalizedEntityName(entity: LocalizedEntity, locale: Locale) {
  const localized = locale === "ru" ? entity.name_ru : entity.name_uz;
  return localized || entity.name_uz || entity.name_ru || entity.name_en || entity.slug || entity.public_id || "—";
}

function getArtistsLabels(locale: string) {
  const language: Locale = locale === "ru" ? "ru" : "uz";
  const notification = (key: Parameters<typeof getDashboardNotification>[0]) =>
    getDashboardNotification(key, language);
  const genericStatus = (value: string) => getDashboardStatus("generic", value, language).label;
  const accountStatus = (value: number) => getDashboardStatus("account", value, language).label;
  const publicationStatus = (value: number) => getDashboardStatus("publication", value, language).label;

  if (locale === "ru") {
    return {
      locale: "ru" as Locale,
      adminName: "Имя администратора",
      adminPhone: "Телефон администратора",
      additionalInfo: "Дополнительная информация",
      profileCompleteness: "Заполнение профиля",
      profileGaps: "Что нужно заполнить",
      quota: "Лимиты и квоты",
      otherDetails: "Другие данные",
      noAdditionalInfo: "Дополнительных данных нет",
      achievements: "Достижения",
      albumsCount: "Количество альбомов",
      albums: "Альбомы",
      artist: "Артист",
      artistId: "ID артиста",
      artistStats: "Статистика артиста",
      artistIdMissing: "ID артиста не найден",
	      averageRating: "Средняя оценка",
	      assignService: "Привязать услугу",
	      artistVideos: "Видео артиста",
      artistVideosCountHint: "Количество видео, привязанных к этому артисту",
      videoItem: "Видео",
      videoItemCount: (count: number) => `${count} ${count === 1 ? "видео" : "видео"}`,
      about: "О себе",
      actions: "Действия",
      add: "Добавить",
      addAvailability: "Добавить занятое время",
      all: "Все",
      administrator: "Администратор",
      arrayType: "Массив",
      availability: "Расписание",
      availabilityList: "Занятое время",
      availabilitySummary: "Сводка доступности",
      availabilityType: "Тип доступности",
      availableStatus: getDashboardStatus("availability", "available", language).label,
      availableDayAction: "Свободно, можно добавить время",
      availableDays: "Доступные дни",
      availableDaysCount: (count: number) => `${count} доступных дней`,
      busyStatus: getDashboardStatus("availability", "busy", language).label,
      busyDays: "Занятые дни",
      busyDaysCount: (count: number) => `${count} занятых дней`,
      busyDateAction: "Есть занятое время, можно добавить другой интервал",
      busySlotCount: (count: number) => count === 1
        ? "1 занятый интервал"
        : count >= 2 && count <= 4
          ? `${count} занятых интервала`
          : `${count} занятых интервалов`,
      busySlotCreated: notification("busySlotCreated"),
      busySlotDeleted: notification("busySlotDeleted"),
      busySlotDeleteFailed: "Не удалось удалить занятое время",
      busySlotIdMissing: "ID занятого времени не найден",
      busySlotOverlap: (time: string, source: string) => `${source}: ${time}. Выберите другой интервал без пересечения с этим временем.`,
      busySlotSaveFailed: "Не удалось сохранить занятое время",
      busySlotUpdateFailedRestored: "Изменения не сохранены. Исходное занятое время восстановлено.",
      busySlotUpdateFailedRestoreFailed: "Изменения не сохранены, исходное время восстановить не удалось. Обновите расписание и проверьте данные.",
      busySlotSubtitle: "Укажите день и временной интервал",
      busySlotUpdated: notification("busySlotUpdated"),
      busySlotSource: "Источник",
      busySlotExpiresAt: "Истекает",
      closeImagePreview: "Закрыть просмотр изображения",
	      balance: "Баланс",
	      balanceAfter: "Баланс после",
	      balanceBefore: "Баланс до",
	      calendarPreview: "Календарь",
	      calendarHint: "Нажмите на любой день расписания, чтобы добавить время.",
	      calendarLoading: "Календарь обновляется",
	      holdBusyLocked: "Временное удержание изменяется через заказ.",
	      lockedBusyStatus: "Время заказа или удержания нельзя изменить, но можно добавить другой интервал",
	      manualBusyStatus: "Добавлено вручную, можно изменить",
	      nextMonth: "Следующий месяц",
	      orderBusyLocked: "Занято заказом. Изменение здесь недоступно.",
	      openOrder: "Открыть заказ",
	      outsideSchedule: "Вне расписания",
	      previousMonth: "Предыдущий месяц",
	      selectMonth: "Выбрать месяц",
	      selectYear: "Выбрать год",
	      cardDetails: "Данные банковской карты",
	      cardHolderName: "Имя владельца карты",
	      cardHolderNameLengthError: "Имя владельца карты не должно превышать 255 символов.",
	      cardNumber: "Номер карты",
	      cardNumberFormatError: "Номер карты может содержать только цифры, пробелы и дефисы.",
	      cardNumberLengthError: "Номер карты должен содержать от 16 до 19 цифр.",
      birthDate: "Дата рождения",
      cancel: "Закрыть",
      category: "Категории",
      categoryPlaceholder: "Выберите категорию",
      categoryIds: "ID категорий",
      client: "Клиент",
      comment: "Комментарий",
      commentPlaceholder: "Введите комментарий...",
      commentDeleted: notification("commentDeleted"),
      commentDeleteFailed: "Не удалось удалить комментарий",
      commentIdMissing: "ID комментария не найден",
      commentItemCount: (count: number) => `${count} ${count === 1 ? "комментарий" : "комментариев"}`,
      commentPublished: notification("commentPublished"),
      commentPublishFailed: "Не удалось опубликовать комментарий",
      commentUnpublished: notification("commentHidden"),
      commentUnpublishFailed: "Не удалось скрыть комментарий",
      commentUpdated: notification("commentUpdated"),
      commentUpdateFailed: "Не удалось обновить комментарий",
      comments: "Комментарии",
      commentsEmptyDescription: "Для этого артиста пока нет комментариев.",
      commentsEmptyTitle: "Комментариев нет",
      contact: "Контакт",
      contactInfo: "Контактная информация",
      create: "Создать",
      createArtist: "Создать артиста",
      createFailed: "Не удалось создать артиста",
      createTitle: "Создание артиста",
      created: notification("artistCreated"),
      creating: "Создается...",
      createdAt: "Создано",
      formTabBasic: "Основные данные",
      formTabProfile: "Профиль и описание",
      formTabSettings: "Услуги и аккаунт",
      formTabServices: "Услуги и цены",
      formTabAccount: "Аккаунт и безопасность",
      lineSeparatedPlaceholder: "Каждое значение с новой строки",
      custom: "Настроить",
      date: "Дата",
      dateFilter: "Дата",
      dateFrom: "Дата с",
      dateTo: "Дата до",
      deletedStatus: accountStatus(0),
      description: "Просмотр, фильтрация и обновление данных профилей артистов.",
      detailLoadFailed: "Не удалось загрузить детали артиста",
      detailTitle: "Детали артиста",
      experienceYears: "Опыт",
      district: "Район",
      duration: "Длительность",
      duplicateSchedule: "Дублировать расписание",
      deleteSchedule: "Удалить расписание",
      deleteBusySlotConfirm: "Это занятое время будет удалено из расписания артиста.",
      deleteBusySlotTitle: "Удалить занятое время?",
      deleteComment: "Удалить",
      deleteCommentConfirm: "Комментарий будет удален из профиля артиста.",
      deleteCommentTitle: "Удалить комментарий?",
	      deleteRating: "Удалить",
	      deleteRatingConfirm: "Рейтинг будет удален из профиля артиста.",
	      deleteRatingTitle: "Удалить рейтинг?",
	      deleteArtistService: "Удалить услугу",
	      deleteArtistServiceConfirm: "Услуга будет отвязана от профиля артиста.",
	      deleteArtistServiceTitle: "Удалить услугу артиста?",
	      debt: "Долг",
	      editBusySlot: "Изменить занятое время",
	      editComment: "Редактировать комментарий",
	      editArtistService: "Изменить услугу",
	      editTitle: "Редактировать артиста",
      emptyType: "Пусто",
      emptyArtistDetails: "Детали артиста пустые",
      email: "Email",
      extraPhone: "Дополнительный телефон",
      eyebrow: "Артисты",
      fansCount: "Количество поклонников",
      firstName: "Имя",
      fieldLabels: {
	        administrator_name: "Имя администратора",
	        administrator_phone: "Телефон администратора",
	        albums_count: "Количество альбомов",
	        artist_id: "ID артиста",
	        artistProfile: "Профиль артиста",
	        artist_profile: "Профиль артиста",
	        bio: "Bio",
	        balance: "Баланс",
	        balance_after: "Баланс после",
	        balance_before: "Баланс до",
	        card_holder_name: "Имя владельца карты",
	        card_number: "Номер карты",
	        card_number_masked: "Маскированный номер карты",
	        category_ids: "ID категорий",
	        client_id: "ID клиента",
	        created_at: "Создано",
	        current_balance: "Текущий баланс",
	        current_debt: "Текущий долг",
	        deleted_at: "Удалено",
	        debt: "Долг",
	        description: "Описание",
	        district_id: "Район",
	        email: "Email",
	        extra_phone: "Дополнительный телефон",
        first_name: "Имя",
        full_name: "Полное имя",
        id: "ID",
        public_id: "Public ID",
        is_top: "Top",
        is_verified: "Подтвержден",
        profile_gaps: "Незаполненные данные",
        period: "Период",
        limit: "Лимит",
        used: "Использовано",
        total_all_time: "За все время",
        unlimited: "Без ограничений",
        enforced: "Проверка включена",
        last_name: "Фамилия",
	        message: "Сообщение",
	        note: "Примечание",
	        order_id: "ID заказа",
	        phone: "Телефон",
	        rating: "Рейтинг",
	        region_id: "Регион",
	        role: "Роль",
	        role_label: "Роль",
	        status: "Статус",
	        status_label: "Статус",
	        title: "Заголовок",
	        transaction_type: "Тип транзакции",
	        type: "Тип",
	        updated_at: "Обновлено",
	        user_id: "ID пользователя",
      } as Record<string, string>,
	      fans: "Поклонники",
	      finance: "Финансы",
	      gallery: "Галерея",
      galleryEmptyDescription: "Для этого артиста пока нет загруженных изображений.",
      galleryEmptyTitle: "Галерея пуста",
      galleryDeleteConfirm: "Изображение будет удалено из галереи артиста.",
      galleryDeleteFailed: "Не удалось удалить изображение галереи",
      galleryDeleteTitle: "Удалить изображение?",
      galleryDeleted: notification("artistGalleryDeleted"),
      galleryFileTooLarge: "Размер каждого изображения не должен превышать 5 МБ.",
      galleryInvalidFileType: "Разрешены только изображения JPG, PNG и WebP.",
      galleryItem: "Изображение",
      galleryItemIdMissing: "ID изображения галереи не найден",
      galleryItemCount: (count: number) => `${count} ${count === 1 ? "изображение" : "изображений"}`,
      galleryTooManyFiles: "За один раз можно загрузить не более 10 изображений.",
      galleryUpload: "Загрузить изображения",
      galleryUploadFailed: "Не удалось загрузить изображения галереи",
      galleryUploaded: notification("artistGalleryUploaded"),
      gender: "Пол",
      genderFemale: "Женский",
      genderMale: "Мужской",
      genderOther: "Другое",
      loadFailed: "Не удалось загрузить артистов",
      loadingTitle: (title: string) => `${title} загружается...`,
      fullName: "Полное имя",
      language: "Язык",
      id: "Public ID",
      public_id: "Public ID",
      bio: "Bio",
      mainInfo: "Основная информация",
      manage: "Управлять",
      minutesShort: "мин",
      moreActions: "Дополнительные действия",
      name: "Имя",
      newest: "Новые",
      no: "Нет",
      noAvailabilityData: "Нет данных по доступности",
      noImage: "Нет изображения",
      noVideoPreview: "Превью нет",
      noVideoHint: "Видео не найдено. Можно повторно проверить на странице видео с фильтром по артисту.",
      notFoundTitle: (title: string) => `${title} не найдено`,
	      objectType: "Объект",
	      oldest: "Старые",
	      oneObject: "1 объект",
	      openVideo: "Открыть",
	      orderId: "ID заказа",
      page: "Страница",
      password: "Пароль",
      passwordGenerationFailed: "Не удалось подготовить безопасный пароль.",
      newPassword: "Новый пароль",
      confirmPassword: "Подтвердите пароль",
      passwordMismatch: "Пароли не совпадают",
      passwordMinLength: "Пароль должен быть не меньше 6 символов",
      resetPasswordAction: "Сбросить пароль",
      resetPasswordTitle: "Сбросить пароль артиста",
      resetPasswordDescription: (name: string) => `Новый пароль будет установлен для ${name}.`,
      passwordResetSuccess: notification("artistPasswordReset"),
      passwordResetFailed: "Не удалось обновить пароль артиста",
      phone: "Телефон",
      pendingStatus: genericStatus("pending"),
      price: "Цена",
      currency: "Валюта",
      profile: "Профиль",
      regionPriceDeleted: notification("regionPriceDeleted"),
      advanceAmount: "Аванс",
      effectiveAdvance: "Действующий аванс",
      regionAdvanceInvalid: "Аванс должен быть неотрицательным числом.",
      regionAdvanceExceedsPrice: "Аванс не может превышать цену региона.",
      regionPriceDeleteFailed: "Не удалось удалить региональную цену",
      regionPricePriceRequired: "Укажите цену",
      regionPrices: "Цены по регионам",
      regionPricesEmpty: "Для этого сервиса региональные цены не указаны.",
      regionPriceSaved: notification("regionPriceSaved"),
      regionPriceSaveFailed: "Не удалось сохранить региональную цену",
      regionPriceRegionRequired: "Выберите регион",
      regionPriceServiceMissing: "ID сервиса артиста не найден",
      publicationStatus: "Статус публикации",
      publishedRatings: publicationStatus(1),
      publishComment: "Опубликовать",
      publishCommentConfirm: "Комментарий станет видимым в профиле артиста.",
      publishCommentTitle: "Опубликовать комментарий?",
      publishedStatus: publicationStatus(1),
      districtId: "ID района",
      lastName: "Фамилия",
      noProfilePhoto: "Фото не выбрано",
      profilePhotoId: "ID фото профиля",
      profilePhoto: "Фото профиля",
      profilePhotoHint: "JPG или PNG, до 5 MB.",
      rating: "Рейтинг",
      ratingDeleted: notification("ratingDeleted"),
      ratingDeleteFailed: "Не удалось удалить рейтинг",
      ratingIdMissing: "ID рейтинга не найден",
      ratingItemCount: (count: number) => `${count} ${count === 1 ? "рейтинг" : "рейтингов"}`,
      ratingRangeError: "Рейтинг должен быть от 0 до 5.",
      ratings: "Рейтинги",
      ratingsEmptyDescription: "Для этого артиста пока нет оценок.",
      ratingsEmptyTitle: "Рейтингов нет",
      recordCount: (count: number) => `${count} записей`,
      recordNumber: (index: number) => `Запись #${index}`,
      region: "Регион",
      regionId: "ID региона",
      requiredField: (title: string) => `${title}: обязательное поле`,
      resourceLoadFailed: "Не удалось загрузить данные",
      reset: "Сбросить",
      role: "Роль",
      rawAvailability: "Сырые данные доступности",
      quickInfo: "Краткая информация",
      scheduleDetails: "Детали расписания",
      scheduleManagementHint: "Выберите любой день и добавьте свободный интервал. Время заказа доступно только для просмотра.",
      scheduleManagementTitle: "Управление занятым временем",
      schedulePeriod: "Период",
      scheduleRecordCount: (count: number) => `${count} ${count === 1 ? "запись" : "записей"}`,
      scheduleStatusActive: getDashboardStatus("resource", 1, language).label,
	      scheduleStatusDraft: "Черновик",
	      search: "Поиск",
      searchPlaceholder: "ART-75 или имя, фамилия, телефон",
      artistServiceDeleted: notification("artistServiceDeleted"),
	      artistServiceDeleteFailed: "Не удалось удалить услугу артиста",
      artistServiceSaved: notification("artistServiceSaved"),
	      artistServiceSaveFailed: "Не удалось сохранить услугу артиста",
      services: "Услуги",
      manageServices: "Управлять услугами",
      manageAvailability: "Управлять расписанием",
      sortOrder: "Порядок",
      status: "Статус",
      statusValueLabels: {
        active: accountStatus(10),
        inactive: accountStatus(9),
        pending: genericStatus("pending"),
        "pending review": genericStatus("pending_review"),
        "payment pending": getDashboardStatus("order", 20, language).label,
        "awaiting payment": getDashboardStatus("order", 20, language).label,
        approved: genericStatus("approved"),
        accepted: genericStatus("accepted"),
        rejected: genericStatus("rejected"),
        confirmed: genericStatus("confirmed"),
        "in progress": genericStatus("in_progress"),
        processing: genericStatus("processing"),
        completed: genericStatus("completed"),
        done: genericStatus("done"),
        cancelled: genericStatus("cancelled"),
        canceled: genericStatus("canceled"),
        deleted: accountStatus(0),
        expired: genericStatus("expired"),
        unknown: "Неизвестно",
        blocked: accountStatus(20),
        published: publicationStatus(1),
        unpublished: publicationStatus(0),
        user: "Пользователь",
        admin: "Администратор",
        moderator: "Модератор",
        true: "Да",
        false: "Нет",
      } as Record<string, string>,
      time: "Время",
      timeRangeInvalid: "Время окончания должно быть позже времени начала",
	      timezone: "Часовой пояс",
	      title: "Артисты",
	      transactions: "Транзакции",
	      transactionsEmpty: "Транзакции не найдены",
	      top: "Топ",
      topArtist: "Топ артист",
      uploadFailed: "Не удалось загрузить фото",
      uploadProfilePhoto: "Загрузить фото",
      uploading: "Загружается...",
      totalDays: "Всего дней",
      totalRatings: "Всего оценок",
      unknownType: "Неизвестно",
      unknownClient: "Клиент",
      unpublishComment: "Скрыть",
      unpublishCommentConfirm: "Комментарий будет скрыт из профиля артиста.",
      unpublishCommentTitle: "Скрыть комментарий?",
      unpublishedStatus: "Скрыто",
      updateFailed: "Не удалось обновить",
      updated: notification("artistUpdated"),
      updatedAt: "Обновлено",
      endTime: "Время окончания",
      lastActivity: "Последняя активность",
      tableRegionLabel: "Таблица артистов. Для просмотра скрытых столбцов используйте горизонтальную прокрутку.",
      reason: "Примечание",
      saveBusySlot: "Сохранить",
      saveComment: "Сохранить",
      saveRegionPrice: "Сохранить цену региона",
      editRegionPrice: "Изменить цену региона",
      deleteRegionPrice: "Удалить цену региона",
      saving: "Сохраняется...",
      startTime: "Время начала",
      verified: "Подтвержден",
      verifiedBadge: "Verified",
      videos: "Видео",
      videosEmptyTitle: "Видео не найдены",
      videosLoading: "Видео загружаются...",
      viewInTable: "Посмотреть в таблице",
      manageVideos: "Управлять видео",
      weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
      selectedPhoto: (id: number) => `Выбрано фото #${id}`,
      selectRegionFirst: "Сначала выберите регион",
      shortDescription: "Краткое описание",
      shortDescriptionPlaceholder: "Короткий текст для карточки артиста",
      stageName: "Сценическое имя",
      stageNamePlaceholder: "Например, Shahzoda",
      titles: "Звания",
      titlesAndAchievements: "Звания и достижения",
      years: "лет",
      adminInfo: "Контакт администратора",
      accountStatus: "Аккаунт и статус",
      artistInfo: "Данные артиста",
      locationInfo: "Локация",
      statistics: "Показатели",
      yes: "Да",
    };
  }

  return {
    locale: "uz" as Locale,
    adminName: "Administrator ismi",
    adminPhone: "Administrator telefoni",
    additionalInfo: "Qo'shimcha ma'lumot",
    profileCompleteness: "Profil to'liqligi",
    profileGaps: "To'ldirilishi kerak",
    quota: "Limitlar va quota",
    otherDetails: "Boshqa ma'lumotlar",
    noAdditionalInfo: "Qo'shimcha ma'lumot yo'q",
    achievements: "Yutuqlari",
    albumsCount: "Albomlar soni",
    albums: "Albomlar",
    artist: "Sanatkor",
    artistId: "Sanatkor ID",
    artistStats: "Sanatkor statistikasi",
    artistIdMissing: "Sanatkor ID topilmadi",
	    averageRating: "O'rtacha reyting",
	    assignService: "Xizmat biriktirish",
	    artistVideos: "Sanatkor videolari",
    artistVideosCountHint: "Bu sanatkorga biriktirilgan video soni",
    videoItem: "Video",
    videoItemCount: (count: number) => `${count} ta video`,
    about: "O'zi haqida",
    actions: "Amallar",
    add: "Qo'shish",
    addAvailability: "Band vaqt qo'shish",
    all: "Barchasi",
    administrator: "Administrator",
    arrayType: "Massiv",
    availability: "Vaqtlar",
    availabilityList: "Band vaqtlar",
      availabilitySummary: "Bo'sh vaqt xulosasi",
      availabilityType: "Bo'sh vaqt turi",
      availableStatus: getDashboardStatus("availability", "available", language).label,
      availableDayAction: "Bo‘sh, band vaqt qo‘shish mumkin",
      availableDays: "Bo'sh kunlar",
      availableDaysCount: (count: number) => `${count} ta bo'sh kun`,
      busyStatus: getDashboardStatus("availability", "busy", language).label,
      busyDays: "Band kunlar",
      busyDaysCount: (count: number) => `${count} ta band kun`,
      busyDateAction: "Band vaqt bor, boshqa vaqt oralig‘ini qo‘shish mumkin",
      busySlotCount: (count: number) => `${count} ta band vaqt oralig‘i`,
      busySlotCreated: notification("busySlotCreated"),
      busySlotDeleted: notification("busySlotDeleted"),
      busySlotDeleteFailed: "Band vaqtni o'chirish bajarilmadi",
      busySlotIdMissing: "Band vaqt ID topilmadi",
      busySlotOverlap: (time: string, source: string) => `${source}: ${time}. Bu vaqt bilan ustma-ust tushmaydigan boshqa intervalni tanlang.`,
      busySlotSaveFailed: "Band vaqtni saqlash bajarilmadi",
      busySlotUpdateFailedRestored: "O‘zgarish saqlanmadi. Avvalgi band vaqt qayta tiklandi.",
      busySlotUpdateFailedRestoreFailed: "O‘zgarish saqlanmadi va avvalgi vaqtni tiklab bo‘lmadi. Jadvalni yangilab, ma’lumotni tekshiring.",
      busySlotSubtitle: "Kun va vaqt oralig‘ini belgilang",
      busySlotUpdated: notification("busySlotUpdated"),
	    busySlotSource: "Manba",
	    busySlotExpiresAt: "Tugash vaqti",
      closeImagePreview: "Rasm ko‘rinishini yopish",
	    balance: "Balans",
	    balanceAfter: "Keyingi balans",
	    balanceBefore: "Oldingi balans",
	    calendarPreview: "Kalendar",
	    calendarHint: "Vaqt qo‘shish uchun jadval ichidagi istalgan kunni bosing.",
	    calendarLoading: "Kalendar yangilanmoqda",
	    holdBusyLocked: "Vaqtincha ushlab turilgan vaqt buyurtma jarayoni orqali boshqariladi.",
	    lockedBusyStatus: "Buyurtma yoki vaqtincha band interval o‘zgartirilmaydi, ammo boshqa vaqt qo‘shish mumkin",
	    manualBusyStatus: "Qo‘lda band qilingan, tahrirlash mumkin",
	    nextMonth: "Keyingi oy",
	    orderBusyLocked: "Buyurtma orqali band. Bu yerdan o‘zgartirilmaydi.",
	    openOrder: "Buyurtmani ochish",
	    outsideSchedule: "Jadvaldan tashqari",
	    previousMonth: "Oldingi oy",
	    selectMonth: "Oyni tanlash",
	    selectYear: "Yilni tanlash",
	    cardDetails: "Bank karta ma'lumotlari",
	    cardHolderName: "Karta egasining ismi",
	    cardHolderNameLengthError: "Karta egasining ismi 255 belgidan oshmasligi kerak.",
	    cardNumber: "Karta raqami",
	    cardNumberFormatError: "Karta raqamida faqat raqam, bo'sh joy va defis bo'lishi mumkin.",
	    cardNumberLengthError: "Karta raqami 16–19 ta raqamdan iborat bo'lishi kerak.",
    birthDate: "Tug'ilgan sana",
    cancel: "Yopish",
    category: "Kategoriya",
    categoryPlaceholder: "Kategoriya tanlang",
    categoryIds: "Kategoriya IDlari",
    client: "Mijoz",
    comment: "Izoh",
    commentPlaceholder: "Izoh yozing...",
    commentDeleted: notification("commentDeleted"),
    commentDeleteFailed: "Izohni o'chirish bajarilmadi",
    commentIdMissing: "Izoh ID topilmadi",
    commentItemCount: (count: number) => `${count} ta izoh`,
    commentPublished: notification("commentPublished"),
    commentPublishFailed: "Izohni ko'rsatish bajarilmadi",
    commentUnpublished: notification("commentHidden"),
    commentUnpublishFailed: "Izohni yashirish bajarilmadi",
    commentUpdated: notification("commentUpdated"),
    commentUpdateFailed: "Izohni yangilash bajarilmadi",
    comments: "Izohlar",
    commentsEmptyDescription: "Bu sanatkor uchun hali izoh yozilmagan.",
    commentsEmptyTitle: "Izohlar yo'q",
    contact: "Aloqa",
    contactInfo: "Kontakt ma'lumotlari",
    create: "Yaratish",
    createArtist: "Sanatkor yaratish",
    createFailed: "Sanatkor yaratilmadi",
    createTitle: "Sanatkor yaratish",
    created: notification("artistCreated"),
    creating: "Yaratilmoqda...",
    createdAt: "Yaratilgan",
    formTabBasic: "Asosiy ma'lumotlar",
    formTabProfile: "Profil va tavsif",
    formTabSettings: "Xizmatlar va hisob",
    formTabServices: "Xizmatlar va narxlar",
    formTabAccount: "Hisob va xavfsizlik",
    lineSeparatedPlaceholder: "Har bir qiymatni yangi qatordan kiriting",
    custom: "Sozlash",
    date: "Sana",
    dateFilter: "Sana",
    dateFrom: "Boshlanish sanasi",
    dateTo: "Tugash sanasi",
    deletedStatus: accountStatus(0),
    description: "Sanatkor profillarini ko'rish, filterlash va kerakli ma'lumotlarni yangilash.",
    detailLoadFailed: "Sanatkor tafsilotlari yuklanmadi",
    detailTitle: "Sanatkor tafsilotlari",
    experienceYears: "Tajribasi",
    district: "Tuman",
    duration: "Davomiylik",
    duplicateSchedule: "Vaqtni nusxalash",
    deleteSchedule: "Vaqtni o'chirish",
    deleteBusySlotConfirm: "Bu band vaqt sanatkor jadvalidan o'chiriladi.",
    deleteBusySlotTitle: "Band vaqt o'chirilsinmi?",
    deleteComment: "O'chirish",
    deleteCommentConfirm: "Izoh sanatkor profilidan o'chiriladi.",
    deleteCommentTitle: "Izoh o'chirilsinmi?",
	    deleteRating: "O'chirish",
	    deleteRatingConfirm: "Reyting sanatkor profilidan o'chiriladi.",
	    deleteRatingTitle: "Reyting o'chirilsinmi?",
	    deleteArtistService: "Xizmatni o'chirish",
	    deleteArtistServiceConfirm: "Xizmat sanatkor profilidan ajratiladi.",
	    deleteArtistServiceTitle: "Sanatkor xizmati o'chirilsinmi?",
	    debt: "Qarz",
	    editBusySlot: "Band vaqtni tahrirlash",
	    editComment: "Izohni tahrirlash",
	    editArtistService: "Xizmatni tahrirlash",
	    editTitle: "Sanatkorni tahrirlash",
    emptyType: "Bo'sh",
    emptyArtistDetails: "Sanatkor tafsilotlari bo'sh qaytdi",
    email: "Email",
    extraPhone: "Qo'shimcha telefon",
    eyebrow: "Sanatkorlar",
    fansCount: "Muxlislar soni",
    firstName: "Ism",
    fieldLabels: {
	      administrator_name: "Administrator ismi",
	      administrator_phone: "Administrator telefoni",
	      albums_count: "Albomlar soni",
	      artist_id: "Sanatkor ID",
	      artistProfile: "Sanatkor profili",
	      artist_profile: "Sanatkor profili",
	      bio: "Bio",
	      balance: "Balans",
	      balance_after: "Keyingi balans",
	      balance_before: "Oldingi balans",
	      card_holder_name: "Karta egasining ismi",
	      card_number: "Karta raqami",
	      card_number_masked: "Maskalangan karta raqami",
	      category_ids: "Kategoriya IDlari",
	      client_id: "Mijoz ID",
	      created_at: "Yaratilgan",
	      current_balance: "Joriy balans",
	      current_debt: "Joriy qarz",
	      deleted_at: "O'chirilgan",
	      debt: "Qarz",
	      description: "Tavsif",
	      district_id: "Tuman",
	      email: "Email",
	      extra_phone: "Qo'shimcha telefon",
      first_name: "Ism",
      full_name: "To'liq ism",
      id: "Public ID",
      is_top: "Top",
      is_verified: "Tasdiqlangan",
      profile_gaps: "To'ldirilmagan ma'lumotlar",
      period: "Davr",
      limit: "Limit",
      used: "Ishlatilgan",
      total_all_time: "Barcha vaqt bo'yicha",
      unlimited: "Cheklanmagan",
      enforced: "Tekshiruv yoqilgan",
      last_name: "Familiya",
	      message: "Xabar",
	      note: "Izoh",
	      order_id: "Buyurtma ID",
	      phone: "Telefon",
	      rating: "Reyting",
	      region_id: "Viloyat",
	      role: "Rol",
	      role_label: "Rol",
	      status: "Holat",
	      status_label: "Holat",
	      title: "Sarlavha",
	      transaction_type: "Tranzaksiya turi",
	      type: "Turi",
	      updated_at: "Yangilangan",
	      user_id: "Foydalanuvchi ID",
    } as Record<string, string>,
	    fans: "Muxlislar",
	    finance: "Moliya",
	    gallery: "Galereya",
    galleryEmptyDescription: "Bu sanatkor uchun hali rasm yuklanmagan.",
    galleryEmptyTitle: "Galereya bo'sh",
    galleryDeleteConfirm: "Rasm sanatkor galereyasidan o‘chiriladi.",
    galleryDeleteFailed: "Galereya rasmini o‘chirish bajarilmadi",
    galleryDeleteTitle: "Rasm o‘chirilsinmi?",
    galleryDeleted: notification("artistGalleryDeleted"),
    galleryFileTooLarge: "Har bir rasm hajmi 5 MB dan oshmasligi kerak.",
    galleryInvalidFileType: "Faqat JPG, PNG va WebP rasmlariga ruxsat beriladi.",
    galleryItem: "Rasm",
    galleryItemIdMissing: "Galereya rasmi ID topilmadi",
    galleryItemCount: (count: number) => `${count} ta rasm`,
    galleryTooManyFiles: "Bir martada 10 tagacha rasm yuklash mumkin.",
    galleryUpload: "Rasmlar yuklash",
    galleryUploadFailed: "Galereya rasmlarini yuklash bajarilmadi",
    galleryUploaded: notification("artistGalleryUploaded"),
    gender: "Jinsi",
    genderFemale: "Ayol",
    genderMale: "Erkak",
    genderOther: "Boshqa",
    loadFailed: "Sanatkorlar yuklanmadi",
    loadingTitle: (title: string) => `${title} yuklanmoqda...`,
    fullName: "To'liq ism",
    id: "ID",
    bio: "Bio",
    language: "Til",
    mainInfo: "Asosiy ma'lumotlar",
    manage: "Boshqarish",
    minutesShort: "daq",
    moreActions: "Qo'shimcha amallar",
    name: "Ism",
    newest: "Yangilari",
    no: "Yo'q",
    noAvailabilityData: "Bo'sh vaqt ma'lumotlari yo'q",
    noImage: "Rasm yo'q",
    noVideoPreview: "Preview yo'q",
    noVideoHint: "Video topilmadi. Videolar sahifasida sanatkor filter orqali qayta tekshirishingiz mumkin.",
    notFoundTitle: (title: string) => `${title} topilmadi`,
    objectType: "Obyekt",
    oldest: "Eng eskilari",
	    oneObject: "1 ta obyekt",
	    openVideo: "Ochish",
	    orderId: "Buyurtma ID",
	    page: "Sahifa",
      password: "Parol",
      passwordGenerationFailed: "Xavfsiz parolni tayyorlab bo'lmadi.",
    newPassword: "Yangi parol",
    confirmPassword: "Parolni tasdiqlash",
    passwordMismatch: "Parollar mos emas",
    passwordMinLength: "Parol kamida 6 belgidan iborat bo'lishi kerak",
    resetPasswordAction: "Parolni tiklash",
    resetPasswordTitle: "San’atkor parolini tiklash",
    resetPasswordDescription: (name: string) => `${name} uchun yangi parol o‘rnatiladi.`,
    passwordResetSuccess: notification("artistPasswordReset"),
    passwordResetFailed: "Sanatkor parolini yangilash bajarilmadi",
    phone: "Telefon",
    pendingStatus: genericStatus("pending"),
    price: "Narx",
    currency: "Valyuta",
    profile: "Profil",
    regionPriceDeleted: notification("regionPriceDeleted"),
    advanceAmount: "Avans",
    effectiveAdvance: "Amaldagi avans",
    regionAdvanceInvalid: "Avans manfiy bo‘lmagan son bo‘lishi kerak.",
    regionAdvanceExceedsPrice: "Avans viloyat narxidan katta bo‘lishi mumkin emas.",
    regionPriceDeleteFailed: "Viloyat narxini o'chirish bajarilmadi",
    regionPricePriceRequired: "Narx kiriting",
    regionPrices: "Viloyat narxlari",
    regionPricesEmpty: "Bu xizmat uchun viloyat narxlari kiritilmagan.",
    regionPriceSaved: notification("regionPriceSaved"),
    regionPriceSaveFailed: "Viloyat narxini saqlash bajarilmadi",
    regionPriceRegionRequired: "Viloyat tanlang",
    regionPriceServiceMissing: "Sanatkor xizmati ID topilmadi",
    publicationStatus: "Ko'rsatish holati",
    publishedRatings: publicationStatus(1),
    publishComment: "Ko'rsatish",
    publishCommentConfirm: "Izoh sanatkor profilida ko'rinadi.",
    publishCommentTitle: "Izoh ko'rsatilsinmi?",
    publishedStatus: publicationStatus(1),
    districtId: "Tuman ID",
    lastName: "Familiya",
    noProfilePhoto: "Rasm tanlanmagan",
    profilePhotoId: "Profil rasmi ID",
    profilePhoto: "Profil rasmi",
    profilePhotoHint: "JPG yoki PNG format, 5 MB gacha.",
    rating: "Reyting",
    ratingDeleted: notification("ratingDeleted"),
    ratingDeleteFailed: "Reytingni o'chirish bajarilmadi",
    ratingIdMissing: "Reyting ID topilmadi",
    ratingItemCount: (count: number) => `${count} ta reyting`,
    ratingRangeError: "Reyting 0 dan 5 gacha bo'lishi kerak.",
    ratings: "Reytinglar",
    ratingsEmptyDescription: "Bu sanatkor uchun hali reyting berilmagan.",
    ratingsEmptyTitle: "Reytinglar yo'q",
    recordCount: (count: number) => `${count} ta yozuv`,
    recordNumber: (index: number) => `Yozuv #${index}`,
    region: "Viloyat",
    regionId: "Viloyat ID",
    requiredField: (title: string) => `${title} majburiy`,
    resourceLoadFailed: "Ma'lumot yuklanmadi",
    reset: "Tozalash",
    role: "Rol",
    rawAvailability: "Bo'sh vaqt raw ma'lumoti",
    quickInfo: "Qisqa ma'lumot",
    scheduleDetails: "Vaqt tafsilotlari",
    scheduleManagementHint: "Kalendardan istalgan kunni tanlab, bo‘sh vaqt oralig‘ini qo‘shing. Buyurtma vaqtlari faqat ko‘rish uchun.",
    scheduleManagementTitle: "Band vaqtlarni boshqarish",
    schedulePeriod: "Davr",
    scheduleRecordCount: (count: number) => `${count} ta yozuv`,
    scheduleStatusActive: getDashboardStatus("resource", 1, language).label,
    scheduleStatusDraft: "Qoralama",
	    search: "Qidiruv",
	    searchPlaceholder: "ART-75 yoki ism, familiya, telefon",
    artistServiceDeleted: notification("artistServiceDeleted"),
	    artistServiceDeleteFailed: "Sanatkor xizmatini o'chirish bajarilmadi",
    artistServiceSaved: notification("artistServiceSaved"),
	    artistServiceSaveFailed: "Sanatkor xizmatini saqlash bajarilmadi",
    services: "Xizmatlar",
    manageServices: "Xizmatlarni boshqarish",
    manageAvailability: "Vaqtlarni boshqarish",
    sortOrder: "Tartib",
    status: "Holat",
    statusValueLabels: {
      active: accountStatus(10),
      inactive: accountStatus(9),
      pending: genericStatus("pending"),
      "pending review": genericStatus("pending_review"),
      "payment pending": getDashboardStatus("order", 20, language).label,
      "awaiting payment": getDashboardStatus("order", 20, language).label,
      approved: genericStatus("approved"),
      accepted: genericStatus("accepted"),
      rejected: genericStatus("rejected"),
      confirmed: genericStatus("confirmed"),
      "in progress": genericStatus("in_progress"),
      processing: genericStatus("processing"),
      completed: genericStatus("completed"),
      done: genericStatus("done"),
      cancelled: genericStatus("cancelled"),
      canceled: genericStatus("canceled"),
      deleted: accountStatus(0),
      expired: genericStatus("expired"),
      unknown: "Noma’lum",
      blocked: accountStatus(20),
      published: publicationStatus(1),
      unpublished: publicationStatus(0),
      user: "Foydalanuvchi",
      admin: "Administrator",
      moderator: "Moderator",
      true: "Ha",
      false: "Yo'q",
    } as Record<string, string>,
    time: "Vaqt",
    timeRangeInvalid: "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak",
	    timezone: "Vaqt zonasi",
	    title: "Sanatkorlar",
	    transactions: "Tranzaksiyalar",
	    transactionsEmpty: "Tranzaksiyalar topilmadi",
	    top: "Top",
    topArtist: "Top sanatkor",
    uploadFailed: "Rasm yuklanmadi",
    uploadProfilePhoto: "Rasm yuklash",
    uploading: "Yuklanmoqda...",
    totalDays: "Jami kunlar",
    totalRatings: "Jami reyting",
    unknownType: "Noma'lum",
    unknownClient: "Mijoz",
    unpublishComment: "Yashirish",
    unpublishCommentConfirm: "Izoh sanatkor profilidan yashiriladi.",
    unpublishCommentTitle: "Izoh yashirilsinmi?",
    unpublishedStatus: "Yashirilgan",
    updateFailed: "Yangilash bajarilmadi",
    updated: notification("artistUpdated"),
    updatedAt: "Yangilangan",
    endTime: "Tugash vaqti",
    lastActivity: "Oxirgi faollik",
    tableRegionLabel: "Sanatkorlar jadvali. Yashirin ustunlarni ko'rish uchun gorizontal aylantiring.",
    reason: "Izoh",
    saveBusySlot: "Saqlash",
    saveComment: "Saqlash",
    saveRegionPrice: "Viloyat narxini saqlash",
    editRegionPrice: "Viloyat narxini tahrirlash",
    deleteRegionPrice: "Viloyat narxini o'chirish",
    saving: "Saqlanmoqda...",
    startTime: "Boshlanish vaqti",
    verified: "Tasdiqlangan",
    verifiedBadge: "Verified",
    videos: "Videolar",
    videosEmptyTitle: "Videolar topilmadi",
    videosLoading: "Videolar yuklanmoqda...",
    viewInTable: "Jadvalda ko'rish",
    manageVideos: "Videolarni boshqarish",
    weekdays: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
    selectedPhoto: (id: number) => `Rasm #${id} tanlandi`,
    selectRegionFirst: "Avval viloyat tanlang",
    shortDescription: "Qisqa tavsif",
    shortDescriptionPlaceholder: "Sanatkor kartasi uchun qisqa matn",
    stageName: "Sahna nomi",
    stageNamePlaceholder: "Masalan, Shahzoda",
    titles: "Unvonlari",
    titlesAndAchievements: "Unvon va yutuqlar",
    years: "yil",
    adminInfo: "Administrator kontakti",
    accountStatus: "Account va holat",
    artistInfo: "San'atkor ma'lumotlari",
    locationInfo: "Joylashuv",
    statistics: "Ko'rsatkichlar",
    yes: "Ha",
  };
}

function categoryId(category: unknown) {
  if (!isRecord(category)) return "";
  const id = category.category_id ?? category.id;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
}
