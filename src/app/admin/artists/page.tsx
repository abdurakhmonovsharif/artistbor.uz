"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Drawer, Input, Select, Tabs } from "antd";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  Folder,
  IdCard,
  Languages,
  ListChecks,
  Mail,
  MoreHorizontal,
  Pencil,
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
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import { adminPrimaryActionButtonClass } from "@/components/admin/admin-action-button";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
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
  commentsApi,
  ratingsApi,
  type ArtistFilters,
  type UpdateArtistPayload,
} from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn, isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type { ArtistProfile, ListResult, UnknownRecord } from "@/types/api";

type DialogState =
  | { type: "view"; artist: ArtistProfile }
  | { type: "edit"; artist: ArtistProfile }
  | null;

type DetailTab = "profile" | "services" | "availability" | "gallery" | "videos" | "comments" | "ratings";
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

const limit = 20;

const initialFilters: ArtistFilters = {
  search: "",
  is_verified: "",
  is_top: "",
  status: "",
  page: 1,
  limit,
};

const resourceTabs: ResourceTab[] = ["services", "availability", "gallery", "videos", "comments", "ratings"];

type ArtistsLabels = ReturnType<typeof getArtistsLabels>;

function getArtistColumns(labels: ArtistsLabels): DataTableColumn<ArtistProfile>[] {
  return [
    { key: "id", label: "ID", kind: "number", render: (row) => getArtistId(row) ?? "—" },
    {
      key: "full_name",
      label: labels.artist,
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatar_url ? (
            <div
              aria-label={getArtistName(row, labels)}
              className="size-10 shrink-0 rounded-full border border-slate-200 bg-cover bg-center dark:border-white/10"
              style={{ backgroundImage: `url(${row.avatar_url})` }}
            />
          ) : (
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {getArtistInitials(row, labels)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-black text-slate-900 dark:text-white">
              {getArtistName(row, labels)}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {row.email || row.phone || "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "phone", label: labels.phone, render: (row) => row.phone || row.extra_phone || "—" },
    {
      key: "status_label",
      label: labels.status,
      render: (row) => <LocalizedStatusBadge fieldKey="status" labels={labels} value={row.status_label ?? row.status} />,
    },
    { key: "region_id", label: labels.region, kind: "number" },
    { key: "district_id", label: labels.district, kind: "number" },
    { key: "created_at", label: labels.createdAt, kind: "date" },
    { key: "rating", label: labels.rating, kind: "number" },
    {
      key: "is_verified",
      label: labels.verified,
      render: (row) => <LocalizedStatusBadge fieldKey="is_verified" labels={labels} value={row.is_verified} />,
    },
    { key: "is_top", label: labels.top, render: (row) => <LocalizedStatusBadge fieldKey="is_top" labels={labels} value={row.is_top} /> },
  ];
}

function getDetailTabs(labels: ArtistsLabels): { key: DetailTab; label: string }[] {
  return [
    { key: "profile", label: labels.profile },
    { key: "services", label: labels.services },
    { key: "availability", label: labels.availability },
    { key: "gallery", label: labels.gallery },
    { key: "videos", label: labels.videos },
    { key: "comments", label: labels.comments },
    { key: "ratings", label: labels.ratings },
  ];
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
  const { locale, t } = useI18n();
  const labels = getArtistsLabels(locale);
  const columns = getArtistColumns(labels);
  const toast = useToast();

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

  const openDialog = async (type: "view" | "edit", row: ArtistProfile) => {
    const artistId = getArtistId(row);
    if (!artistId) return;
    setSubmitting(true);
    try {
      const artist = await artistsApi.detail(artistId);
      setDialog({ type, artist });
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
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, limit: nextLimit }));
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const page = Number(filters.page ?? 1);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
          {labels.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          {labels.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          {labels.description}
        </p>
      </div>

      <AdminFilterForm
        onSubmit={applyFilters}
        gridClassName="md:grid-cols-[minmax(180px,1.2fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_minmax(140px,0.65fr)_auto] md:items-center"
        mobileLabel={t("actions.search")}
      >
          <Input
            allowClear
            prefix={<Search className="size-4 text-slate-400" />}
            placeholder={labels.searchPlaceholder}
            value={draftFilters.search ?? ""}
            onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
            className={`${adminFilterControlClass} h-10`}
          />
          <Select
            className={`${adminFilterControlClass} h-10`}
            value={draftFilters.is_verified ?? ""}
            onChange={(is_verified) => setDraftFilters((current) => ({ ...current, is_verified }))}
            options={[
              { label: `${labels.verified}: ${labels.all}`, value: "" },
              { label: labels.yes, value: 1 },
              { label: labels.no, value: 0 },
            ]}
          />
          <Select
            className={`${adminFilterControlClass} h-10`}
            value={draftFilters.is_top ?? ""}
            onChange={(is_top) => setDraftFilters((current) => ({ ...current, is_top }))}
            options={[
              { label: `${labels.top}: ${labels.all}`, value: "" },
              { label: labels.yes, value: 1 },
              { label: labels.no, value: 0 },
            ]}
          />
          <Input
            type="number"
            value={draftFilters.status ?? ""}
            placeholder={`${labels.status}: ${labels.all}`}
            onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
            className={`${adminFilterControlClass} h-10`}
          />
          <Button
            htmlType="button"
            className={`${adminFilterActionClass} h-10`}
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            {labels.reset}
          </Button>
      </AdminFilterForm>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row, index) => getArtistId(row) ?? index}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <IconButton label={t("actions.view")} onClick={() => void openDialog("view", row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton label={t("actions.edit")} onClick={() => void openDialog("edit", row)}>
                <Pencil className="size-4" />
              </IconButton>
            </div>
          )}
        />
      )}

      <Pagination
        meta={meta}
        page={page}
        pageSize={Number(filters.limit) || limit}
        onPageChange={changePage}
        onPageSizeChange={changePageSize}
      />

      <ArtistDrawer
        artist={dialog?.artist ?? null}
        mode={dialog?.type ?? "view"}
        loading={submitting}
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        onEdit={(artist) => setDialog({ type: "edit", artist })}
        onSubmit={async (payload) => {
          if (!dialog?.artist) return;
          const artistId = getArtistId(dialog.artist);
          if (!artistId) return;
          setSubmitting(true);
          try {
            await artistsApi.update(artistId, payload);
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
    </section>
  );
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

    void loadResource("services", artistServicesApi.list({ artist_id: artistId }));
    void loadResource("availability", artistAvailabilityApi.list(artistId));
    void loadResource("gallery", artistGalleryApi.list({ artist_id: artistId }));
    void loadResource("videos", artistVideosApi.list({ artist_id: artistId }));
    void loadResource("comments", commentsApi.byArtist(artistId));
    void loadResource("ratings", ratingsApi.byArtist(artistId, 1, limit));

    return () => {
      ignore = true;
    };
  }, [artist, artistId, labels.artistIdMissing, labels.resourceLoadFailed]);

  if (!artist) return null;

  return (
    <>
    <Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 480px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
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
        />
      }
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 64, padding: "0 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
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
                  <ArtistServicesTab state={resources.services} labels={labels} />
                ) : tab.key === "availability" ? (
                  <ArtistScheduleSummaryTab
                    artist={artist}
                    labels={labels}
                    state={resources.availability}
                    onCreate={() => setScheduleDrawer({ mode: "create", schedule: null })}
                    onOpen={(schedule) => setScheduleDrawer({ mode: "manage", schedule })}
                  />
                ) : tab.key === "videos" ? (
                  <ArtistVideosSummary artistId={artistId} state={resources.videos} />
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
    />
    </>
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
            {artist.phone ?? artist.extra_phone ?? "—"}
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
  const nestedKeys = ["user", "profile", "artist_profile"];

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
      dotClassName: "bg-rose-500",
    },
    neutral: {
      className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
      dotClassName: "bg-slate-400",
    },
    success: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
      dotClassName: "bg-emerald-500",
    },
    warning: {
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
      dotClassName: "bg-amber-500",
    },
  }[tone];

  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold", toneClass.className)}>
      <span className={cn("size-1.5 rounded-full", toneClass.dotClassName)} />
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
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em]", toneClass)}>
      <span className="size-1.5 rounded-full bg-current" />
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
          label={t("actions.cancel")}
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
        icon={<Pencil className="size-4" />}
        label={t("actions.edit")}
        tone="primary"
        onClick={onEdit}
      />
      <ArtistDrawerActionButton
        icon={<X className="size-4" />}
        label={t("actions.close")}
        onClick={onClose}
      />
    </div>
  );
}

