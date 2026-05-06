"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Search } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { isLocationIdKey, LocationName } from "@/components/admin/location-name";
import { useToast } from "@/components/ui/toast";
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

const limit = 20;

const columns: DataTableColumn<ArtistProfile>[] = [
  { key: "id", label: "ID", kind: "number", render: (row) => getArtistId(row) ?? "—" },
  {
    key: "full_name",
    label: "Artist",
    render: (row) => (
      <div className="flex items-center gap-3">
        {row.avatar_url ? (
          <div
            aria-label={getArtistName(row)}
            className="size-10 shrink-0 rounded-full border border-slate-200 bg-cover bg-center dark:border-white/10"
            style={{ backgroundImage: `url(${row.avatar_url})` }}
          />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {getArtistInitials(row)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-black text-slate-900 dark:text-white">{getArtistName(row)}</p>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {row.email || row.phone || "—"}
          </p>
        </div>
      </div>
    ),
  },
  { key: "phone", label: "Telefon", render: (row) => row.phone || row.extra_phone || "—" },
  { key: "status_label", label: "Holat", render: (row) => <StatusBadge value={row.status_label ?? row.status} /> },
  { key: "region_id", label: "Viloyat", kind: "number" },
  { key: "district_id", label: "Tuman", kind: "number" },
  { key: "created_at", label: "Yaratilgan", kind: "date" },
  { key: "rating", label: "Reyting", kind: "number" },
  { key: "is_verified", label: "Tasdiqlangan", render: (row) => <StatusBadge value={row.is_verified} /> },
  { key: "is_top", label: "Top", render: (row) => <StatusBadge value={row.is_top} /> },
];

const initialFilters: ArtistFilters = {
  search: "",
  is_verified: "",
  is_top: "",
  status: "",
  page: 1,
  limit,
};

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: "profile", label: "Profil" },
  { key: "services", label: "Xizmatlar" },
  { key: "availability", label: "Vaqtlar" },
  { key: "gallery", label: "Galereya" },
  { key: "videos", label: "Videolar" },
  { key: "comments", label: "Izohlar" },
  { key: "ratings", label: "Reytinglar" },
];

const resourceTabs: ResourceTab[] = ["services", "availability", "gallery", "videos", "comments", "ratings"];

export default function ArtistsPage() {
  const [filters, setFilters] = useState<ArtistFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ArtistFilters>(initialFilters);
  const [rows, setRows] = useState<ArtistProfile[]>([]);
  const [meta, setMeta] = useState<ListResult<ArtistProfile>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await artistsApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Artistlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
      toast.error(caught instanceof Error ? caught.message : "Artist tafsilotlari yuklanmadi");
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
          Artistlar
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Artistlar
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Artist profillarini ko&apos;rish, filterlash va kerakli ma&apos;lumotlarni yangilash.
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <FormField
            label="Qidiruv"
            value={draftFilters.search ?? ""}
            placeholder="Ism, familiya yoki telefon"
            onChange={(search) => setDraftFilters((current) => ({ ...current, search }))}
          />
          <FormField
            label="Tasdiqlangan"
            type="select"
            value={draftFilters.is_verified ?? ""}
            options={[
              { label: "Ha", value: 1 },
              { label: "Yoq", value: 0 },
            ]}
            onChange={(is_verified) => setDraftFilters((current) => ({ ...current, is_verified }))}
          />
          <FormField
            label="Top"
            type="select"
            value={draftFilters.is_top ?? ""}
            options={[
              { label: "Ha", value: 1 },
              { label: "Yoq", value: 0 },
            ]}
            onChange={(is_top) => setDraftFilters((current) => ({ ...current, is_top }))}
          />
          <FormField
            label="Holat"
            type="number"
            value={draftFilters.status ?? ""}
            onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
          >
            Tozalash
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Search className="size-4" />
            Qidirish
          </button>
        </div>
      </form>

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
              <IconButton label="Korish" onClick={() => void openDialog("view", row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton label="Tahrirlash" onClick={() => void openDialog("edit", row)}>
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

      {dialog?.type === "view" ? (
        <ArtistDetailModal artist={dialog.artist} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.type === "edit" ? (
        <EditArtistModal
          artist={dialog.artist}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            const artistId = getArtistId(dialog.artist);
            if (!artistId) return;
            setSubmitting(true);
            try {
              await artistsApi.update(artistId, payload);
              toast.success("Artist yangilandi");
              setDialog(null);
              await fetchArtists();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Yangilash bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function ArtistDetailModal({
  artist,
  onClose,
}: {
  artist: ArtistProfile;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("profile");
  const [resources, setResources] = useState<Record<ResourceTab, DetailResourceState>>(
    createDetailResources,
  );
  const artistId = getArtistId(artist);

  useEffect(() => {
    setResources(createDetailResources(true));
    if (!artistId) {
      setResources(createDetailResources(false, "Artist ID topilmadi"));
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
            error: caught instanceof Error ? caught.message : "Ma'lumot yuklanmadi",
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
  }, [artistId]);

  return (
    <Modal title="Artist tafsilotlari" onClose={onClose} width="max-w-6xl">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <InfoCard label="ID" value={getArtistId(artist)} />
          <InfoCard label="Ism" value={getArtistName(artist)} />
          <InfoCard label="Telefon" value={artist.phone ?? artist.extra_phone} />
          <InfoCard label="Email" value={artist.email} />
          <InfoCard label="Rol" value={<StatusBadge value={artist.role_label ?? artist.role} />} />
          <InfoCard label="Holat" value={<StatusBadge value={artist.status_label ?? artist.status} />} />
          <InfoCard label="Reyting" value={artist.rating} />
          <InfoCard label="Tasdiqlangan" value={<StatusBadge value={artist.is_verified} />} />
          <InfoCard label="Top" value={<StatusBadge value={artist.is_top} />} />
          <InfoCard label="Yaratilgan" value={normalizeDate(artist.created_at)} />
        </div>

        <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap gap-2">
            {detailTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-2xl px-4 py-2 text-sm font-black transition",
                  activeTab === tab.key
                    ? "bg-amber-400 text-slate-950"
                    : "bg-white text-slate-500 hover:text-slate-950 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white",
                )}
              >
                {tab.label}
                {tab.key !== "profile" ? <TabStateBadge state={resources[tab.key]} /> : null}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {activeTab === "profile" ? (
              <ProfileData artist={artist} />
            ) : activeTab === "videos" ? (
              <ArtistVideosSummary artistId={artistId} state={resources.videos} />
            ) : (
              <ResourcePanel
                title={detailTabs.find((tab) => tab.key === activeTab)?.label ?? activeTab}
                state={resources[activeTab]}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ArtistVideosSummary({
  artistId,
  state,
}: {
  artistId: number | undefined;
  state: DetailResourceState;
}) {
  if (state.loading) return <LoadingState label="Videolar yuklanmoqda..." />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const href = artistId ? `/admin/videos?artist_id=${artistId}` : "/admin/videos";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Artist videolari
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            {rows.length}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Bu artistga biriktirilgan video soni
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
        >
          Jadvalda ko&apos;rish
        </Link>
      </div>
      {rows.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rows.slice(0, 2).map((row, index) => (
            <div
              key={String(resourceRowKey(row, index))}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <ObjectDetails record={row} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
          Video topilmadi. Videolar sahifasida artist filter orqali qayta tekshirishingiz mumkin.
        </div>
      )}
    </div>
  );
}

function ProfileData({ artist }: { artist: ArtistProfile }) {
  const entries = Object.entries(artist).filter(([, value]) => value !== undefined);

  if (!entries.length) return <EmptyState title="Artist tafsilotlari bo'sh qaytdi" />;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <DetailValue key={key} fieldKey={key} value={value} />
        ))}
      </div>
    </div>
  );
}

function ResourcePanel({
  title,
  state,
}: {
  title: string;
  state: DetailResourceState;
}) {
  if (state.loading) return <LoadingState label={`${title} yuklanmoqda...`} />;
  if (state.error) return <ErrorState message={state.error} />;

  const rows = state.rows.length ? state.rows : rowsFromRawResource(state.raw);
  const rawRecord = !state.rows.length && isRecord(state.raw) ? state.raw : null;

  if (!rows.length && !rawRecord) return <EmptyState title={`${title} topilmadi`} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {rows.length ? `${rows.length} ta yozuv` : "1 ta obyekt"}
          </p>
        </div>
        {state.meta ? (
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Page {state.meta.currentPage ?? state.meta.page ?? 1} /{" "}
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
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div
          key={String(resourceRowKey(row, index))}
          className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Yozuv #{index + 1}
            </p>
            {row.id !== undefined ? (
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-500 dark:border-white/10 dark:text-slate-300">
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
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {humanizeKey(fieldKey)}
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
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950"
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
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);

  if (!entries.length) return <span>—</span>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950"
        >
          <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
            {humanizeKey(key)}
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
  if (isLocationIdKey(fieldKey)) {
    return (
      <span className="break-words">
        <LocationName
          fieldKey={fieldKey}
          value={value}
          fallback={formatDisplayValue(fieldKey, value)}
        />
      </span>
    );
  }
  if (isStatusField(fieldKey)) return <StatusBadge value={value} />;

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

  return <span className="break-words">{formatDisplayValue(fieldKey, value)}</span>;
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

function isMetaKey(key: string) {
  return ["meta", "_meta", "pagination", "success", "message", "errors"].includes(key);
}

function humanizeKey(key: string) {
  return key
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

function formatDisplayValue(key: string, value: unknown) {
  if (key.endsWith("_at") || key === "created_at" || key === "updated_at") {
    return normalizeDate(value);
  }
  return toDisplay(value);
}

function EditArtistModal({
  artist,
  loading,
  onClose,
  onSubmit,
}: {
  artist: ArtistProfile;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateArtistPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    category_ids: Array.isArray(artist.categories)
      ? artist.categories.map((category) => categoryId(category)).filter(Boolean).join(", ")
      : "",
    bio: artist.bio ?? "",
    albums_count: artist.albums_count === undefined ? "" : String(artist.albums_count),
    extra_phone: artist.extra_phone ?? "",
    administrator_name: artist.administrator_name ?? "",
    administrator_phone: artist.administrator_phone ?? "",
    profile_photo_id: "",
    is_top: artist.is_top === undefined ? "" : String(artist.is_top),
    rating: artist.rating === undefined ? "" : String(artist.rating),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(buildArtistPayload(values));
  };

  return (
    <Modal title="Artistni tahrirlash" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Kategoriya IDlari"
            value={values.category_ids}
            placeholder="1, 2, 3"
            onChange={(category_ids) => setValues((current) => ({ ...current, category_ids }))}
          />
          <FormField
            label="Albomlar soni"
            type="number"
            value={values.albums_count}
            onChange={(albums_count) => setValues((current) => ({ ...current, albums_count }))}
          />
          <div className="md:col-span-2">
            <FormField
              label="Bio"
              type="textarea"
              value={values.bio}
              rows={4}
              onChange={(bio) => setValues((current) => ({ ...current, bio }))}
            />
          </div>
          <FormField
            label="Qoshimcha telefon"
            value={values.extra_phone}
            onChange={(extra_phone) => setValues((current) => ({ ...current, extra_phone }))}
          />
          <FormField
            label="Administrator ismi"
            value={values.administrator_name}
            onChange={(administrator_name) => setValues((current) => ({ ...current, administrator_name }))}
          />
          <FormField
            label="Administrator telefoni"
            value={values.administrator_phone}
            onChange={(administrator_phone) => setValues((current) => ({ ...current, administrator_phone }))}
          />
          <FormField
            label="Profile photo ID"
            type="number"
            value={values.profile_photo_id}
            onChange={(profile_photo_id) => setValues((current) => ({ ...current, profile_photo_id }))}
          />
          <FormField
            label="Top artist"
            type="select"
            value={values.is_top}
            options={[
              { label: "Ha", value: "true" },
              { label: "Yoq", value: "false" },
            ]}
            onChange={(is_top) => setValues((current) => ({ ...current, is_top }))}
          />
          <FormField
            label="Rating"
            type="number"
            value={values.rating}
            onChange={(rating) => setValues((current) => ({ ...current, rating }))}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-lg shadow-amber-400/25 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function getArtistId(artist: ArtistProfile) {
  return artist.user_id ?? artist.id;
}

function getArtistName(artist: ArtistProfile) {
  const fromParts = [artist.first_name, artist.last_name].filter(Boolean).join(" ").trim();
  return artist.full_name || fromParts || artist.administrator_name || `Artist #${getArtistId(artist) ?? "—"}`;
}

function getArtistInitials(artist: ArtistProfile) {
  const name = getArtistName(artist);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return initials || "A";
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{value ?? "—"}</div>
    </div>
  );
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
      className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
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
  profile_photo_id: string;
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
  if (values.profile_photo_id) payload.profile_photo_id = Number(values.profile_photo_id);
  if (values.is_top) payload.is_top = values.is_top === "true";
  if (values.rating) payload.rating = Number(values.rating);
  return payload;
}

function categoryId(category: unknown) {
  if (!isRecord(category)) return "";
  const id = category.id;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
}
