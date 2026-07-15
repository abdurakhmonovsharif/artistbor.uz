"use client";

import { type ChangeEvent, FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Drawer, Input, Modal, Select, Tabs } from "antd";
import {
  ArrowDownUp,
  CalendarDays,
  CalendarPlus,
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
  KeyRound,
  Languages,
  ListChecks,
  Loader2,
  Mail,
  MoreHorizontal,
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
import {
  DateFilterSelect,
  getDateFilterPatch,
  inferDateFilterMode,
  type DateFilterValue,
} from "@/components/admin/date-filter-select";
import { FormField, type FormFieldOption } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
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
  staffApi,
  usersApi,
  type CreateArtistPayload,
  type ArtistFilters,
  type ArtistBusySlotPayload,
  type ArtistRegionPriceRecord,
  type ArtistServiceAssignmentPayload,
  type ArtistServiceRegionPricePayload,
  type ArtistServiceUpdatePayload,
  type UpdateCommentPayload,
  type UpdateArtistPayload,
  type UpdateUserPayload,
  type UploadedFileRecord,
} from "@/lib/api/admin-content";
import { API_BASE_URL } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/i18n-provider";
import {
  formatMoneyInput,
  formatMoneyWithCurrency,
  MONEY_CURRENCY_LABEL,
  parseMoneyInput,
} from "@/lib/money-format";
import { formatPhone, normalizePhoneForApi } from "@/lib/phone-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
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
  | { type: "view"; artist: ArtistProfile }
  | { type: "edit"; artist: ArtistProfile }
  | null;

type DetailTab = "profile" | "services" | "finance" | "availability" | "gallery" | "videos" | "comments" | "ratings";
type ResourceTab = Exclude<DetailTab, "profile">;
type DetailResourceState = {
  loading: boolean;
  error: string | null;
  rows: UnknownRecord[];
  meta?: ListResult<UnknownRecord>["meta"];
  raw?: unknown;
};
type ScheduleDrawerState =
  | { mode: "manage"; schedule: UnknownRecord }
  | { mode: "create"; schedule: null };
type BusySlotDialogState =
  | { mode: "create"; row?: AvailabilityRow; date?: string }
  | { mode: "edit"; row: AvailabilityRow }
  | null;
type BusySlotFormValues = {
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
};

const limit = 20;

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

function getDetailTabs(labels: ArtistsLabels): { key: DetailTab; label: string }[] {
  return [
    { key: "profile", label: labels.profile },
    { key: "services", label: labels.services },
    { key: "finance", label: labels.finance },
    { key: "availability", label: labels.availability },
    { key: "gallery", label: labels.gallery },
    { key: "videos", label: labels.videos },
    { key: "comments", label: labels.comments },
    { key: "ratings", label: labels.ratings },
  ];
}