function ArtistDrawerActionButton({
  icon,
  label,
  loading,
  tone = "default",
  ...buttonProps
}: {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  tone?: "default" | "primary" | "save";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const toneClass =
    tone === "save" || tone === "primary"
      ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
      : "border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10";

  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? "button"}
      disabled={loading || buttonProps.disabled}
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
    { icon: <IdCard className="size-4" />, label: labels.artistId, value: getArtistId(artist), always: true },
    { icon: <User className="size-4" />, label: labels.fullName, value: getArtistName(artist, labels), always: true },
    { icon: <Phone className="size-4" />, label: labels.phone, value: artist.phone ?? artist.extra_phone, always: true },
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
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
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
              <ArtistInfoCell icon={<Phone className="size-4" />} label={labels.adminPhone} value={artist.administrator_phone || artist.extra_phone} />
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
        <details className="group rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-[#121a2a]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-950 dark:text-white">
            {labels.additionalInfo}
            <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" />
          </summary>
          <div className="mt-3">
            <ProfileData entries={additionalEntries} labels={labels} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ArtistSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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
  const [values, setValues] = useState(() => initialArtistFormValues(artist));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(buildArtistPayload(values));
  };

  return (
    <form id={formId} onSubmit={submit} className="space-y-3">
      <ArtistEditField
        label={labels.bio}
        type="textarea"
        value={values.bio}
        rows={4}
        onChange={(bio) => setValues((current) => ({ ...current, bio }))}
      />

      <div className="grid gap-3 min-[440px]:grid-cols-2">
        <ArtistEditField
          label={labels.extraPhone}
          value={values.extra_phone}
          onChange={(extra_phone) => setValues((current) => ({ ...current, extra_phone }))}
        />
        <ArtistEditField
          label={labels.adminName}
          value={values.administrator_name}
          onChange={(administrator_name) => setValues((current) => ({ ...current, administrator_name }))}
        />
        <ArtistEditField
          label={labels.adminPhone}
          value={values.administrator_phone}
          onChange={(administrator_phone) => setValues((current) => ({ ...current, administrator_phone }))}
        />
        <ArtistEditField
          label={labels.topArtist}
          type="select"
          value={values.is_top}
          options={[
            { label: labels.yes, value: "true" },
            { label: labels.no, value: "false" },
          ]}
          onChange={(is_top) => setValues((current) => ({ ...current, is_top }))}
        />
      </div>
    </form>
  );
}

