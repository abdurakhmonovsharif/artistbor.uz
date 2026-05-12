"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Select } from "antd";
import { ExternalLink, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { artistsApi, artistVideosApi, type ArtistVideoFilters } from "@/lib/api/admin-content";
import { getArtistId, getArtistName, getArtistSelectOptions } from "@/lib/artist-display";
import { normalizeDate } from "@/lib/utils";
import type { ArtistProfile, ArtistVideoRecord } from "@/types/api";

const initialFilters: ArtistVideoFilters = {
  artist_id: "",
};

export default function ArtistVideosPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<ArtistVideoFilters>(() => filtersFromUrl());
  const [draftFilters, setDraftFilters] = useState<ArtistVideoFilters>(() => filtersFromUrl());
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [rows, setRows] = useState<ArtistVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const artistNameById = new Map(
    artistOptions
      .map((artist) => {
        const artistId = getArtistId(artist);
        return artistId === undefined ? undefined : [String(artistId), getArtistName(artist)] as const;
      })
      .filter(Boolean) as [string, string][],
  );
  const columns = getVideoColumns(artistNameById);

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

  const applyArtistFilter = (artist_id: ArtistVideoFilters["artist_id"]) => {
    const nextFilters = { artist_id };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    syncUrl(nextFilters, router);
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
          Sanatkor videolari
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Sanatkorlarga biriktirilgan videolarni ko&apos;rish va sanatkor bo&apos;yicha filterlash.
        </p>
      </div>

      <AdminFilterForm
        onSubmit={applyFilters}
        gridClassName="md:grid-cols-[minmax(180px,1fr)_auto] md:items-center"
        mobileLabel="Qidirish"
      >
          <Select
            className={`${adminFilterControlClass} h-10`}
            loading={artistsLoading}
            value={draftFilters.artist_id ?? ""}
            options={[
              { label: artistsLoading ? "Sanatkor yuklanmoqda..." : "Sanatkor: Barchasi", value: "" },
              ...getArtistSelectOptions(artistOptions, draftFilters.artist_id),
            ]}
            onChange={applyArtistFilter}
          />
          <Button
            htmlType="button"
            className={`${adminFilterActionClass} h-10`}
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            Tozalash
          </Button>
      </AdminFilterForm>

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

function getVideoColumns(artistNameById: Map<string, string>): DataTableColumn<ArtistVideoRecord>[] {
  return [
    { key: "id", label: "ID", kind: "number" },
    {
      key: "artist_id",
      label: "Sanatkor",
      render: (row) => artistNameById.get(String(row.artist_id)) ?? `Sanatkor #${row.artist_id ?? "—"}`,
    },
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
    { key: "is_active", label: "Faol", render: (row) => <StatusBadge value={row.is_active} /> },
    { key: "created_at", label: "Yaratilgan", render: (row) => normalizeDate(row.created_at) },
  ];
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