function mergeArtistCategoryFallback(row: ArtistProfile, detail: ArtistProfile): ArtistProfile {
  const rowRecord = row as UnknownRecord;
  const detailRecord = detail as UnknownRecord;
  const merged: UnknownRecord = { ...detailRecord };

  for (const key of ["categories", "category", "category_ids", "category_id"]) {
    if (!hasMeaningfulValue(merged[key]) && hasMeaningfulValue(rowRecord[key])) {
      merged[key] = rowRecord[key];
    }
  }

  const rowArtistProfile = firstRecordValue(rowRecord, ["artistProfile", "artist_profile"]);
  const detailArtistProfile = firstRecordValue(detailRecord, ["artistProfile", "artist_profile"]);
  if (rowArtistProfile) {
    const nested = { ...(detailArtistProfile ?? {}) };
    for (const key of ["categories", "category", "category_ids", "category_id"]) {
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
  const debouncedSearch = useDebouncedValue(draftFilters.search ?? "", 450);

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await artistsApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed]);

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
    setSubmitting(true);
    try {
      const artist = await artistsApi.detail(artistId);
      setDialog({ type, artist: mergeArtistCategoryFallback(row, artist) });
    } catch (caught) {
      if (type === "view") {
        setDialog({ type, artist: row });
      }
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
    <section className="artistbor-admin-page w-full space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[2px] text-[#f97316]">
            {labels.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-[30px] tracking-[-0.02em] text-[#0f172a] dark:text-white md:text-[30px] md:leading-9">
            {labels.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-[22px] text-[#64748b] dark:text-slate-400">
            {labels.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className={cn(adminActionButtonLargeClass, "w-full md:w-auto")}
        >
          <Plus className="size-4" />
          {labels.createArtist}
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="artistbor-table-filter-shell overflow-x-auto"
      >
        <div className="artistbor-table-filter-panel grid gap-3 md:grid-cols-[auto_auto_auto_auto_minmax(0,1fr)_auto] md:items-center">
          <Input
            allowClear
            prefix={<Search className="size-4 text-[#94a3b8]" />}
            placeholder={labels.searchPlaceholder}
            value={draftFilters.search ?? ""}
            onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
            className={cn(
              "artistbor-table-filter-control artistbor-filter-search h-10",
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
            className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 w-28 shrink-0 md:col-start-6"
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
            await fetchArtists();
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
              await fetchArtists();
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
    <div className="overflow-hidden rounded-[18px] border border-[#e6ebf2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1012px] border-separate border-spacing-0">
            <colgroup>
              <col className="w-12" />
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
                  <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle text-[13px] font-semibold text-[#64748b] dark:border-white/10 dark:text-slate-400">
                    {toDisplay(getArtistId(row))}
                  </td>
                  <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                    <ArtistIdentityCell artist={row} labels={labels} />
                  </td>
                  <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                    <ArtistContactCell artist={row} />
                  </td>
                  <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                    <ArtistStatusPill artist={row} labels={labels} />
                  </td>
                  <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                    <ArtistRatingCell artist={row} />
                  </td>
                  <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle text-[13px] font-medium text-[#475569] dark:border-white/10 dark:text-slate-300">
                    {formatArtistActivityDate(getArtistActivityDate(row), labels.locale)}
                  </td>
                  <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
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
        "border-b border-[#e6ebf2] px-3.5 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400",
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
  const rawStatus = artist.status_label ?? artist.status ?? (isDeletedArtist(artist) ? "0" : "10");
  const normalized = normalizeEnumToken(String(rawStatus));
  const label = formatEnumValue("status", rawStatus, labels);
  const tone = statusTone("status", normalized, label, String(rawStatus), labels);

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
      {label}
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
    <div className="rounded-[26px] bg-white/55 p-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.045)] ring-1 ring-slate-950/[0.06] dark:bg-white/[0.035] dark:ring-white/10">
      <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-2 rounded-[calc(26px-0.375rem)] bg-white/95 px-3 text-sm font-semibold text-[#64748b] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:bg-slate-950/92 dark:text-slate-400 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <span className="whitespace-nowrap text-xs font-semibold text-[#64748b] dark:text-slate-400">
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
          <select
            value={limitValue}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="ml-1 h-8 rounded-lg border border-[#e6ebf2] bg-white px-2 text-xs font-bold text-[#0f172a] outline-none transition hover:border-[#cbd5e1] focus:border-[#f97316] dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
            aria-label={t("pagination.perPage")}
          >
            {[20, 50, 100].map((option) => (
              <option key={option} value={option}>
                {option} / {labels.page.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
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
      className="grid size-8 place-items-center rounded-lg text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
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
  mode,
  loading,
  open,
  onClose,
  onEdit,
  onSubmit,
}: {
  artist: ArtistProfile | null;
  mode: "view" | "edit";
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onEdit: (artist: ArtistProfile) => void;
  onSubmit: (payload: UpdateArtistPayload) => Promise<void>;
}) {
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);
  const detailTabs = getDetailTabs(labels);
  const [activeTab, setActiveTab] = useState<DetailTab>("profile");
  const [resources, setResources] = useState<Record<ResourceTab, DetailResourceState>>(
    createDetailResources,
  );
  const [scheduleDrawer, setScheduleDrawer] = useState<ScheduleDrawerState | null>(null);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const artistId = artist ? getArtistId(artist) : undefined;
  const formId = artistId ? `artist-edit-form-${artistId}` : "artist-edit-form";

  useEffect(() => {
    if (!artist) return;
    setResources(createDetailResources(true));
    if (!artistId) {
      setResources(createDetailResources(false, labels.artistIdMissing));
      return;
    }

    let ignore = false;
    const currentArtistId = artistId;

    async function loadResource<T extends object>(
      key: ResourceTab,
      request: Promise<ListResult<T>>,
    ) {
      try {
        const result = await request;
        if (ignore) return;
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
        if (ignore) return;
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
        if (ignore) return;
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
        if (ignore) return;
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

    void loadResource("services", artistServicesApi.list({ artist_id: currentArtistId }));
    void loadFinance();
    void loadResource("availability", artistAvailabilityApi.list(currentArtistId));
    void loadResource("gallery", artistGalleryApi.list({ artist_id: currentArtistId }));
    void loadResource("videos", artistVideosApi.list({ artist_id: currentArtistId }));
    void loadResource("comments", commentsApi.byArtist(currentArtistId));
    void loadResource("ratings", ratingsApi.byArtist(currentArtistId, 1, limit));

    return () => {
      ignore = true;
    };
  }, [artist, artistId, labels.artistIdMissing, labels.resourceLoadFailed]);

  const reloadServices = useCallback(async () => {
    if (!artistId) return;

    setResources((current) => ({
      ...current,
      services: {
        ...current.services,
        loading: true,
        error: null,
      },
    }));

    try {
      const result = await artistServicesApi.list({ artist_id: artistId });
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
      setResources((current) => ({
        ...current,
        services: {
          ...current.services,
          loading: false,
          error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
        },
      }));
    }
  }, [artistId, labels.resourceLoadFailed]);

  const reloadAvailability = useCallback(async () => {
    if (!artistId) return;

    setResources((current) => ({
      ...current,
      availability: {
        ...current.availability,
        loading: true,
        error: null,
      },
    }));

    try {
      const result = await artistAvailabilityApi.list(artistId);
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
    } catch (caught) {
      setResources((current) => ({
        ...current,
        availability: {
          ...current.availability,
          loading: false,
          error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
        },
      }));
    }
  }, [artistId, labels.resourceLoadFailed]);

  const reloadComments = useCallback(async () => {
    if (!artistId) return;

    setResources((current) => ({
      ...current,
      comments: {
        ...current.comments,
        loading: true,
        error: null,
      },
    }));

    try {
      const result = await commentsApi.byArtist(artistId);
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
      setResources((current) => ({
        ...current,
        comments: {
          ...current.comments,
          loading: false,
          error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
        },
      }));
    }
  }, [artistId, labels.resourceLoadFailed]);

  const reloadRatings = useCallback(async () => {
    if (!artistId) return;

    setResources((current) => ({
      ...current,
      ratings: {
        ...current.ratings,
        loading: true,
        error: null,
      },
    }));

    try {
      const result = await ratingsApi.byArtist(artistId, 1, limit);
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
      setResources((current) => ({
        ...current,
        ratings: {
          ...current.ratings,
          loading: false,
          error: caught instanceof Error ? caught.message : labels.resourceLoadFailed,
        },
      }));
    }
  }, [artistId, labels.resourceLoadFailed]);

  if (!artist) return null;

  return (
    <>
    <Drawer
      open={open}
      onClose={onClose}
      size={mode === "view" ? "min(100vw, 760px)" : "min(100vw, 560px)"}
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={adminDrawerClassNames}
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
            {mode === "edit" ? labels.editTitle : `${labels.artist} #${toDisplay(artistId)}`}
          </span>
          <ArtistHeaderBadge
            label={formatEnumValue("status", artist.status_label ?? artist.status, labels)}
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
          onResetPassword={() => setPasswordResetOpen(true)}
        />
      }
      styles={adminDrawerStyles}
    >
      <div className="space-y-3.5 p-4">
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
                    onCreate={() => setScheduleDrawer({ mode: "create", schedule: null })}
                    onOpen={(schedule) => setScheduleDrawer({ mode: "manage", schedule })}
                  />
                ) : tab.key === "gallery" ? (
                  <ArtistGalleryTab state={resources.gallery} labels={labels} />
                ) : tab.key === "videos" ? (
                  <ArtistVideosSummary artistId={artistId} state={resources.videos} />
                ) : tab.key === "comments" ? (
                  <ArtistCommentsTab
                    labels={labels}
                    state={resources.comments}
                    onChanged={reloadComments}
                  />
                ) : tab.key === "ratings" ? (
                  <ArtistRatingsTab
                    labels={labels}
                    state={resources.ratings}
                    onChanged={reloadRatings}
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
    <ScheduleManagementDrawer
      artist={artist}
      labels={labels}
      mode={scheduleDrawer?.mode ?? "manage"}
      open={Boolean(scheduleDrawer)}
      schedule={scheduleDrawer?.schedule ?? null}
      onClose={() => setScheduleDrawer(null)}
      onChanged={reloadAvailability}
    />
    {passwordResetOpen ? (
      <ArtistPasswordResetModal
        artist={artist}
        labels={labels}
        open={passwordResetOpen}
        onClose={() => setPasswordResetOpen(false)}
      />
    ) : null}
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
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const toast = useToast();
  const selectedRegionId = values.region_id;
  const profilePhotoId = values.profile_photo_id;
  const profilePhotoUrl = values.profile_photo_url;

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const [regionsResult, districtsResult, categoriesResult, servicesResult] = await Promise.all([
          regionsApi.list({ page: 1, limit: 1000 }),
          districtsApi.list({ page: 1, limit: 1000 }),
          categoriesApi.list({ page: 1, limit: 1000 }),
          servicesApi.list({ page: 1, limit: 1000 }),
        ]);
        if (ignore) return;
        setRegions(regionsResult.items);
        setDistricts(districtsResult.items);
        setCategories(categoriesResult.items);
        setServices(servicesResult.items);
      } catch {
        if (ignore) return;
        setRegions([]);
        setDistricts([]);
        setCategories([]);
        setServices([]);
      }
    }

    void loadOptions();

    return () => {
      ignore = true;
    };
  }, []);

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
    if (!values.password.trim()) nextErrors.password = labels.requiredField(labels.password);
    if (!values.category_ids) nextErrors.category_ids = labels.requiredField(labels.category);
    const servicesError = validateArtistServiceDrafts(values.services, labels);
    if (servicesError) nextErrors.services = servicesError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit(buildCreateArtistPayload(values));
  };

  return (
    <AdminDrawer
      open={open}
      title={labels.createTitle}
      onClose={onClose}
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

        <ArtistFormSection title={labels.locationInfo}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              compact
              label={labels.region}
              type="select"
              value={values.region_id}
              placeholder={labels.region}
              options={regionOptions(regions, labels)}
              onChange={(region_id) => setValues((current) => ({ ...current, region_id, district_id: "" }))}
            />
            <FormField
              compact
              label={labels.district}
              type="select"
              value={values.district_id}
              disabled={!selectedRegionId}
              placeholder={selectedRegionId ? labels.district : labels.selectRegionFirst}
              options={districtOptions(filteredDistricts, labels)}
              onChange={(district_id) => setValues((current) => ({ ...current, district_id }))}
            />
          </div>
        </ArtistFormSection>

        <ArtistFormSection title={labels.artistInfo}>
          <div className="grid gap-4">
            <FormField compact label={labels.category} type="select" required value={values.category_ids} error={errors.category_ids} placeholder={labels.categoryPlaceholder} options={categoryOptions(categories, labels)} onChange={(category_ids) => setValues((current) => ({ ...current, category_ids }))} />
            <FormField compact label={labels.bio} type="textarea" rows={4} value={values.bio} placeholder={labels.bio} onChange={(bio) => setValues((current) => ({ ...current, bio }))} />
            <ArtistPhotoField
              disabled={uploading || loading}
              error={uploadError}
              labels={labels}
              photoId={profilePhotoId}
              photoUrl={profilePhotoUrl}
              uploading={uploading}
              onFile={uploadProfilePhoto}
            />
          </div>
        </ArtistFormSection>

        <ArtistFormSection title={labels.services}>
          <ArtistServiceDraftEditor
            labels={labels}
            regions={regions}
            services={services}
            value={values.services}
            error={errors.services}
            onChange={(servicesValue) => setValues((current) => ({ ...current, services: servicesValue }))}
          />
        </ArtistFormSection>

        <ArtistFormSection title={labels.adminInfo}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField compact label={labels.adminName} value={values.administrator_name} onChange={(administrator_name) => setValues((current) => ({ ...current, administrator_name }))} />
            <FormField compact label={labels.adminPhone} type="tel" value={values.administrator_phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.administrator_phone, () => setValues((current) => ({ ...current, administrator_phone: "+998 " })))} onChange={(administrator_phone) => setValues((current) => ({ ...current, administrator_phone: formatPhoneInput(administrator_phone) }))} />
          </div>
        </ArtistFormSection>

        <ArtistFormSection title={labels.accountStatus}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField compact label={labels.password} type="password" required value={values.password} error={errors.password} placeholder={labels.password} autoComplete="new-password" onChange={(password) => setValues((current) => ({ ...current, password }))} />
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
            {labels.id}: {toDisplay(getArtistId(artist))}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatPhone(artist.phone ?? artist.extra_phone) || "—"}
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
            aria-label="Close image preview"
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
  const rawLabel = value === null || value === undefined || value === "" ? "—" : String(value);
  const normalized = normalizeEnumToken(rawLabel);
  const label = formatEnumValue(fieldKey, value, labels);
  const tone = statusTone(fieldKey, normalized, label, rawLabel, labels);
  const toneClass = {
    danger: "border-rose-400/30 bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
    neutral: "border-slate-400/30 bg-slate-50 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    success: "border-emerald-400/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    warning: "border-amber-400/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  }[tone];

  return (
    <span className={cn("inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]", toneClass)}>
      {label}
    </span>
  );
}

function ArtistDrawerActions({
  mode,
  loading,
  formId,
  onClose,
  onEdit,
  onResetPassword,
}: {
  mode: "view" | "edit";
  loading: boolean;
  formId: string;
  onClose: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
}) {
  const { t } = useI18n();
  const { locale } = useI18n();
  const labels = getArtistsLabels(locale);

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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <ArtistDrawerActionButton
        icon={<X className="size-4" />}
        label={t("actions.close")}
        onClick={onClose}
      />
      <ArtistDrawerActionButton
        icon={<KeyRound className="size-4" />}
        label={labels.resetPasswordAction}
        tone="warning"
        onClick={onResetPassword}
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

function ArtistPasswordResetModal({
  artist,
  labels,
  open,
  onClose,
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const nextPassword = password.trim();
    const artistId = getArtistId(artist);

    if (!artistId) nextErrors.password = labels.artistIdMissing;
    if (!nextPassword) nextErrors.password = labels.requiredField(labels.newPassword);
    if (nextPassword && nextPassword.length < 6) nextErrors.password = labels.passwordMinLength;
    if (nextPassword !== confirmPassword.trim()) nextErrors.confirmPassword = labels.passwordMismatch;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await staffApi.resetPassword(Number(artistId), nextPassword);
      toast.success(labels.passwordResetSuccess);
      onClose();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.passwordResetFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={labels.resetPasswordTitle}
      onCancel={onClose}
      rootClassName="artistbor-confirm-modal"
      footer={null}
      destroyOnHidden
      centered
    >
      <form className="space-y-4 pt-2" onSubmit={submit}>
        <p className="text-sm leading-5 text-slate-400">
          {labels.resetPasswordDescription(getArtistName(artist, labels))}
        </p>
        <FormField
          compact
          required
          label={labels.newPassword}
          type="password"
          value={password}
          error={errors.password}
          autoComplete="new-password"
          onChange={setPassword}
        />
        <FormField
          compact
          required
          label={labels.confirmPassword}
          type="password"
          value={confirmPassword}
          error={errors.confirmPassword}
          autoComplete="new-password"
          onChange={setConfirmPassword}
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="artistbor-modal-action artistbor-modal-action--neutral text-sm font-bold"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="artistbor-modal-action artistbor-modal-action--warning text-sm font-bold"
          >
            {submitting ? labels.saving : labels.resetPasswordAction}
          </button>
        </div>
      </form>
    </Modal>
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
    { icon: <User className="size-4" />, label: labels.fullName, value: getArtistName(artist, labels), always: true },
    { icon: <Phone className="size-4" />, label: labels.phone, value: formatPhone(artist.phone ?? artist.extra_phone), always: true },
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
  const hasAdmin = hasMeaningfulValue(artist.administrator_name) || hasMeaningfulValue(artist.administrator_phone || artist.extra_phone);
  const hasBio = hasMeaningfulValue(artist.bio);
  const additionalEntries = additionalArtistEntries(artist);

  return (
    <div className="space-y-3">
      <ArtistSection title={labels.mainInfo}>
        <ArtistInfoGrid artist={artist} labels={labels} />
      </ArtistSection>
      <ArtistStatsSection artist={artist} labels={labels} />
      {hasAdmin ? (
        <ArtistSection title={labels.administrator}>
          <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
            {hasMeaningfulValue(artist.administrator_name) ? (
              <ArtistInfoCell icon={<User className="size-4" />} label={labels.adminName} value={artist.administrator_name} />
            ) : null}
            {hasMeaningfulValue(artist.administrator_phone || artist.extra_phone) ? (
              <ArtistInfoCell icon={<Phone className="size-4" />} label={labels.adminPhone} value={formatPhone(artist.administrator_phone || artist.extra_phone)} />
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
      {additionalEntries.length ? (
        <ArtistSection title={labels.additionalInfo}>
          <ProfileData entries={additionalEntries} labels={labels} />
        </ArtistSection>
      ) : null}
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
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const toast = useToast();
  const selectedRegionId = values.region_id;
  const profilePhotoId = values.profile_photo_id;
  const profilePhotoUrl = values.profile_photo_url;

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const [regionsResult, districtsResult, categoriesResult, artistServicesResult, servicesResult] = await Promise.all([
          regionsApi.list({ page: 1, limit: 1000 }),
          districtsApi.list({ page: 1, limit: 1000 }),
          categoriesApi.list({ page: 1, limit: 1000 }),
          artistServiceLookupId ? artistServicesApi.list({ artist_id: artistServiceLookupId }) : Promise.resolve({ items: [] }),
          servicesApi.list({ page: 1, limit: 1000 }),
        ]);
        if (ignore) return;
        setRegions(regionsResult.items);
        setDistricts(districtsResult.items);
        setCategories(categoriesResult.items);
        setValues((current) => {
          if (current.category_ids) return current;
          const categoryId = inferCategoryIdFromArtistServices(
            artistServicesResult.items,
            servicesResult.items,
          );
          return categoryId ? { ...current, category_ids: categoryId } : current;
        });
      } catch {
        if (ignore) return;
        setRegions([]);
        setDistricts([]);
        setCategories([]);
      }
    }

    void loadOptions();

    return () => {
      ignore = true;
    };
  }, [artistServiceLookupId]);

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
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit(buildArtistPayload(values));
  };

  return (
    <form
      id={formId}
      onSubmit={submit}
      className="space-y-6"
    >
      <ArtistFormSection hideTitle title={labels.mainInfo}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField compact label={labels.firstName} required value={values.first_name} error={errors.first_name} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
          <FormField compact label={labels.lastName} value={values.last_name} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
          <FormField compact label={labels.gender} type="select" value={values.gender} placeholder={labels.gender} options={genderOptions(labels)} onChange={(gender) => setValues((current) => ({ ...current, gender }))} />
          <FormField compact label={labels.birthDate} type="date" value={values.birth_date} onChange={(birth_date) => setValues((current) => ({ ...current, birth_date }))} />
        </div>
      </ArtistFormSection>

      <ArtistFormSection hideTitle title={labels.contactInfo}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField compact label={labels.phone} required type="tel" value={values.phone} error={errors.phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.phone, () => setValues((current) => ({ ...current, phone: "+998 " })))} onChange={(phone) => setValues((current) => ({ ...current, phone: formatPhoneInput(phone) }))} />
          <FormField compact label={labels.extraPhone} type="tel" value={values.extra_phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.extra_phone, () => setValues((current) => ({ ...current, extra_phone: "+998 " })))} onChange={(extra_phone) => setValues((current) => ({ ...current, extra_phone: formatPhoneInput(extra_phone) }))} />
          <FormField compact className="md:col-span-2" label={labels.email} value={values.email} placeholder="name@example.com" onChange={(email) => setValues((current) => ({ ...current, email }))} />
        </div>
      </ArtistFormSection>

      <ArtistFormSection hideTitle title={labels.locationInfo}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            compact
            label={labels.region}
            type="select"
            value={values.region_id}
            placeholder={labels.region}
            options={regionOptions(regions, labels)}
            onChange={(region_id) => setValues((current) => ({ ...current, region_id, district_id: "" }))}
          />
          <FormField
            compact
            label={labels.district}
            type="select"
            value={values.district_id}
            disabled={!selectedRegionId}
            placeholder={selectedRegionId ? labels.district : labels.selectRegionFirst}
            options={districtOptions(filteredDistricts, labels)}
            onChange={(district_id) => setValues((current) => ({ ...current, district_id }))}
          />
        </div>
      </ArtistFormSection>

      <ArtistFormSection hideTitle title={labels.artistInfo}>
        <div className="grid gap-4">
          <FormField compact label={labels.category} type="select" value={values.category_ids} placeholder={labels.categoryPlaceholder} options={categoryOptions(categories, labels)} onChange={(category_ids) => setValues((current) => ({ ...current, category_ids }))} />
          <FormField compact label={labels.bio} type="textarea" rows={4} value={values.bio} placeholder={labels.bio} onChange={(bio) => setValues((current) => ({ ...current, bio }))} />
          <ArtistPhotoField
            disabled={uploading}
            error={uploadError}
            labels={labels}
            photoId={profilePhotoId}
            photoUrl={profilePhotoUrl}
            uploading={uploading}
            onFile={uploadProfilePhoto}
          />
        </div>
      </ArtistFormSection>

      <ArtistFormSection hideTitle title={labels.adminInfo}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField compact label={labels.adminName} value={values.administrator_name} onChange={(administrator_name) => setValues((current) => ({ ...current, administrator_name }))} />
          <FormField compact label={labels.adminPhone} type="tel" value={values.administrator_phone} placeholder="+998 XX XXX XX XX" onFocus={() => applyPhonePrefix(values.administrator_phone, () => setValues((current) => ({ ...current, administrator_phone: "+998 " })))} onChange={(administrator_phone) => setValues((current) => ({ ...current, administrator_phone: formatPhoneInput(administrator_phone) }))} />
        </div>
      </ArtistFormSection>

      <ArtistFormSection hideTitle title={labels.accountStatus}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField compact label={labels.status} type="select" value={values.status} options={artistStatusOptions(labels)} onChange={(status) => setValues((current) => ({ ...current, status }))} />
          <FormField compact label={labels.cardLastFour} value={values.card_last_four} placeholder="0000" onChange={(card_last_four) => setValues((current) => ({ ...current, card_last_four }))} />
          <FormField compact className="md:col-span-2" label={labels.cardToken} value={values.card_token} placeholder={labels.cardToken} onChange={(card_token) => setValues((current) => ({ ...current, card_token }))} />
          <ArtistToggleField label={labels.verified} checked={values.is_verified} labels={labels} onChange={(is_verified) => setValues((current) => ({ ...current, is_verified }))} />
          <ArtistToggleField label={labels.topArtist} checked={values.is_top} labels={labels} onChange={(is_top) => setValues((current) => ({ ...current, is_top }))} />
        </div>
      </ArtistFormSection>
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
    <label className="block">
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
  return categories.map((category) => ({
    label: getLocalizedEntityName(category, labels.locale),
    value: String(category.id ?? ""),
  }));
}

function serviceOptions(services: Service[], labels: ArtistsLabels): FormFieldOption[] {
  return services.map((service) => ({
    label: getLocalizedEntityName(service, labels.locale),
    value: String(service.id ?? ""),
  }));
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
    birth_date: stringRecordValue(profile, "birth_date") ?? artist.birth_date ?? "",
    gender: normalizedGender(stringRecordValue(profile, "gender") ?? artist.gender),
    category_ids: artistCategoryValue(artist),
    bio: stringRecordValue(artistProfile, "bio") ?? artist.bio ?? stringRecordValue(profile, "bio") ?? "",
    extra_phone: formatPhoneInput(stringRecordValue(artistProfile, "extra_phone") ?? artist.extra_phone),
    administrator_name: stringRecordValue(artistProfile, "administrator_name") ?? artist.administrator_name ?? "",
    administrator_phone: formatPhoneInput(stringRecordValue(artistProfile, "administrator_phone") ?? artist.administrator_phone),
    card_last_four: stringRecordValue(artistProfile, "card_last_four") ?? artist.card_last_four ?? "",
    card_token: stringRecordValue(artistProfile, "card_token") ?? artist.card_token ?? "",
    profile_photo_id: profilePhotoId === undefined ? "" : String(profilePhotoId),
    profile_photo_url: getArtistPhotoUrl(artist) ?? "",
    is_verified: booleanRecordValue(artistProfile, "is_verified") ?? Boolean(artist.is_verified),
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
    artistProfile?.categories,
    artistProfile?.category,
    artistProfile?.category_ids,
    artistProfile?.category_id,
  ];

  for (const candidate of candidates) {
    const value = firstCategoryId(candidate);
    if (value) return value;
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
  return value === "male" || value === "female" ? value : "";
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
      <div className="rounded-2xl border border-dashed border-[#E5EAF2] bg-white p-5 text-center dark:border-white/10 dark:bg-transparent">
        <PlayCircle className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{labels.videosEmptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {labels.noVideoHint}
        </p>
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
          {labels.viewInTable}
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

function ArtistGalleryTab({ state, labels }: { state: DetailResourceState; labels: ArtistsLabels }) {
  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.gallery)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const galleryItems = rows
    .map((row, index) => galleryItemFromRecord(row, index, labels))
    .filter((item) => item.imageUrl || item.linkUrl || item.title);

  if (!galleryItems.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5EAF2] bg-white p-5 text-center dark:border-white/10 dark:bg-transparent">
        <ImagePlus className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{labels.galleryEmptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {labels.galleryEmptyDescription}
        </p>
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
        {state.meta ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
            {labels.page} {state.meta.currentPage ?? state.meta.page ?? 1} / {state.meta.pageCount ?? "—"}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {galleryItems.map((item) => (
          <GalleryPreviewCard key={item.key} item={item} labels={labels} />
        ))}
      </div>
    </div>
  );
}

function ArtistCommentsTab({
  labels,
  onChanged,
  state,
}: {
  labels: ArtistsLabels;
  onChanged: () => Promise<void>;
  state: DetailResourceState;
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
          await onChanged();
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
      await onChanged();
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
            onDelete={() => void runCommentAction("delete", item)}
            onEdit={() => setDialog({ mode: "edit", item })}
            onPublish={() => void runCommentAction("publish", item)}
            onUnpublish={() => void runCommentAction("unpublish", item)}
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
}: {
  item: CommentItemView;
  labels: ArtistsLabels;
  onDelete: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
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
            {item.id !== undefined ? <span>ID {toDisplay(item.id)}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
            aria-label={labels.editComment}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={canPublish ? onPublish : onUnpublish}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
            aria-label={canPublish ? labels.publishComment : labels.unpublishComment}
          >
            {canPublish ? <CheckCircle2 className="size-4" /> : <X className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
            aria-label={labels.deleteComment}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
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
}: {
  labels: ArtistsLabels;
  onChanged: () => Promise<void>;
  state: DetailResourceState;
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
          await onChanged();
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
              onDelete={() => handleDelete(item)}
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
}: {
  item: RatingItemView;
  labels: ArtistsLabels;
  onDelete: () => void;
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
            {item.id !== undefined ? <span>ID {toDisplay(item.id)}</span> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
          aria-label={labels.deleteRating}
        >
          <Trash2 className="size-4" />
        </button>
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
  id?: unknown;
  imageUrl: string;
  imageUrlCandidates: string[];
  linkUrl: string;
  title: string;
  subtitle: string;
  status?: unknown;
  createdAt?: unknown;
};

function GalleryPreviewCard({ item, labels }: { item: GalleryItemView; labels: ArtistsLabels }) {
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
            <LocalizedStatusBadge fieldKey="status" labels={labels} value={item.status} />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.id !== undefined ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              ID {toDisplay(item.id)}
            </span>
          ) : null}
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
}: {
  artistId?: number;
  state: DetailResourceState;
  labels: ArtistsLabels;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [formMode, setFormMode] = useState<ArtistServiceFormMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnknownRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
  }, []);

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
      await onChanged();
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
      await onChanged();
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
        <button
          type="button"
          onClick={() => setFormMode({ type: "assign" })}
          className={adminPrimaryActionButtonClass}
        >
          <Plus className="size-4" />
          {labels.assignService}
        </button>
      </div>

      {formMode ? (
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
              onDelete={() => setDeleteTarget(service)}
              onEdit={() => setFormMode({ type: "edit", service })}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={labels.notFoundTitle(labels.services)} />
      )}

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
}: {
  service: UnknownRecord;
  labels: ArtistsLabels;
  regions: Region[];
  regionsLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const title = getArtistServiceTitle(service, labels);
  const description = getArtistServiceDescription(service);
  const chips = getArtistServiceChips(service, labels);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:hover:border-amber-400/30 dark:hover:bg-white/[0.03]">
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
          <LocalizedStatusBadge fieldKey="status" labels={labels} value={service.status} />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e6ebf2] bg-white px-2.5 text-xs font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          <Pencil className="size-3.5" />
          {labels.editArtistService}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#fecaca] bg-white px-2.5 text-xs font-bold text-[#f43f5e] transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-white/[0.03] dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="size-3.5" />
          {labels.deleteArtistService}
        </button>
      </div>
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
          suffix={MONEY_CURRENCY_LABEL}
          onChange={(price) => setValues((current) => ({ ...current, price: parseMoneyInput(price) }))}
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
                  suffix={MONEY_CURRENCY_LABEL}
                  onChange={(price) => updateDraft(draft.localId, { price: parseMoneyInput(price) })}
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
      ) : (
        <p className="rounded-[10px] mt-3 border border-dashed border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#64748b] dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
          {labels.regionPricesEmpty}
        </p>
      )}
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
    <div className="mt-3 rounded-[10px] border border-[#e6ebf2] bg-[#f8fafc] p-3 dark:border-white/10 dark:bg-white/[0.03]">
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
            <div key={row.localId} className="grid gap-2 rounded-[10px] border border-[#e6ebf2] bg-white p-2 md:grid-cols-[minmax(0,1fr)_minmax(120px,160px)_auto] dark:border-white/10 dark:bg-slate-950">
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
                suffix={MONEY_CURRENCY_LABEL}
                onChange={(price) => updateRow(row.localId, { price: parseMoneyInput(price) })}
              />
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
  editing?: boolean;
};

function ArtistServiceRegionPrices({
  labels,
  regions,
  regionsLoading,
  service,
}: {
  labels: ArtistsLabels;
  regions: Region[];
  regionsLoading: boolean;
  service: UnknownRecord;
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
    if (!Number.isFinite(regionId) || regionId <= 0) {
      setRowErrors((current) => ({ ...current, [row.localId]: labels.regionPriceRegionRequired }));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setRowErrors((current) => ({ ...current, [row.localId]: labels.regionPricePriceRequired }));
      return;
    }

    setSavingRow(row.localId);
    try {
      const savedRecord = await artistServicesApi.upsertRegionPrice(serviceId, {
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
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e6ebf2] bg-white px-2.5 text-xs font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          <Plus className="size-3.5" />
          {labels.add}
        </button>
      </div>

      {rows.length ? (
        <div className="mt-3 space-y-2">
          {rows.map((row) => {
            const saved = savedRow === row.localId;
            const saving = savingRow === row.localId;
            const deleting = deletingRow === row.localId;
            const editing = row.editing || !row.id;
            const disabled = saving || deleting || saved;
            const options = regionPriceOptions(regions, row, labels);
            return (
              <div key={row.localId} className="rounded-[10px] border border-[#e6ebf2] bg-white p-2 dark:border-white/10 dark:bg-slate-950">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(120px,160px)_auto]">
                  <label className="block">
                    <span className="sr-only">{labels.region}</span>
                    <select
                      disabled={disabled || regionsLoading || !editing}
                      value={row.region_id}
                      onChange={(event) => updateRow(row.localId, { region_id: event.target.value })}
                      className="artistbor-table-filter-control h-10 w-full rounded-xl border border-[#e6ebf2] bg-[#f8fafc] px-3 text-[13px] font-bold text-[#475569] shadow-none outline-none transition focus:border-orange-500/45 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-200"
                    >
                      <option value="">{labels.region}</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                      className="artistbor-table-filter-control h-10 w-full rounded-xl border border-[#e6ebf2] bg-[#f8fafc] px-3 pr-14 text-[13px] font-bold text-[#475569] shadow-none outline-none transition focus:border-orange-500/45 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-200"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94a3b8] dark:text-slate-500">
                      {MONEY_CURRENCY_LABEL}
                    </span>
                  </label>
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
          value={formatMoneyWithCurrency(balance.balance ?? balance.current_balance ?? 0, labels.locale) || "—"}
        />
        <ArtistFinanceMetric
          label={labels.debt}
          value={formatMoneyWithCurrency(balance.debt ?? balance.current_debt ?? 0, labels.locale) || "—"}
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
  const metaItems = [
    balanceBefore !== undefined
      ? `${labels.balanceBefore}: ${formatMoneyWithCurrency(balanceBefore, labels.locale) || toDisplay(balanceBefore)}`
      : "",
    balanceAfter !== undefined
      ? `${labels.balanceAfter}: ${formatMoneyWithCurrency(balanceAfter, labels.locale) || toDisplay(balanceAfter)}`
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
            {formatMoneyWithCurrency(amount, labels.locale) || toDisplay(amount)}
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
  onCreate,
  onOpen,
}: {
  artist: ArtistProfile;
  state: DetailResourceState;
  labels: ArtistsLabels;
  onCreate: () => void;
  onOpen: (schedule: UnknownRecord) => void;
}) {
  const { locale } = useI18n();

  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.availability)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const schedules = scheduleRecordsFromState(state, artist);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.availability}</h4>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
            {labels.scheduleRecordCount(schedules.length)}
          </span>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className={adminPrimaryActionButtonClass}
        >
          <Plus className="size-4" />
          {labels.add}
        </button>
      </div>

      {schedules.length ? (
        <div className="space-y-3">
          {schedules.map((schedule, index) => (
            <ScheduleCompactCard
              key={String(resourceRowKey(schedule, index))}
              labels={labels}
              locale={locale}
              schedule={schedule}
              onOpen={() => onOpen(schedule)}
            />
          ))}
        </div>
      ) : (
        <ScheduleEmptyState labels={labels} onAdd={onCreate} />
      )}
    </div>
  );
}

function ScheduleCompactCard({
  schedule,
  labels,
  locale,
  onOpen,
}: {
  schedule: UnknownRecord;
  labels: ArtistsLabels;
  locale: Locale;
  onOpen: () => void;
}) {
  const availabilityRows = availabilityRowsFromSchedule(schedule, labels);
  const status = getScheduleStatus(schedule, labels);

  return (
    <article className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-transparent">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            {formatScheduleRange(schedule, locale)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {availabilityRows.length
              ? labels.busyDaysCount(countBusyDays(availabilityRows))
              : scheduleAvailabilitySummary(schedule, labels)}
          </p>
        </div>
        <ArtistHeaderBadge label={status.label} tone={status.tone} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
        >
          <CalendarPlus className="size-4" />
          {labels.manage}
        </button>
        <button
          type="button"
          className="grid size-9 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05]"
          aria-label={labels.moreActions}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </article>
  );
}

function ScheduleManagementDrawer({
  artist,
  labels,
  mode,
  open,
  schedule,
  onClose,
  onChanged,
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
  mode: "manage" | "create";
  open: boolean;
  schedule: UnknownRecord | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const [busySlotDialog, setBusySlotDialog] = useState<BusySlotDialogState>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectedSchedule = schedule ?? getDefaultScheduleRecord(artist);
  const availabilityRows = availabilityRowsFromSchedule(selectedSchedule, labels);
  const status = getScheduleStatus(selectedSchedule, labels, mode);
  const rawAvailability = getRawAvailabilityPreview(selectedSchedule, labels);
  const dirty = false;
  const artistId = getArtistId(artist);

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
          await onChanged();
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

    const payload = buildBusySlotPayload(values);
    setSubmitting(true);
    try {
      if (currentDialog.mode === "edit") {
        const slotId = getAvailabilityRowId(currentDialog.row);
        if (!slotId) {
          toast.error(labels.busySlotIdMissing);
          return;
        }
        await artistAvailabilityApi.deleteBusySlot(slotId);
        await artistAvailabilityApi.createBusySlot(artistId, payload);
        toast.success(labels.busySlotUpdated);
      } else {
        await artistAvailabilityApi.createBusySlot(artistId, payload);
        toast.success(labels.busySlotCreated);
      }

      setBusySlotDialog(null);
      await onChanged();
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
        maskClosable={!dirty}
        open={open}
        onClose={onClose}
        placement="right"
        size="min(100vw, 1180px)"
        closeIcon={<X className="size-5" />}
        rootClassName="artistbor-application-drawer"
        classNames={adminDrawerClassNames}
        title={
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
                {labels.scheduleManagementTitle}
              </span>
              <ArtistHeaderBadge label={status.label} tone={status.tone} />
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {getArtistName(artist, labels)} · {formatPhone(artist.phone ?? artist.extra_phone) || "—"}
            </p>
          </div>
        }
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-bold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
            >
              <X className="size-4" />
              {t("actions.close")}
            </button>
            <button
              type="button"
              onClick={() => setBusySlotDialog({ mode: "create" })}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
            >
              <Save className="size-4" />
              {labels.addAvailability}
            </button>
          </div>
        }
        styles={adminDrawerSubtitleStyles}
      >
        <div className="bg-slate-50/60 p-4 dark:bg-[#0f172a]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <ScheduleDetailsCard labels={labels} locale={locale} schedule={selectedSchedule} />
              <AvailabilityRows
                labels={labels}
                rows={availabilityRows}
                onAdd={() => setBusySlotDialog({ mode: "create" })}
                onDelete={handleDeleteBusySlot}
                onEdit={(row) => setBusySlotDialog({ mode: "edit", row })}
              />
              {rawAvailability ? (
                <details className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
                  <summary className="cursor-pointer text-sm font-bold text-slate-950 dark:text-white">
                    {labels.rawAvailability}
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                    {rawAvailability}
                  </pre>
                </details>
              ) : null}
            </div>

            <aside className="min-w-0 space-y-4">
              <ScheduleCalendarPreview
                labels={labels}
                locale={locale}
                rows={availabilityRows}
                schedule={selectedSchedule}
                onAddDate={(date) => setBusySlotDialog({ mode: "create", date })}
                onEditRow={(row) => setBusySlotDialog({ mode: "edit", row })}
              />
              <ScheduleQuickInfoCard labels={labels} rows={availabilityRows} schedule={selectedSchedule} />
            </aside>
          </div>
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
            <p className="artistbor-busy-slot-modal__subtitle">Kuni va vaqt oralig&apos;ini belgilang</p>
          </div>
        </div>
      }
      footer={null}
      styles={{
        body: { padding: 0 },
        mask: { backgroundColor: "rgba(2, 6, 23, 0.76)" },
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
          type="textarea"
          rows={4}
          maxLength={200}
          showCount
          placeholder="Masalan: Zal band, texnik ish yoki xususiy tadbir..."
          className="artistbor-busy-slot-field"
          inputClassName="artistbor-busy-slot-textarea"
          value={values.reason}
          onChange={(reason) => setValues((current) => ({ ...current, reason }))}
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

function ScheduleDetailsCard({
  labels,
  locale,
  schedule,
}: {
  labels: ArtistsLabels;
  locale: Locale;
  schedule: UnknownRecord;
}) {
  const rows: [string, unknown][] = [
    [labels.dateFrom, toDisplay(schedule.date_from)],
    [labels.dateTo, toDisplay(schedule.date_to)],
    [labels.busyDays, scheduleAvailabilitySummary(schedule, labels)],
  ];

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.scheduleDetails}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatScheduleRange(schedule, locale)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-slate-50 p-3 dark:bg-[#121a2a]">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
              {toDisplay(value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AvailabilityRows({
  labels,
  onAdd,
  onDelete,
  onEdit,
  rows,
}: {
  labels: ArtistsLabels;
  onAdd: () => void;
  onDelete: (row: AvailabilityRow) => void;
  onEdit: (row: AvailabilityRow) => void;
  rows: AvailabilityRow[];
}) {
  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.availabilityList}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
        >
          <Plus className="size-4" />
          {labels.addAvailability}
        </button>
      </div>

      {rows.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
          <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_auto] gap-3 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400 dark:bg-white/[0.04] sm:grid">
            <span>{labels.date}</span>
            <span>{labels.time}</span>
            <span>{labels.status}</span>
            <span>{labels.actions}</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {rows.map((row, index) => (
              <div
                key={`${row.date}-${row.time}-${index}`}
                className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[1.1fr_1fr_0.9fr_auto] sm:items-center sm:gap-3"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-500 sm:hidden">{labels.date}</p>
                  <p className="font-semibold text-slate-950 dark:text-white">{row.date}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 sm:hidden">{labels.time}</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.time}</p>
                </div>
                <div>
                  <ArtistHeaderBadge label={row.statusLabel} tone={row.tone} />
                </div>
                <div className="flex gap-1.5 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                    aria-label={labels.editBusySlot}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    aria-label={labels.deleteBusySlotTitle}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ScheduleEmptyState labels={labels} onAdd={onAdd} />
      )}
    </section>
  );
}

function ScheduleCalendarPreview({
  labels,
  locale,
  onAddDate,
  onEditRow,
  rows,
  schedule,
}: {
  labels: ArtistsLabels;
  locale: Locale;
  onAddDate: (date: string) => void;
  onEditRow: (row: AvailabilityRow) => void;
  rows: AvailabilityRow[];
  schedule: UnknownRecord;
}) {
  const start = parseDateOnly(schedule.date_from);
  const end = parseDateOnly(schedule.date_to);
  const busyRowsByDate = new Map<string, AvailabilityRow>();
  rows
    .filter((row) => row.tone !== "success")
    .forEach((row) => {
      if (!busyRowsByDate.has(row.date)) busyRowsByDate.set(row.date, row);
    });

  if (!start) {
    return (
      <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
        <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.calendarPreview}</h3>
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">—</p>
      </section>
    );
  }

  const days = calendarDaysForMonth(start);
  const rangeEnd = end ?? start;

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.calendarPreview}</h3>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{monthTitle(start, locale)}</p>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
        {labels.weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = dateKey(day);
          const inRange = day >= start && day <= rangeEnd;
          const busyRow = busyRowsByDate.get(key);
          const busy = Boolean(busyRow);
          return (
            <button
              key={key}
              type="button"
              aria-disabled={busy || !inRange}
              title={busy ? labels.editBusySlot : labels.addAvailability}
              onClick={() => {
                if (!inRange) return;
                if (busyRow) {
                  onEditRow(busyRow);
                  return;
                }
                onAddDate(key);
              }}
              className={cn(
                "group relative grid aspect-square place-items-center rounded-lg text-xs font-semibold transition",
                day.getMonth() !== start.getMonth() ? "text-slate-300 dark:text-slate-600" : "text-slate-700 dark:text-slate-200",
                inRange && !busy && "cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/15",
                !inRange && "cursor-not-allowed opacity-50",
                busy && "cursor-not-allowed border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300 dark:hover:bg-rose-400/15",
              )}
            >
              <span className={cn(busy && "transition group-hover:opacity-0")}>{day.getDate()}</span>
              {busy ? (
                <Pencil className="absolute size-3.5 opacity-0 transition group-hover:opacity-100" />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ScheduleQuickInfoCard({
  labels,
  rows,
  schedule,
}: {
  labels: ArtistsLabels;
  rows: AvailabilityRow[];
  schedule: UnknownRecord;
}) {
  const items: [string, unknown][] = [
    [labels.totalDays, countTotalDays(schedule) || "—"],
    [labels.busyDays, countBusyDays(rows)],
  ];

  if (hasMeaningfulValue(schedule.created_at)) {
    items.push([labels.createdAt, formatDisplayValue("created_at", schedule.created_at, labels)]);
  }

  if (hasMeaningfulValue(schedule.updated_at)) {
    items.push([labels.updatedAt, formatDisplayValue("updated_at", schedule.updated_at, labels)]);
  }

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.quickInfo}</h3>
      <div className="mt-4 grid gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-sm font-bold text-slate-950 dark:text-white">{toDisplay(value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScheduleEmptyState({
  labels,
  onAdd,
}: {
  labels: ArtistsLabels;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E5EAF2] bg-white p-5 text-center dark:border-white/10 dark:bg-transparent">
      <ListChecks className="size-8 text-amber-400" />
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{labels.noAvailabilityData}</p>
      <button
        type="button"
        onClick={onAdd}
        className={adminPrimaryActionButtonClass}
      >
        <Plus className="size-4" />
        {labels.addAvailability}
      </button>
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
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10",
        entries.length > 1 && "md:grid-cols-2",
      )}
    >
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
  "artist_profile",
  "is_top",
  "is_verified",
  "bio",
  "rating",
  "fans_count",
  "albums_count",
  "administrator_name",
  "administrator_phone",
]);

const nestedDisplayedArtistFields = new Set([
  "id",
  "user_id",
  "artist_id",
  "first_name",
  "last_name",
  "full_name",
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
  "artist_profile",
  "is_top",
  "is_verified",
  "bio",
  "rating",
  "fans_count",
  "albums_count",
  "administrator_name",
  "administrator_phone",
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
  const serviceId = firstMeaningfulValue(service, ["service_id"]);
  const price = firstMeaningfulValue(service, ["price", "amount"]);
  const duration = firstMeaningfulValue(service, ["duration_minutes", "duration"]);
  const priceText = formatMoneyWithCurrency(price, labels.locale);

  if (serviceId) chips.push(`ID ${toDisplay(serviceId)}`);
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
      id,
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
    `${labels.galleryItem} #${toDisplay(record.id ?? index + 1)}`;
  const subtitle = [
    firstStringValue(source, ["type", "mime_type", "category"]),
    firstStringValue(source, ["description", "comment"]),
  ].filter(Boolean).join(" · ");

  return {
    key: String(resourceRowKey(record, index)),
    id: record.id,
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
    `${labels.videoItem} #${toDisplay(record.id ?? record.video_id ?? index + 1)}`;
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
      reason: state.row.reason,
    };
  }

  return {
    date: normalizeDateInput(state?.date) || formatDateInputValue(new Date()),
    start_time: "09:00",
    end_time: "12:00",
    reason: "",
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

function buildBusySlotPayload(values: BusySlotFormValues): ArtistBusySlotPayload {
  const payload: ArtistBusySlotPayload = {
    date: values.date,
    time_from: values.start_time,
    time_to: values.end_time,
  };
  const reason = values.reason.trim();
  if (reason) payload.reason = reason;
  return payload;
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
  reason: string;
  startTime: string;
  time: string;
  statusLabel: string;
  tone: "danger" | "neutral" | "success" | "warning";
  raw: UnknownRecord;
};

function scheduleRecordsFromState(state: DetailResourceState, artist: ArtistProfile) {
  if (isRecord(state.raw)) {
    if (isScheduleRecord(state.raw)) return [state.raw];

    const direct = firstResourceArray(state.raw);
    if (direct.length) return direct;
  }

  if (state.rows.length) return [{ artist_id: getArtistId(artist), availability: state.rows }];

  return [];
}

function isScheduleRecord(record: UnknownRecord) {
  return ["artist_id", "date_from", "date_to", "availability"].some((key) => key in record);
}

function firstResourceArray(record: UnknownRecord) {
  const value = Object.entries(record).find(([key, item]) => !isMetaKey(key) && Array.isArray(item))?.[1];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function availabilityRowsFromSchedule(schedule: UnknownRecord, labels: ArtistsLabels): AvailabilityRow[] {
  const availability = schedule.availability;

  if (Array.isArray(availability)) {
    return availability.flatMap((item) => (isRecord(item) ? [availabilityRowFromRecord(item, labels)] : []));
  }

  if (isRecord(availability)) {
    if (looksLikeAvailabilityRow(availability)) return [availabilityRowFromRecord(availability, labels)];

    return Object.entries(availability).flatMap(([group, value]) => {
      if (Array.isArray(value)) {
        return value.flatMap((item) =>
          isRecord(item) ? [availabilityRowFromRecord({ ...item, group }, labels)] : [],
        );
      }
      if (isRecord(value)) return [availabilityRowFromRecord({ ...value, group }, labels)];
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
  const reason = firstMeaningfulValue(record, ["reason", "comment", "notes", "description"]);
  const status = availabilityStatus(record, labels);
  const startTime = start ? String(start) : "";
  const endTime = end ? String(end) : "";

  return {
    id,
    date: String(date ?? group ?? "—"),
    endTime,
    reason: reason ? String(reason) : "",
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

function getScheduleStatus(schedule: UnknownRecord, labels: ArtistsLabels, mode: "manage" | "create" = "manage") {
  if (mode === "create") return { label: labels.scheduleStatusDraft, tone: "warning" as const };
  const normalized = String(schedule.status ?? schedule.status_label ?? "").toLowerCase();
  if (normalized.includes("delete") || normalized.includes("deleted")) return { label: labels.deletedStatus, tone: "danger" as const };
  return { label: labels.scheduleStatusActive, tone: "success" as const };
}

function scheduleAvailabilitySummary(schedule: UnknownRecord, labels: ArtistsLabels) {
  const rows = availabilityRowsFromSchedule(schedule, labels);
  if (rows.length) return labels.busyDaysCount(countBusyDays(rows));
  if ("availability" in schedule) return labels.noAvailabilityData;
  return "—";
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

function monthTitle(date: Date, locale: Locale) {
  const title = formatHumanDate(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10), locale);
  return title.replace(/^01\s+/, "");
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
            {row.id !== undefined ? (
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300">
                ID {toDisplay(row.id)}
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
            className="overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10"
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
    <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className={cn(
            "min-w-0 bg-slate-50 p-3 dark:bg-[#121a2a]",
            isArtistProfileFinance && key === "balance" && "sm:col-span-2",
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
  return "card_last_four" in record && "balance" in record && "debt" in record;
}

function objectDetailSortWeight(key: string, isArtistProfileFinance: boolean) {
  if (!isArtistProfileFinance) return 100;
  if (key === "card_last_four") return 10;
  if (key === "debt") return 20;
  if (key === "balance") return 30;
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
      [tab]: { loading, error, rows: [] },
    }),
    {} as Record<ResourceTab, DetailResourceState>,
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
    if (normalized === "0") return labels.deletedStatus;
    if (normalized === "9") return labels.statusValueLabels.inactive;
    if (normalized === "10") return labels.statusValueLabels.active;
    if (normalized === "20") return labels.statusValueLabels.blocked;
    if (normalized === "1") return labels.statusValueLabels.active;
  }

  return labels.statusValueLabels[normalized] ?? raw;
}

function normalizeEnumToken(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function statusTone(
  fieldKey: string,
  normalized: string,
  label: string,
  rawLabel: string,
  labels: ArtistsLabels,
): "danger" | "neutral" | "success" | "warning" {
  if (rawLabel === "—") return "neutral";

  if (fieldKey.startsWith("is_") || normalized === "true" || normalized === "false") {
    return normalized === "true" || normalized === "1" ? "success" : "neutral";
  }

  const localized = normalizeEnumToken(label);
  const successTokens = [
    "active",
    "approved",
    "confirmed",
    "completed",
    "accepted",
    "published",
    "faol",
    "tasdiqlangan",
    "qabul qilingan",
    "активно",
    "активный",
    "подтвержден",
    "подтверждено",
    "принято",
    "опубликовано",
    normalizeEnumToken(labels.yes),
  ];
  const dangerTokens = [
    "reject",
    "cancel",
    "delete",
    "deleted",
    "blocked",
    "rad etilgan",
    "bekor qilingan",
    "o'chirilgan",
    "отклонено",
    "отменено",
    "удалено",
    "заблокировано",
  ];
  const neutralTokens = [
    "inactive",
    "unknown",
    "nofaol",
    "noma'lum",
    "неактивно",
    "неизвестно",
    normalizeEnumToken(labels.no),
  ];

  if (dangerTokens.some((token) => normalized.includes(token) || localized.includes(token)) || normalized === "0") {
    return "danger";
  }
  if (successTokens.some((token) => normalized.includes(token) || localized.includes(token)) || normalized === "1" || normalized === "10" || normalized === "20") {
    return "success";
  }
  if (neutralTokens.some((token) => normalized.includes(token) || localized.includes(token))) {
    return "neutral";
  }
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
  return artist.full_name || fromParts || artist.administrator_name || `${labels.artist} #${getArtistId(artist) ?? "—"}`;
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
  birth_date: string;
  gender: string;
  category_ids: string;
  bio: string;
  extra_phone: string;
  administrator_name: string;
  administrator_phone: string;
  card_last_four: string;
  card_token: string;
  profile_photo_id: string;
  is_verified: boolean;
  is_top: boolean;
}) {
  const payload: UpdateArtistPayload = {};
  assignUpdateString(payload, "first_name", values.first_name);
  assignUpdateString(payload, "last_name", values.last_name);
  assignUpdatePhone(payload, "phone", values.phone);
  assignUpdateString(payload, "email", values.email);
  assignUpdateNumber(payload, "status", values.status);
  const categoryIds = parseIdList(values.category_ids);
  if (categoryIds.length) payload.category_ids = categoryIds;
  assignUpdateString(payload, "bio", values.bio);
  assignUpdatePhone(payload, "extra_phone", values.extra_phone);
  assignUpdateString(payload, "administrator_name", values.administrator_name);
  assignUpdatePhone(payload, "administrator_phone", values.administrator_phone);
  assignUpdateString(payload, "card_last_four", values.card_last_four);
  assignUpdateString(payload, "card_token", values.card_token);
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

  if (lastName) userPayload.last_name = lastName;
  if (email) userPayload.email = email;

  return { userPayload, artistPayload };
}

function assignUpdateString(payload: UpdateArtistPayload, key: keyof UpdateArtistPayload, value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
  if (normalized) {
    (payload as Record<string, unknown>)[key] = normalized;
  }
}

function assignUpdatePhone(payload: UpdateArtistPayload, key: keyof UpdateArtistPayload, value: unknown) {
  const normalized = normalizePhoneForApi(value);
  if (normalized) {
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
    password: "",
    status: "10",
    region_id: "",
    district_id: "",
    bio: "",
    birth_date: "",
    gender: "male",
    extra_phone: "",
    administrator_name: "",
    administrator_phone: "",
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

function buildCreateArtistPayload(values: ReturnType<typeof initialCreateArtistValues>): CreateArtistPayload {
  const payload: CreateArtistPayload = {
    first_name: values.first_name.trim(),
    phone: normalizePhoneForApi(values.phone),
    password: values.password,
  };

  assignString(payload, "last_name", values.last_name);
  assignString(payload, "email", values.email);
  assignNumber(payload, "status", values.status);
  assignNumber(payload, "region_id", values.region_id);
  assignNumber(payload, "district_id", values.district_id);
  assignString(payload, "bio", values.bio);
  assignString(payload, "birth_date", values.birth_date);
  if (values.gender === "male" || values.gender === "female") {
    payload.gender = values.gender;
  }
  assignString(payload, "artist_bio", values.bio);
  assignPhone(payload, "extra_phone", values.extra_phone);
  assignString(payload, "administrator_name", values.administrator_name);
  assignPhone(payload, "administrator_phone", values.administrator_phone);
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
    note: "",
    status: "1",
    region_prices: [],
  };
}

function createRegionPriceRow(): RegionPriceRow {
  return {
    localId: `region-price-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    region_id: "",
    price: "",
    editing: true,
  };
}

function artistServiceFormValuesFromMode(mode: ArtistServiceFormMode): ArtistServiceFormValues {
  if (mode.type === "assign") {
    return {
      service_id: "",
      price: "",
      note: "",
      status: "1",
      region_prices: [],
    };
  }

  const attachedServiceId = getAttachedServiceId(mode.service);
  return {
    service_id: attachedServiceId ? String(attachedServiceId) : "",
    price: firstMeaningfulValue(mode.service, ["price", "amount"])?.toString() ?? "",
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
      region_id: Number(row.region_id),
      price: Number(row.price),
    }))
    .filter((row) => Number.isFinite(row.region_id) && row.region_id > 0 && Number.isFinite(row.price) && row.price > 0);
}

function validateArtistServiceForm(values: ArtistServiceFormValues, labels: ArtistsLabels) {
  if (!Number.isFinite(Number(values.service_id)) || Number(values.service_id) <= 0) return labels.requiredField(labels.services);
  if (!Number.isFinite(Number(values.price)) || Number(values.price) <= 0) return labels.requiredField(labels.price);
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

function validateRegionPriceRows(rows: RegionPriceRow[], labels: ArtistsLabels) {
  for (const row of rows) {
    const hasAnyValue = row.region_id || row.price;
    if (!hasAnyValue) continue;
    if (!Number.isFinite(Number(row.region_id)) || Number(row.region_id) <= 0) return labels.regionPriceRegionRequired;
    if (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0) return labels.regionPricePriceRequired;
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
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  slug?: string;
};

function getLocalizedEntityName(entity: LocalizedEntity, locale: Locale) {
  const localized = locale === "ru" ? entity.name_ru : entity.name_uz;
  return localized || entity.name_uz || entity.name_ru || entity.name_en || entity.slug || `#${entity.id ?? ""}`;
}

function getArtistsLabels(locale: string) {
  if (locale === "ru") {
    return {
      locale: "ru" as Locale,
      adminName: "Имя администратора",
      adminPhone: "Телефон администратора",
      additionalInfo: "Дополнительная информация",
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
      availableStatus: "Доступно",
      availableDays: "Доступные дни",
      availableDaysCount: (count: number) => `${count} доступных дней`,
      busyStatus: "Занято",
      busyDays: "Занятые дни",
      busyDaysCount: (count: number) => `${count} занятых дней`,
      busySlotCreated: "Занятое время добавлено",
      busySlotDeleted: "Занятое время удалено",
      busySlotDeleteFailed: "Не удалось удалить занятое время",
      busySlotIdMissing: "ID занятого времени не найден",
      busySlotSaveFailed: "Не удалось сохранить занятое время",
	      busySlotUpdated: "Занятое время обновлено",
	      balance: "Баланс",
	      balanceAfter: "Баланс после",
	      balanceBefore: "Баланс до",
	      calendarPreview: "Календарь",
	      cardLastFour: "Последние 4 цифры карты",
	      cardToken: "Токен карты",
	      artistBio: "Bio артиста",
      birthDate: "Дата рождения",
      cancel: "Закрыть",
      category: "Категории",
      categoryPlaceholder: "Выберите категорию",
      categoryIds: "ID категорий",
      client: "Клиент",
      comment: "Комментарий",
      commentDeleted: "Комментарий удален",
      commentDeleteFailed: "Не удалось удалить комментарий",
      commentIdMissing: "ID комментария не найден",
      commentItemCount: (count: number) => `${count} ${count === 1 ? "комментарий" : "комментариев"}`,
      commentPublished: "Комментарий опубликован",
      commentPublishFailed: "Не удалось опубликовать комментарий",
      commentUnpublished: "Комментарий скрыт",
      commentUnpublishFailed: "Не удалось скрыть комментарий",
      commentUpdated: "Комментарий обновлен",
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
      created: "Артист создан",
      creating: "Создается...",
      createdAt: "Создано",
      custom: "Настроить",
      date: "Дата",
      dateFilter: "Дата",
      dateFrom: "Дата с",
      dateTo: "Дата до",
      deletedStatus: "Удалено",
      description: "Просмотр, фильтрация и обновление данных профилей артистов.",
      detailLoadFailed: "Не удалось загрузить детали артиста",
      detailTitle: "Детали артиста",
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
	        card_last_four: "Последние 4 цифры карты",
	        card_token: "Токен карты",
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
        is_top: "Top",
        is_verified: "Подтвержден",
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
      galleryItem: "Изображение",
      galleryItemCount: (count: number) => `${count} ${count === 1 ? "изображение" : "изображений"}`,
      gender: "Пол",
      genderFemale: "Женский",
      genderMale: "Мужской",
      genderOther: "Другое",
      loadFailed: "Не удалось загрузить артистов",
      loadingTitle: (title: string) => `${title} загружается...`,
      fullName: "Полное имя",
      language: "Язык",
      id: "ID",
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
      newPassword: "Новый пароль",
      confirmPassword: "Подтвердите пароль",
      passwordMismatch: "Пароли не совпадают",
      passwordMinLength: "Пароль должен быть не меньше 6 символов",
      resetPasswordAction: "Сбросить пароль",
      resetPasswordTitle: "Сброс пароля артиста",
      resetPasswordDescription: (name: string) => `Новый пароль будет установлен для ${name}.`,
      passwordResetSuccess: "Пароль артиста обновлен",
      passwordResetFailed: "Не удалось обновить пароль артиста",
      phone: "Телефон",
      pendingStatus: "Ожидает",
      price: "Цена",
      profile: "Профиль",
      regionPriceDeleted: "Региональная цена удалена",
      regionPriceDeleteFailed: "Не удалось удалить региональную цену",
      regionPricePriceRequired: "Укажите цену",
      regionPrices: "Цены по регионам",
      regionPricesEmpty: "Для этого сервиса региональные цены не указаны.",
      regionPriceSaved: "Региональная цена сохранена",
      regionPriceSaveFailed: "Не удалось сохранить региональную цену",
      regionPriceRegionRequired: "Выберите регион",
      regionPriceServiceMissing: "ID сервиса артиста не найден",
      publicationStatus: "Статус публикации",
      publishedRatings: "Опубликовано",
      publishComment: "Опубликовать",
      publishCommentConfirm: "Комментарий станет видимым в профиле артиста.",
      publishCommentTitle: "Опубликовать комментарий?",
      publishedStatus: "Опубликовано",
      districtId: "ID района",
      lastName: "Фамилия",
      noProfilePhoto: "Фото не выбрано",
      profilePhotoId: "ID фото профиля",
      profilePhoto: "Фото профиля",
      profilePhotoHint: "JPG или PNG, до 5 MB.",
      rating: "Рейтинг",
      ratingDeleted: "Рейтинг удален",
      ratingDeleteFailed: "Не удалось удалить рейтинг",
      ratingIdMissing: "ID рейтинга не найден",
      ratingItemCount: (count: number) => `${count} ${count === 1 ? "рейтинг" : "рейтингов"}`,
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
      scheduleManagementTitle: "Управление расписанием",
      scheduleRecordCount: (count: number) => `${count} ${count === 1 ? "запись" : "записей"}`,
      scheduleStatusActive: "Активно",
	      scheduleStatusDraft: "Черновик",
	      search: "Поиск",
	      searchPlaceholder: "Имя, фамилия или телефон",
	      artistServiceDeleted: "Услуга артиста удалена",
	      artistServiceDeleteFailed: "Не удалось удалить услугу артиста",
	      artistServiceSaved: "Услуга артиста сохранена",
	      artistServiceSaveFailed: "Не удалось сохранить услугу артиста",
	      services: "Услуги",
      sortOrder: "Порядок",
      status: "Статус",
      statusValueLabels: {
        active: "Активно",
        inactive: "Неактивно",
        pending: "Ожидает",
        "pending review": "На рассмотрении",
        "payment pending": "Ожидает оплату",
        "awaiting payment": "Ожидает оплату",
        approved: "Подтверждено",
        accepted: "Принято",
        rejected: "Отклонено",
        confirmed: "Подтверждено",
        "in progress": "В процессе",
        processing: "В процессе",
        completed: "Завершено",
        done: "Завершено",
        cancelled: "Отменено",
        canceled: "Отменено",
        deleted: "Удалено",
        expired: "Истекло",
        unknown: "Неизвестно",
        blocked: "Заблокировано",
        published: "Опубликовано",
        unpublished: "Скрыто",
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
      updated: "Артист обновлен",
      updatedAt: "Обновлено",
      endTime: "Время окончания",
      lastActivity: "Последняя активность",
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
      weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
      selectedPhoto: (id: number) => `Выбрано фото #${id}`,
      selectRegionFirst: "Сначала выберите регион",
      adminInfo: "Данные администратора",
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
      availableStatus: "Bo'sh",
      availableDays: "Bo'sh kunlar",
      availableDaysCount: (count: number) => `${count} ta bo'sh kun`,
      busyStatus: "Band",
      busyDays: "Band kunlar",
      busyDaysCount: (count: number) => `${count} ta band kun`,
      busySlotCreated: "Band vaqt qo'shildi",
      busySlotDeleted: "Band vaqt o'chirildi",
      busySlotDeleteFailed: "Band vaqtni o'chirish bajarilmadi",
      busySlotIdMissing: "Band vaqt ID topilmadi",
      busySlotSaveFailed: "Band vaqtni saqlash bajarilmadi",
	    busySlotUpdated: "Band vaqt yangilandi",
	    balance: "Balans",
	    balanceAfter: "Keyingi balans",
	    balanceBefore: "Oldingi balans",
	    calendarPreview: "Kalendar",
	    cardLastFour: "Kartaning oxirgi 4 raqami",
	    cardToken: "Karta tokeni",
	    artistBio: "Sanatkor bio",
    birthDate: "Tug'ilgan sana",
    cancel: "Yopish",
    category: "Kategoriya",
    categoryPlaceholder: "Kategoriya tanlang",
    categoryIds: "Kategoriya IDlari",
    client: "Mijoz",
    comment: "Izoh",
    commentDeleted: "Izoh o'chirildi",
    commentDeleteFailed: "Izohni o'chirish bajarilmadi",
    commentIdMissing: "Izoh ID topilmadi",
    commentItemCount: (count: number) => `${count} ta izoh`,
    commentPublished: "Izoh ko'rsatildi",
    commentPublishFailed: "Izohni ko'rsatish bajarilmadi",
    commentUnpublished: "Izoh yashirildi",
    commentUnpublishFailed: "Izohni yashirish bajarilmadi",
    commentUpdated: "Izoh yangilandi",
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
    created: "Sanatkor yaratildi",
    creating: "Yaratilmoqda...",
    createdAt: "Yaratilgan",
    custom: "Sozlash",
    date: "Sana",
    dateFilter: "Sana",
    dateFrom: "Boshlanish sanasi",
    dateTo: "Tugash sanasi",
    deletedStatus: "O'chirilgan",
    description: "Sanatkor profillarini ko'rish, filterlash va kerakli ma'lumotlarni yangilash.",
    detailLoadFailed: "Sanatkor tafsilotlari yuklanmadi",
    detailTitle: "Sanatkor tafsilotlari",
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
	      card_last_four: "Kartaning oxirgi 4 raqami",
	      card_token: "Karta tokeni",
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
      id: "ID",
      is_top: "Top",
      is_verified: "Tasdiqlangan",
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
    galleryItem: "Rasm",
    galleryItemCount: (count: number) => `${count} ta rasm`,
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
    newPassword: "Yangi parol",
    confirmPassword: "Parolni tasdiqlash",
    passwordMismatch: "Parollar mos emas",
    passwordMinLength: "Parol kamida 6 belgidan iborat bo'lishi kerak",
    resetPasswordAction: "Parol reset",
    resetPasswordTitle: "Sanatkor parolini reset qilish",
    resetPasswordDescription: (name: string) => `${name} uchun yangi parol o'rnatiladi.`,
    passwordResetSuccess: "Sanatkor paroli yangilandi",
    passwordResetFailed: "Sanatkor parolini yangilash bajarilmadi",
    phone: "Telefon",
    pendingStatus: "Kutilmoqda",
    price: "Narx",
    profile: "Profil",
    regionPriceDeleted: "Viloyat narxi o'chirildi",
    regionPriceDeleteFailed: "Viloyat narxini o'chirish bajarilmadi",
    regionPricePriceRequired: "Narx kiriting",
    regionPrices: "Viloyat narxlari",
    regionPricesEmpty: "Bu xizmat uchun viloyat narxlari kiritilmagan.",
    regionPriceSaved: "Viloyat narxi saqlandi",
    regionPriceSaveFailed: "Viloyat narxini saqlash bajarilmadi",
    regionPriceRegionRequired: "Viloyat tanlang",
    regionPriceServiceMissing: "Sanatkor xizmati ID topilmadi",
    publicationStatus: "Ko'rsatish holati",
    publishedRatings: "Ko'rsatilgan",
    publishComment: "Ko'rsatish",
    publishCommentConfirm: "Izoh sanatkor profilida ko'rinadi.",
    publishCommentTitle: "Izoh ko'rsatilsinmi?",
    publishedStatus: "Ko'rsatilgan",
    districtId: "Tuman ID",
    lastName: "Familiya",
    noProfilePhoto: "Rasm tanlanmagan",
    profilePhotoId: "Profil rasmi ID",
    profilePhoto: "Profil rasmi",
    profilePhotoHint: "JPG yoki PNG format, 5 MB gacha.",
    rating: "Reyting",
    ratingDeleted: "Reyting o'chirildi",
    ratingDeleteFailed: "Reytingni o'chirish bajarilmadi",
    ratingIdMissing: "Reyting ID topilmadi",
    ratingItemCount: (count: number) => `${count} ta reyting`,
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
    scheduleManagementTitle: "Vaqtlarni boshqarish",
    scheduleRecordCount: (count: number) => `${count} ta yozuv`,
    scheduleStatusActive: "Faol",
    scheduleStatusDraft: "Qoralama",
	    search: "Qidiruv",
	    searchPlaceholder: "Ism, familiya yoki telefon",
	    artistServiceDeleted: "Sanatkor xizmati o'chirildi",
	    artistServiceDeleteFailed: "Sanatkor xizmatini o'chirish bajarilmadi",
	    artistServiceSaved: "Sanatkor xizmati saqlandi",
	    artistServiceSaveFailed: "Sanatkor xizmatini saqlash bajarilmadi",
	    services: "Xizmatlar",
    sortOrder: "Tartib",
    status: "Holat",
    statusValueLabels: {
      active: "Faol",
      inactive: "Nofaol",
      pending: "Kutilmoqda",
      "pending review": "Ko'rib chiqilmoqda",
      "payment pending": "To'lov kutilmoqda",
      "awaiting payment": "To'lov kutilmoqda",
      approved: "Tasdiqlangan",
      accepted: "Qabul qilingan",
      rejected: "Rad etilgan",
      confirmed: "Tasdiqlangan",
      "in progress": "Jarayonda",
      processing: "Jarayonda",
      completed: "Yakunlangan",
      done: "Yakunlangan",
      cancelled: "Bekor qilingan",
      canceled: "Bekor qilingan",
      deleted: "O'chirilgan",
      expired: "Muddati o'tgan",
      unknown: "Noma'lum",
      blocked: "Bloklangan",
      published: "Ko'rsatilgan",
      unpublished: "Yashirilgan",
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
    updated: "Sanatkor yangilandi",
    updatedAt: "Yangilangan",
    endTime: "Tugash vaqti",
    lastActivity: "Oxirgi faollik",
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
    weekdays: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
    selectedPhoto: (id: number) => `Rasm #${id} tanlandi`,
    selectRegionFirst: "Avval viloyat tanlang",
    adminInfo: "Administrator ma'lumotlari",
    accountStatus: "Account va holat",
    artistInfo: "San'atkor ma'lumotlari",
    locationInfo: "Joylashuv",
    statistics: "Ko'rsatkichlar",
    yes: "Ha",
  };
}

function categoryId(category: unknown) {
  if (!isRecord(category)) return "";
  const id = category.id ?? category.category_id;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
}