function ArtistEditField({
  label,
  value,
  onChange,
  type = "text",
  options,
  rows = 3,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "textarea" | "select";
  options?: { label: string; value: string | number }[];
  rows?: number;
}) {
  const { t } = useI18n();
  const controlClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:border-white/10 dark:bg-[#121a2a] dark:text-white dark:focus:border-amber-400/60";

  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold leading-4 text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {type === "textarea" ? (
        <textarea
          className={cn(controlClass, "min-h-24 resize-y py-3 leading-5")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
        />
      ) : type === "select" ? (
        <span className="relative block">
          <select
            className={cn(controlClass, "h-11 cursor-pointer appearance-none py-0 pr-10")}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">{t("common.select")}</option>
            {options?.map((option) => (
              <option key={String(option.value)} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </span>
      ) : (
        <input
          className={cn(controlClass, "h-11 py-0")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function initialArtistFormValues(artist: ArtistProfile) {
  return {
    category_ids: Array.isArray(artist.categories)
      ? artist.categories.map((category) => categoryId(category)).filter(Boolean).join(", ")
      : "",
    bio: artist.bio ?? "",
    albums_count: artist.albums_count === undefined ? "" : String(artist.albums_count),
    extra_phone: artist.extra_phone ?? "",
    administrator_name: artist.administrator_name ?? "",
    administrator_phone: artist.administrator_phone ?? "",
    is_top: artist.is_top === undefined ? "" : String(artist.is_top),
    rating: artist.rating === undefined ? "" : String(artist.rating),
  };
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
  const href = artistId ? `/admin/videos?artist_id=${artistId}` : "/admin/videos";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {labels.artistVideos}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {rows.length}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {labels.artistVideosCountHint}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
        >
          {labels.viewInTable}
        </Link>
      </div>
      {rows.length ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {rows.slice(0, 2).map((row, index) => (
            <div
              key={String(resourceRowKey(row, index))}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <ObjectDetails record={row} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
          {labels.noVideoHint}
        </div>
      )}
    </div>
  );
}

function ArtistServicesTab({
  state,
  labels,
}: {
  state: DetailResourceState;
  labels: ArtistsLabels;
}) {
  if (state.loading) return <LoadingState label={labels.loadingTitle(labels.services)} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);

  if (!rows.length) return <EmptyState title={labels.notFoundTitle(labels.services)} />;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.services}</h4>
      <div className="space-y-3">
        {rows.map((service, index) => (
          <ArtistServiceCard
            key={String(resourceRowKey(service, index))}
            labels={labels}
            service={service}
          />
        ))}
      </div>
    </div>
  );
}

function ArtistServiceCard({
  service,
  labels,
}: {
  service: UnknownRecord;
  labels: ArtistsLabels;
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
    </article>
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
              ? labels.availableDaysCount(countAvailableDays(availabilityRows))
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
}: {
  artist: ArtistProfile;
  labels: ArtistsLabels;
  mode: "manage" | "create";
  open: boolean;
  schedule: UnknownRecord | null;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const selectedSchedule = schedule ?? { artist_id: getArtistId(artist) };
  const availabilityRows = availabilityRowsFromSchedule(selectedSchedule, labels);
  const status = getScheduleStatus(selectedSchedule, labels, mode);
  const rawAvailability = getRawAvailabilityPreview(selectedSchedule, labels);
  const dirty = false;

  return (
    <Drawer
      destroyOnClose
      maskClosable={!dirty}
      open={open}
      onClose={onClose}
      placement="right"
      size="min(100vw, 1180px)"
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
      title={
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
              {labels.scheduleManagementTitle}
            </span>
            <ArtistHeaderBadge label={status.label} tone={status.tone} />
          </div>
          <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {getArtistName(artist, labels)} · {artist.phone ?? artist.extra_phone ?? "—"}
          </p>
        </div>
      }
      footer={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            disabled
            className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500"
          >
            <Save className="size-4" />
            {t("actions.save")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            <X className="size-4" />
            {t("actions.close")}
          </button>
        </div>
      }
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 72, padding: "12px 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
      }}
    >
      <div className="bg-slate-50/60 p-4 dark:bg-[#0f172a] md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <ScheduleDetailsCard labels={labels} locale={locale} schedule={selectedSchedule} status={status} />
            <AvailabilityRows labels={labels} rows={availabilityRows} />
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
            <ScheduleCalendarPreview labels={labels} locale={locale} rows={availabilityRows} schedule={selectedSchedule} />
            <ScheduleQuickInfoCard labels={labels} rows={availabilityRows} schedule={selectedSchedule} />
            <ScheduleSideActions labels={labels} />
          </aside>
        </div>
      </div>
    </Drawer>
  );
}

function ScheduleDetailsCard({
  labels,
  locale,
  schedule,
  status,
}: {
  labels: ArtistsLabels;
  locale: Locale;
  schedule: UnknownRecord;
  status: ReturnType<typeof getScheduleStatus>;
}) {
  const rows: [string, unknown][] = [];

  if (hasMeaningfulValue(schedule.id)) rows.push(["ID", toDisplay(schedule.id)]);
  rows.push(
    [labels.artistId, toDisplay(schedule.artist_id)],
    [labels.dateFrom, toDisplay(schedule.date_from)],
    [labels.dateTo, toDisplay(schedule.date_to)],
    [labels.availabilityType, getAvailabilityTypeLabel(schedule, labels)],
    [labels.availabilitySummary, scheduleAvailabilitySummary(schedule, labels)],
  );

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.scheduleDetails}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatScheduleRange(schedule, locale)}
          </p>
        </div>
        <ArtistHeaderBadge label={status.label} tone={status.tone} />
      </div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-slate-50 p-3 dark:bg-[#121a2a]">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
              {toDisplay(value)}
            </p>
          </div>
        ))}
        <div className="bg-slate-50 p-3 dark:bg-[#121a2a]">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.status}</p>
          <div className="mt-1">
            <ArtistHeaderBadge label={status.label} tone={status.tone} />
          </div>
        </div>
      </div>
    </section>
  );
}

function AvailabilityRows({
  labels,
  rows,
}: {
  labels: ArtistsLabels;
  rows: AvailabilityRow[];
}) {
  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.availabilityList}</h3>
        <button
          type="button"
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
                  <button type="button" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" className="grid size-8 place-items-center rounded-lg border border-rose-200 text-rose-600 dark:border-rose-500/30 dark:text-rose-300">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ScheduleEmptyState labels={labels} onAdd={() => undefined} />
      )}
    </section>
  );
}

