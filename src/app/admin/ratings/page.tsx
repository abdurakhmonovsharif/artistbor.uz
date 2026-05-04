"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Eye, Search, Star, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { artistsApi, ratingsApi, type RatingFilters } from "@/lib/api/admin-content";
import { getArtistId, getArtistName, getArtistSelectOptions } from "@/lib/artist-display";
import { normalizeDate } from "@/lib/utils";
import type { ArtistProfile, ListResult, RatingRecord } from "@/types/api";

type DialogState =
  | { type: "view"; rating: RatingRecord }
  | { type: "delete"; rating: RatingRecord }
  | { type: "artist-ratings"; title: string; rows: RatingRecord[]; loading: boolean; error: string | null }
  | null;

const limit = 20;

const columns: DataTableColumn<RatingRecord>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "artist_id", label: "Artist ID", kind: "number" },
  { key: "client_id", label: "Mijoz ID", kind: "number" },
  { key: "rating", label: "Reyting", kind: "number" },
  { key: "is_published", label: "Ko'rsatilgan", render: (row) => <StatusBadge value={row.is_published} /> },
  {
    key: "created_at",
    label: "Yaratilgan",
    render: (row) => <span>{normalizeDate(row.created_at)}</span>,
  },
];

const ratingDetailFields: DetailField[] = [
  { key: "id", label: "ID" },
  { key: "artist_id", label: "Artist ID" },
  { key: "client_id", label: "Mijoz ID" },
  { key: "rating", label: "Reyting" },
  { key: "is_published", label: "Ko'rsatilgan" },
  { key: "created_at", label: "Yaratilgan" },
];

const initialFilters: RatingFilters = {
  artist_id: "",
  client_id: "",
  rating: "",
  is_published: "",
  page: 1,
  limit,
};

export default function RatingsPage() {
  const [filters, setFilters] = useState<RatingFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<RatingFilters>(initialFilters);
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [rows, setRows] = useState<RatingRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<RatingRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ratingsApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reytinglar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRatings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRatings]);

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

  const openDetail = async (row: RatingRecord) => {
    if (!row.id) {
      toast.error("Rating ID topilmadi");
      return;
    }
    setSubmitting(true);
    try {
      const rating = await ratingsApi.detail(row.id);
      setDialog({ type: "view", rating });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Reyting tafsilotlari yuklanmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1, limit: Number(draftFilters.limit) || limit });
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

  const openArtistRatings = async () => {
    const artistId = Number(draftFilters.artist_id || filters.artist_id);
    if (!Number.isFinite(artistId) || artistId <= 0) {
      toast.error("Artist ID kiriting");
      return;
    }
    const artist = artistOptions.find((item) => String(getArtistId(item)) === String(artistId));
    setDialog({
      type: "artist-ratings",
      title: `${artist ? getArtistName(artist) : `Artist #${artistId}`} reytinglari`,
      rows: [],
      loading: true,
      error: null,
    });
    try {
      const result = await ratingsApi.byArtist(artistId, 1, limit);
      setDialog({
        type: "artist-ratings",
        title: `${artist ? getArtistName(artist) : `Artist #${artistId}`} reytinglari`,
        rows: result.items,
        loading: false,
        error: null,
      });
    } catch (caught) {
      setDialog({
        type: "artist-ratings",
        title: `${artist ? getArtistName(artist) : `Artist #${artistId}`} reytinglari`,
        rows: [],
        loading: false,
        error: caught instanceof Error ? caught.message : "Artist reytinglari yuklanmadi",
      });
    }
  };

  const deleteRating = async () => {
    if (dialog?.type !== "delete" || !dialog.rating.id) return;
    setSubmitting(true);
    try {
      await ratingsApi.delete(dialog.rating.id);
      toast.success("Reyting ochirildi");
      setDialog(null);
      await fetchRatings();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Ochirish bajarilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const page = Number(filters.page ?? 1);
  const pageCount =
    meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
          Reytinglar
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Reytinglar
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Artist reytinglarini ko&apos;rish, filterlash va moderatsiya qilish.
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-5">
          <FormField
            label={artistsLoading ? "Artist yuklanmoqda..." : "Artist"}
            type="select"
            value={draftFilters.artist_id ?? ""}
            options={getArtistSelectOptions(artistOptions, draftFilters.artist_id)}
            onChange={(artist_id) => setDraftFilters((current) => ({ ...current, artist_id }))}
          />
          <FormField
            label="Mijoz ID"
            type="number"
            value={draftFilters.client_id ?? ""}
            onChange={(client_id) => setDraftFilters((current) => ({ ...current, client_id }))}
          />
          <FormField
            label="Rating"
            type="number"
            value={draftFilters.rating ?? ""}
            onChange={(rating) => setDraftFilters((current) => ({ ...current, rating }))}
          />
          <FormField
            label="Published"
            type="select"
            value={draftFilters.is_published ?? ""}
            options={[
              { label: "Kutilmoqda", value: 0 },
              { label: "Published", value: 1 },
            ]}
            onChange={(is_published) =>
              setDraftFilters((current) => ({ ...current, is_published }))
            }
          />
          <FormField
            label="Limit"
            type="number"
            value={draftFilters.limit ?? limit}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, limit: Number(value) || limit }))
            }
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={openArtistRatings}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 px-5 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-300 dark:hover:bg-amber-400/10"
          >
            <Star className="size-4" />
            Artist reytinglari
          </button>
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
          getRowKey={(row, index) => row.id ?? index}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <IconButton label="Korish" onClick={() => void openDetail(row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton danger label="Ochirish" onClick={() => setDialog({ type: "delete", rating: row })}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          )}
        />
      )}

      {pageCount ? (
        <Pagination
          meta={meta}
          page={page}
          pageSize={Number(filters.limit) || limit}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      ) : (
        <FallbackPagination
          page={page}
          rowsCount={rows.length}
          pageSize={Number(filters.limit) || limit}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      )}

      {dialog?.type === "view" ? (
        <Modal title="Reyting tafsilotlari" onClose={() => setDialog(null)} width="max-w-5xl">
          <DetailGrid record={dialog.rating} fields={ratingDetailFields} />
        </Modal>
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          title="Reytingni ochirish"
          message="Reytingni ochirishni tasdiqlaysizmi?"
          confirmLabel="Ochirish"
          onCancel={() => setDialog(null)}
          onConfirm={deleteRating}
        />
      ) : null}

      {dialog?.type === "artist-ratings" ? (
        <Modal title={dialog.title} onClose={() => setDialog(null)} width="max-w-5xl">
          {dialog.loading ? (
            <LoadingState label="Artist reytinglari yuklanmoqda..." />
          ) : dialog.error ? (
            <ErrorState message={dialog.error} />
          ) : dialog.rows.length === 0 ? (
            <EmptyState />
          ) : (
            <DataTable columns={columns} rows={dialog.rows} getRowKey={(row, index) => row.id ?? index} />
          )}
        </Modal>
      ) : null}
    </section>
  );
}

function IconButton({
  label,
  children,
  danger,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-xl border p-2 transition ${
        danger
          ? "border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
