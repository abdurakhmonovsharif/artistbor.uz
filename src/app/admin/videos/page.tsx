"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { FormField } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { artistsApi, artistVideosApi, type ArtistVideoFilters } from "@/lib/api/admin-content";
import { getArtistSelectOptions } from "@/lib/artist-display";
import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type { ArtistProfile, ArtistVideoRecord, UnknownRecord } from "@/types/api";

const initialFilters: ArtistVideoFilters = {
  artist_id: "",
};

const columns: DataTableColumn<ArtistVideoRecord>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "artist_id", label: "Artist ID", kind: "number" },
  {
    key: "thumbnail_url",
    label: "Ko'rinish",
    render: (row) => <VideoPreview row={row} />,
  },
  {
    key: "title",
    label: "Sarlavha",
    render: (row) => (
      <div className="min-w-48">
        <p className="line-clamp-2 font-black text-slate-900 dark:text-white">
          {row.title || row.title_uz || row.title_ru || `Video #${row.id ?? "—"}`}
        </p>
        {row.title_uz || row.title_ru ? (
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {[row.title_uz, row.title_ru].filter(Boolean).join(" / ")}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "youtube_url",
    label: "YouTube",
    render: (row) => <VideoLink value={row.youtube_url ?? row.embed_url} />,
  },
  { key: "sort_order", label: "Tartib", kind: "number" },
  { key: "is_active", label: "Faol", render: (row) => <StatusBadge value={row.is_active} /> },
  { key: "created_at", label: "Yaratilgan", render: (row) => normalizeDate(row.created_at) },
  {
    key: "__extra",
    label: "Qo'shimcha",
    render: (row) => <ObjectSummary record={row} />,
  },
];

export default function ArtistVideosPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<ArtistVideoFilters>(() => filtersFromUrl());
  const [draftFilters, setDraftFilters] = useState<ArtistVideoFilters>(() => filtersFromUrl());
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [rows, setRows] = useState<ArtistVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await artistVideosApi.list(filters);
      setRows(result.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Videolar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchVideos();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchVideos]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setArtistsLoading(true);
      try {
        const result = await artistsApi.list({ page: 1, limit: 100 });
        setArtistOptions(result.items);
      } catch {
        setArtistOptions([]);
      } finally {
        setArtistsLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters(draftFilters);
    syncUrl(draftFilters, router);
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    router.replace("/admin/videos", { scroll: false });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
          Videolar
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Artist videolari
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Artistlarga biriktirilgan videolarni ko&apos;rish va artist bo&apos;yicha filterlash.
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <FormField
            label={artistsLoading ? "Artist yuklanmoqda..." : "Artist"}
            type="select"
            value={draftFilters.artist_id ?? ""}
            options={getArtistSelectOptions(artistOptions, draftFilters.artist_id)}
            onChange={(artist_id) => setDraftFilters((current) => ({ ...current, artist_id }))}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
            >
              <X className="size-4" />
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
        </div>
      </form>

      <div className="rounded-[24px] border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Natija
        </p>
        <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
          {rows.length}
        </p>
      </div>

      {loading ? (
        <LoadingState label="Videolar yuklanmoqda..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="Videolar topilmadi" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row, index) => row.id ?? `${row.artist_id ?? "artist"}-${index}`}
        />
      )}
    </section>
  );
}

function VideoPreview({ row }: { row: ArtistVideoRecord }) {
  const image = row.thumbnail_url;

  if (!image) return <span className="text-sm font-semibold text-slate-400">—</span>;

  return (
    <a
      href={row.youtube_url ?? row.embed_url ?? image}
      target="_blank"
      rel="noreferrer"
      className="block size-16 rounded-xl border border-slate-200 bg-cover bg-center dark:border-white/10"
      style={{ backgroundImage: `url(${image})` }}
      aria-label="Video preview"
    />
  );
}

function VideoLink({ value }: { value: unknown }) {
  if (typeof value !== "string" || !value) return <span>—</span>;

  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm font-black text-amber-700 underline decoration-amber-300 underline-offset-4 dark:text-amber-300"
    >
      Ochish
      <ExternalLink className="size-4" />
    </a>
  );
}

function ObjectSummary({ record }: { record: UnknownRecord }) {
  const hiddenKeys = new Set([
    "id",
    "artist_id",
    "thumbnail_url",
    "title",
    "title_uz",
    "title_ru",
    "youtube_url",
    "embed_url",
    "sort_order",
    "is_active",
    "created_at",
  ]);
  const entries = Object.entries(record)
    .filter(([key, value]) => !hiddenKeys.has(key) && value !== undefined && value !== null && value !== "")
    .slice(0, 4);

  if (!entries.length) return <span>—</span>;

  return (
    <div className="space-y-1 text-xs leading-5">
      {entries.map(([key, value]) => (
        <p key={key} className="line-clamp-1">
          <span className="font-black uppercase text-slate-400">{humanizeKey(key)}:</span>{" "}
          <span>{formatValue(value)}</span>
        </p>
      ))}
    </div>
  );
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? `${value.length} ta` : "—";
  if (isRecord(value)) return toDisplay(value);
  return toDisplay(value);
}

function humanizeKey(key: string) {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();
}

function filtersFromUrl(): ArtistVideoFilters {
  if (typeof window === "undefined") return initialFilters;
  const params = new URLSearchParams(window.location.search);
  return { artist_id: params.get("artist_id") ?? "" };
}

function syncUrl(filters: ArtistVideoFilters, router: ReturnType<typeof useRouter>) {
  const params = new URLSearchParams();
  if (filters.artist_id) params.set("artist_id", String(filters.artist_id));
  const query = params.toString();
  router.replace(query ? `/admin/videos?${query}` : "/admin/videos", { scroll: false });
}