function ScheduleCalendarPreview({
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
  const start = parseDateOnly(schedule.date_from);
  const end = parseDateOnly(schedule.date_to);
  const availableDates = new Set(rows.filter((row) => row.tone === "success").map((row) => row.date));

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
          const available = availableDates.has(key);
          return (
            <span
              key={key}
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-xs font-semibold",
                day.getMonth() !== start.getMonth() ? "text-slate-300 dark:text-slate-600" : "text-slate-700 dark:text-slate-200",
                inRange && "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
                available && "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
              )}
            >
              {day.getDate()}
            </span>
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
  const items = [
    [labels.totalDays, countTotalDays(schedule) || "—"],
    [labels.availableDays, countAvailableDays(rows)],
    [labels.busyDays, countBusyDays(rows)],
    [labels.createdAt, formatDisplayValue("created_at", schedule.created_at, labels)],
    [labels.updatedAt, formatDisplayValue("updated_at", schedule.updated_at, labels)],
  ] as const;

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

function ScheduleSideActions({ labels }: { labels: ArtistsLabels }) {
  const actions = [
    { icon: <Plus className="size-4" />, label: labels.addAvailability, className: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300" },
    { icon: <Copy className="size-4" />, label: labels.duplicateSchedule, className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.05]" },
    { icon: <Trash2 className="size-4" />, label: labels.deleteSchedule, className: "border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10" },
  ];

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-4 dark:border-white/10 dark:bg-[#111827]">
      <h3 className="text-base font-bold text-slate-950 dark:text-white">{labels.actions}</h3>
      <div className="mt-4 grid gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-bold transition", action.className)}
          >
            {action.icon}
            {action.label}
          </button>
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
    <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-white/10 dark:bg-slate-950">
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <DetailValue key={key} fieldKey={key} value={value} />
        ))}
      </div>
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

  if (serviceId) chips.push(`ID ${toDisplay(serviceId)}`);
  if (price) chips.push(`${labels.price}: ${toDisplay(price)}`);
  if (duration) chips.push(`${labels.duration}: ${toDisplay(duration)} ${labels.minutesShort}`);

  return chips;
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

