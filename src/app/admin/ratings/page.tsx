"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Select } from "antd";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { artistsApi, ratingsApi, type RatingFilters } from "@/lib/api/admin-content";
import { getArtistSelectOptions } from "@/lib/artist-display";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { normalizeDate } from "@/lib/utils";
import type { ArtistProfile, ListResult, RatingRecord } from "@/types/api";

type DialogState =
  | { type: "view"; rating: RatingRecord }
  | { type: "delete"; rating: RatingRecord }
  | null;

const limit = 20;

type RatingLabels = ReturnType<typeof getRatingLabels>;

const getRatingColumns = (labels: RatingLabels): DataTableColumn<RatingRecord>[] => [
  { key: "id", label: "ID", kind: "number" },
  { key: "artist_id", label: labels.artistId, kind: "number" },
  { key: "client_id", label: labels.clientId, kind: "number" },
  { key: "rating", label: labels.rating, kind: "number" },
  {
    key: "is_published",
    label: labels.isPublished,
    render: (row) => <StatusBadge value={row.is_published} fieldKey="is_published" />,
  },
  {
    key: "created_at",
    label: labels.createdAt,
    render: (row) => <span>{normalizeDate(row.created_at)}</span>,
  },
];

const getRatingDetailFields = (labels: RatingLabels): DetailField[] => [
  { key: "id", label: "ID" },
  { key: "artist_id", label: labels.artistId },
  { key: "client_id", label: labels.clientId },
  { key: "rating", label: labels.rating },
  { key: "is_published", label: labels.isPublished },
  { key: "created_at", label: labels.createdAt },
];

const initialFilters: RatingFilters = {
  artist_id: "",
  is_published: "",
  page: 1,
  limit,
};

export default function RatingsPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getRatingLabels(locale), [locale]);
  const columns = useMemo(() => getRatingColumns(labels), [labels]);
  const ratingDetailFields = useMemo(() => getRatingDetailFields(labels), [labels]);
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
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed]);

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
      toast.error(labels.idNotFound);
      return;
    }
    setSubmitting(true);
    try {
      const rating = await ratingsApi.detail(row.id);
      setDialog({ type: "view", rating });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1, limit: Number(draftFilters.limit) || limit });
  };

  const applySelectFilter = <K extends "artist_id" | "is_published">(key: K, value: RatingFilters[K]) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
      limit: Number(current.limit) || limit,
    }));
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

  const deleteRating = async () => {
    if (dialog?.type !== "delete" || !dialog.rating.id) return;
    setSubmitting(true);
    try {
      await ratingsApi.delete(dialog.rating.id);
      toast.success(labels.deleted);
      setDialog(null);
      await fetchRatings();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.deleteFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const page = Number(filters.page ?? 1);
  const pageCount =
    meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="artistbor-admin-page w-full space-y-4">
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

      <AdminFilterForm
        onSubmit={applyFilters}
        gridClassName="md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center"
        mobileLabel={labels.search}
      >
          <Select
            className={`${adminFilterControlClass} h-10`}
            loading={artistsLoading}
            value={draftFilters.artist_id ?? ""}
            options={[
              { label: artistsLoading ? labels.artistLoading : labels.artistAll, value: "" },
              ...getArtistSelectOptions(artistOptions, draftFilters.artist_id),
            ]}
            onChange={(artist_id) => applySelectFilter("artist_id", artist_id)}
          />
          <Select
            className={`${adminFilterControlClass} h-10`}
            value={draftFilters.is_published ?? ""}
            options={[
              { label: labels.publishedAll, value: "" },
              { label: labels.pending, value: 0 },
              { label: labels.publishedStatus, value: 1 },
            ]}
            onChange={(is_published) => applySelectFilter("is_published", is_published)}
          />
          <Button
            htmlType="button"
            className={`${adminFilterActionClass} h-10 md:col-start-4`}
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
          getRowKey={(row, index) => row.id ?? index}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <IconButton label={labels.viewAction} onClick={() => void openDetail(row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton danger label={labels.deleteAction} onClick={() => setDialog({ type: "delete", rating: row })}>
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
        <AdminDrawer title={labels.detailTitle} onClose={() => setDialog(null)} size="min(100vw, 720px)">
          <div className="p-4">
            <DetailGrid record={dialog.rating} fields={ratingDetailFields} />
          </div>
        </AdminDrawer>
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          title={labels.deleteTitle}
          message={labels.deleteMessage}
          confirmLabel={labels.deleteAction}
          onCancel={() => setDialog(null)}
          onConfirm={deleteRating}
        />
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
      className={`cursor-pointer rounded-xl border p-2 transition ${
        danger
          ? "border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function getRatingLabels(locale: string) {
  if (locale === "ru") {
    return {
      artistAll: "Артист: Все",
      artistId: "ID артиста",
      artistLoading: "Артисты загружаются...",
      clientId: "ID клиента",
      createdAt: "Создано",
      deleted: "Рейтинг удален",
      deleteAction: "Удалить",
      deleteFailed: "Не удалось удалить рейтинг",
      deleteMessage: "Подтвердите удаление рейтинга.",
      deleteTitle: "Удалить рейтинг",
      description: "Просмотр, фильтрация и модерация рейтингов артистов.",
      detailLoadFailed: "Не удалось загрузить детали рейтинга",
      detailTitle: "Детали рейтинга",
      eyebrow: "Рейтинги",
      idNotFound: "ID рейтинга не найден",
      isPublished: "Показан",
      loadFailed: "Не удалось загрузить рейтинги",
      pending: "Ожидает",
      publishedAll: "Показ: Все",
      publishedStatus: "Показан",
      rating: "Рейтинг",
      reset: "Сбросить",
      search: "Поиск",
      title: "Рейтинги",
      viewAction: "Просмотр",
    };
  }

  return {
    artistAll: "Sanatkor: Barchasi",
    artistId: "Sanatkor ID",
    artistLoading: "Sanatkorlar yuklanmoqda...",
    clientId: "Mijoz ID",
    createdAt: "Yaratilgan",
    deleted: "Reyting o'chirildi",
    deleteAction: "O'chirish",
    deleteFailed: "O'chirish bajarilmadi",
    deleteMessage: "Reytingni o'chirishni tasdiqlaysizmi?",
    deleteTitle: "Reytingni o'chirish",
    description: "Sanatkor reytinglarini ko'rish, filterlash va moderatsiya qilish.",
    detailLoadFailed: "Reyting tafsilotlari yuklanmadi",
    detailTitle: "Reyting tafsilotlari",
    eyebrow: "Reytinglar",
    idNotFound: "Reyting ID topilmadi",
    isPublished: "Ko'rsatilgan",
    loadFailed: "Reytinglar yuklanmadi",
    pending: "Kutilmoqda",
    publishedAll: "Ko'rsatish: Barchasi",
    publishedStatus: "Ko'rsatilgan",
    rating: "Reyting",
    reset: "Tozalash",
    search: "Qidirish",
    title: "Reytinglar",
    viewAction: "Ko'rish",
  };
}