type AvailabilityRow = {
  date: string;
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
  const date = firstMeaningfulValue(record, ["date", "day", "date_from", "start_date", "available_date"]);
  const group = firstMeaningfulValue(record, ["group"]);
  const start = firstMeaningfulValue(record, ["start_time", "time_from", "from"]);
  const end = firstMeaningfulValue(record, ["end_time", "time_to", "to"]);
  const status = availabilityStatus(record, labels);

  return {
    date: String(date ?? group ?? "—"),
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
  const unavailable = normalized.includes("busy") || normalized.includes("false") || normalized === "0";

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
  if (rows.length) return labels.availableDaysCount(countAvailableDays(rows));
  if ("availability" in schedule) return labels.noAvailabilityData;
  return "—";
}

function getAvailabilityTypeLabel(schedule: UnknownRecord, labels: ArtistsLabels) {
  const availability = schedule.availability;
  if (Array.isArray(availability)) return labels.arrayType;
  if (isRecord(availability)) return labels.objectType;
  if (!hasMeaningfulValue(availability)) return labels.emptyType;
  return labels.unknownType;
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

function countAvailableDays(rows: AvailabilityRow[]) {
  return new Set(rows.filter((row) => row.tone === "success").map((row) => row.date)).size;
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
      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        !
      </span>
    );
  }

  return (
    <span className="ml-2 rounded-full bg-current/10 px-2 py-0.5 text-[11px]">
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
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {humanizeKey(fieldKey, labels)}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
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
      <div className="space-y-1.5">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-slate-950"
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
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);

  if (!entries.length) return <span>—</span>;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-slate-950"
        >
          <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {humanizeKey(key, labels)}
          </span>
          <div className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
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
  if (typeof value === "boolean") return value ? labels.yes : labels.no;
  if (isStatusField(key)) return formatEnumValue(key, value, labels);
  return toDisplay(value);
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
    if (normalized === "true" || normalized === "1") return labels.yes;
    if (normalized === "false" || normalized === "0") return labels.no;
  }

  if (fieldKey === "status" || fieldKey === "status_label" || fieldKey.endsWith("_status")) {
    if (normalized === "0") return labels.deletedStatus;
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

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
    >
      {children}
    </button>
  );
}

function buildArtistPayload(values: {
  category_ids: string;
  bio: string;
  albums_count: string;
  extra_phone: string;
  administrator_name: string;
  administrator_phone: string;
  is_top: string;
  rating: string;
}) {
  const payload: UpdateArtistPayload = {};
  const categoryIds = values.category_ids
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));
  if (categoryIds.length) payload.category_ids = categoryIds;
  if (values.bio) payload.bio = values.bio;
  if (values.albums_count) payload.albums_count = Number(values.albums_count);
  if (values.extra_phone) payload.extra_phone = values.extra_phone;
  if (values.administrator_name) payload.administrator_name = values.administrator_name;
  if (values.administrator_phone) payload.administrator_phone = values.administrator_phone;
  if (values.is_top) payload.is_top = values.is_top === "true";
  if (values.rating) payload.rating = Number(values.rating);
  return payload;
}

function getArtistsLabels(locale: string) {
  if (locale === "ru") {
    return {
      adminName: "Имя администратора",
      adminPhone: "Телефон администратора",
      additionalInfo: "Дополнительная информация",
      albumsCount: "Количество альбомов",
      albums: "Альбомы",
      artist: "Артист",
      artistId: "ID артиста",
      artistStats: "Статистика артиста",
      artistIdMissing: "ID артиста не найден",
      artistVideos: "Видео артиста",
      artistVideosCountHint: "Количество видео, привязанных к этому артисту",
      about: "О себе",
      actions: "Действия",
      add: "Добавить",
      addAvailability: "Добавить доступность",
      all: "Все",
      administrator: "Администратор",
      arrayType: "Массив",
      availability: "Расписание",
      availabilityList: "Доступность",
      availabilitySummary: "Сводка доступности",
      availabilityType: "Тип доступности",
      availableStatus: "Доступно",
      availableDays: "Доступные дни",
      availableDaysCount: (count: number) => `${count} доступных дней`,
      busyStatus: "Занято",
      busyDays: "Занятые дни",
      calendarPreview: "Календарь",
      categoryIds: "ID категорий",
      comments: "Комментарии",
      createdAt: "Создано",
      date: "Дата",
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
      editTitle: "Редактировать артиста",
      emptyType: "Пусто",
      emptyArtistDetails: "Детали артиста пустые",
      email: "Email",
      extraPhone: "Дополнительный телефон",
      eyebrow: "Артисты",
      fieldLabels: {
        administrator_name: "Имя администратора",
        administrator_phone: "Телефон администратора",
        albums_count: "Количество альбомов",
        artist_id: "ID артиста",
        bio: "Bio",
        category_ids: "ID категорий",
        client_id: "ID клиента",
        created_at: "Создано",
        deleted_at: "Удалено",
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
        phone: "Телефон",
        rating: "Рейтинг",
        region_id: "Регион",
        role: "Роль",
        role_label: "Роль",
        status: "Статус",
        status_label: "Статус",
        title: "Заголовок",
        type: "Тип",
        updated_at: "Обновлено",
        user_id: "ID пользователя",
      } as Record<string, string>,
      fans: "Поклонники",
      gallery: "Галерея",
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
      no: "Нет",
      noAvailabilityData: "Нет данных по доступности",
      noVideoHint: "Видео не найдено. Можно повторно проверить на странице видео с фильтром по артисту.",
      notFoundTitle: (title: string) => `${title} не найдено`,
      objectType: "Объект",
      oneObject: "1 объект",
      page: "Страница",
      phone: "Телефон",
      price: "Цена",
      profile: "Профиль",
      profilePhotoId: "ID фото профиля",
      rating: "Рейтинг",
      ratings: "Рейтинги",
      recordCount: (count: number) => `${count} записей`,
      recordNumber: (index: number) => `Запись #${index}`,
      region: "Регион",
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
      services: "Услуги",
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
      timezone: "Часовой пояс",
      title: "Артисты",
      top: "Топ",
      topArtist: "Топ артист",
      totalDays: "Всего дней",
      unknownType: "Неизвестно",
      updateFailed: "Не удалось обновить",
      updated: "Артист обновлен",
      updatedAt: "Обновлено",
      verified: "Подтвержден",
      verifiedBadge: "Verified",
      videos: "Видео",
      videosLoading: "Видео загружаются...",
      viewInTable: "Посмотреть в таблице",
      weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
      yes: "Да",
    };
  }

  return {
    adminName: "Administrator ismi",
    adminPhone: "Administrator telefoni",
    additionalInfo: "Qo'shimcha ma'lumot",
    albumsCount: "Albomlar soni",
    albums: "Albomlar",
    artist: "Sanatkor",
    artistId: "Sanatkor ID",
    artistStats: "Sanatkor statistikasi",
    artistIdMissing: "Sanatkor ID topilmadi",
    artistVideos: "Sanatkor videolari",
    artistVideosCountHint: "Bu sanatkorga biriktirilgan video soni",
    about: "O'zi haqida",
    actions: "Amallar",
    add: "Qo'shish",
    addAvailability: "Bo'sh vaqt qo'shish",
    all: "Barchasi",
    administrator: "Administrator",
    arrayType: "Massiv",
    availability: "Vaqtlar",
      availabilityList: "Bo'sh vaqtlar",
      availabilitySummary: "Bo'sh vaqt xulosasi",
      availabilityType: "Bo'sh vaqt turi",
      availableStatus: "Bo'sh",
      availableDays: "Bo'sh kunlar",
      availableDaysCount: (count: number) => `${count} ta bo'sh kun`,
      busyStatus: "Band",
      busyDays: "Band kunlar",
    calendarPreview: "Kalendar",
    categoryIds: "Kategoriya IDlari",
    comments: "Izohlar",
    createdAt: "Yaratilgan",
    date: "Sana",
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
    editTitle: "Sanatkorni tahrirlash",
    emptyType: "Bo'sh",
    emptyArtistDetails: "Sanatkor tafsilotlari bo'sh qaytdi",
    email: "Email",
    extraPhone: "Qo'shimcha telefon",
    eyebrow: "Sanatkorlar",
    fieldLabels: {
      administrator_name: "Administrator ismi",
      administrator_phone: "Administrator telefoni",
      albums_count: "Albomlar soni",
      artist_id: "Sanatkor ID",
      bio: "Bio",
      category_ids: "Kategoriya IDlari",
      client_id: "Mijoz ID",
      created_at: "Yaratilgan",
      deleted_at: "O'chirilgan",
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
      phone: "Telefon",
      rating: "Reyting",
      region_id: "Viloyat",
      role: "Rol",
      role_label: "Rol",
      status: "Holat",
      status_label: "Holat",
      title: "Sarlavha",
      type: "Turi",
      updated_at: "Yangilangan",
      user_id: "Foydalanuvchi ID",
    } as Record<string, string>,
    fans: "Muxlislar",
    gallery: "Galereya",
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
    no: "Yo'q",
    noAvailabilityData: "Bo'sh vaqt ma'lumotlari yo'q",
    noVideoHint: "Video topilmadi. Videolar sahifasida sanatkor filter orqali qayta tekshirishingiz mumkin.",
    notFoundTitle: (title: string) => `${title} topilmadi`,
    objectType: "Obyekt",
    oneObject: "1 ta obyekt",
    page: "Sahifa",
    phone: "Telefon",
    price: "Narx",
    profile: "Profil",
    profilePhotoId: "Profile photo ID",
    rating: "Reyting",
    ratings: "Reytinglar",
    recordCount: (count: number) => `${count} ta yozuv`,
    recordNumber: (index: number) => `Yozuv #${index}`,
    region: "Viloyat",
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
    services: "Xizmatlar",
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
    timezone: "Vaqt zonasi",
    title: "Sanatkorlar",
    top: "Top",
    topArtist: "Top sanatkor",
    totalDays: "Jami kunlar",
    unknownType: "Noma'lum",
    updateFailed: "Yangilash bajarilmadi",
    updated: "Sanatkor yangilandi",
    updatedAt: "Yangilangan",
    verified: "Tasdiqlangan",
    verifiedBadge: "Verified",
    videos: "Videolar",
    videosLoading: "Videolar yuklanmoqda...",
    viewInTable: "Jadvalda ko'rish",
    weekdays: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
    yes: "Ha",
  };
}

function categoryId(category: unknown) {
  if (!isRecord(category)) return "";
  const id = category.id;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
}
