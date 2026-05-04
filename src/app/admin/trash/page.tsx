"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { trashApi, type TrashModel } from "@/lib/api/admin-content";
import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type { ListResult, TrashRecord, UnknownRecord } from "@/types/api";

type TrashFilters = {
  q: string;
  model: TrashModel | "";
  page: number;
  limit: number;
};

type DialogState =
  | { type: "view"; record: TrashRecord }
  | { type: "restore"; record: TrashRecord }
  | { type: "delete"; record: TrashRecord }
  | null;

const trashModels: { label: string; value: TrashModel }[] = [
  { label: "User", value: "user" },
  { label: "Booking", value: "booking" },
  { label: "Order", value: "order" },
  { label: "Artist busy slot", value: "artist-busy-slot" },
  { label: "Service", value: "service" },
  { label: "Artist application", value: "artist-application" },
  { label: "Artist profile", value: "artist-profile" },
  { label: "Mijoz profili", value: "client-profile" },
  { label: "User profile", value: "user-profile" },
  { label: "Category", value: "category" },
  { label: "Artist service", value: "artist-service" },
  { label: "File", value: "file" },
  { label: "Artist gallery", value: "artist-gallery" },
];

const limit = 20;

const initialFilters: TrashFilters = {
  q: "",
  model: "user",
  page: 1,
  limit,
};

const trashDetailFields: DetailField[] = [
  { key: "id", label: "ID" },
  { key: "model", label: "Model" },
  { key: "type", label: "Turi" },
  { key: "name", label: "Nomi" },
  { key: "title", label: "Sarlavha" },
  { key: "status", label: "Holat" },
  { key: "deleted_at", label: "O'chirilgan" },
  { key: "created_at", label: "Yaratilgan" },
];

export default function TrashPage() {
  const [filters, setFilters] = useState<TrashFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<TrashFilters>(initialFilters);
  const [stats, setStats] = useState<UnknownRecord | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [rows, setRows] = useState<TrashRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<TrashRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const selectedModel = filters.model || "user";
  const selectedModelLabel = getModelLabel(selectedModel);
  const isSearchMode = Boolean(filters.q.trim());

  const columns = useMemo<DataTableColumn<TrashRecord>[]>(
    () => [
      { key: "id", label: "ID", kind: "number" },
      {
        key: "__model",
        label: "Model",
        render: (row) => (
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {getTrashRowModelLabel(row, selectedModelLabel)}
          </span>
        ),
      },
      {
        key: "__name",
        label: "Nomi",
        render: (row) => (
          <span className="line-clamp-2 max-w-xs text-sm font-black text-slate-900 dark:text-white">
            {toDisplay(row.name ?? row.title ?? row.full_name ?? row.phone ?? row.slug)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Holat",
        render: (row) => <StatusBadge value={row.status ?? row.status_label} />,
      },
      {
        key: "__date",
        label: "Sana",
        render: (row) => (
          <span>
            {normalizeDate(row.deleted_at ?? row.created_at)}
          </span>
        ),
      },
    ],
    [selectedModelLabel],
  );

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const result = await trashApi.stats();
      setStats(isRecord(result) ? result : null);
    } catch (caught) {
      setStatsError(caught instanceof Error ? caught.message : "O'chirilganlar statistikasi yuklanmadi");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!filters.model) {
      setError("Model tanlang");
      setRows([]);
      setMeta(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = filters.q.trim()
        ? await trashApi.search({ q: filters.q.trim(), model: filters.model })
        : await trashApi.list(filters.model, { page: filters.page, limit: filters.limit });
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ochirib tashlangan yozuvlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStats();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRecords();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRecords]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1, limit: Number(draftFilters.limit) || limit });
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const refresh = async () => {
    await Promise.all([fetchStats(), fetchRecords()]);
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const openDetail = async (row: TrashRecord) => {
    const id = getNumericId(row);
    const model = getActionModel(row, filters.model);
    if (!model || !id) {
      toast.error("Model yoki ID topilmadi");
      return;
    }

    setSubmitting(true);
    try {
      const record = await trashApi.detail(model, id);
      setDialog({ type: "view", record });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "O'chirilgan yozuv tafsilotlari yuklanmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const restoreRecord = async () => {
    if (dialog?.type !== "restore") return;
    const id = getNumericId(dialog.record);
    const model = getActionModel(dialog.record, filters.model);
    if (!model || !id) {
      toast.error("Model yoki ID topilmadi");
      return;
    }

    setSubmitting(true);
    try {
      await trashApi.restore(model, id);
      toast.success("Yozuv qayta tiklandi");
      setDialog(null);
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Qayta tiklash bajarilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const permanentlyDeleteRecord = async () => {
    if (dialog?.type !== "delete") return;
    const id = getNumericId(dialog.record);
    const model = getActionModel(dialog.record, filters.model);
    if (!model || !id) {
      toast.error("Model yoki ID topilmadi");
      return;
    }

    setSubmitting(true);
    try {
      await trashApi.permanentlyDelete(model, id);
      toast.success("Yozuv butunlay ochirildi");
      setDialog(null);
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Butunlay ochirish bajarilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const page = Number(filters.page ?? 1);
  const pageCount = isSearchMode
    ? undefined
    : meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            O&apos;chirilganlar
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            O&apos;chirilganlar
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            O&apos;chirilgan yozuvlarni ko&apos;rish, tiklash yoki butunlay o&apos;chirish.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || statsLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      <StatsSection stats={stats} loading={statsLoading} error={statsError} />

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <FormField
            label="Qidiruv"
            value={draftFilters.q}
            placeholder="q"
            onChange={(q) => setDraftFilters((current) => ({ ...current, q }))}
          />
          <FormField
            label="Model"
            type="select"
            required
            value={draftFilters.model}
            options={trashModels}
            onChange={(model) =>
              setDraftFilters((current) => ({ ...current, model: model as TrashModel | "" }))
            }
          />
          <FormField
            label="Page"
            type="number"
            value={draftFilters.page}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, page: Number(value) || 1 }))
            }
          />
          <FormField
            label="Limit"
            type="number"
            value={draftFilters.limit}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, limit: Number(value) || limit }))
            }
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {isSearchMode
              ? "Qidiruv rejimida natijalar kalit so'z bo'yicha chiqariladi."
              : `${selectedModelLabel} bo'yicha o'chirilgan yozuvlar ko'rsatiladi.`}
          </p>
          <div className="flex flex-wrap justify-end gap-3">
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
          getRowKey={(row, index) => getNumericId(row) ?? index}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <IconButton label="Korish" onClick={() => void openDetail(row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton label="Tiklash" onClick={() => setDialog({ type: "restore", record: row })}>
                <RotateCcw className="size-4" />
              </IconButton>
              <IconButton label="Butunlay ochirish" danger onClick={() => setDialog({ type: "delete", record: row })}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          )}
        />
      )}

      {pageCount ? <Pagination meta={meta} page={page} onPageChange={changePage} /> : null}

      {dialog?.type === "view" ? (
        <Modal title="O'chirilgan yozuv tafsilotlari" onClose={() => setDialog(null)} width="max-w-5xl">
          <DetailGrid record={dialog.record} fields={trashDetailFields} />
        </Modal>
      ) : null}

      {dialog?.type === "restore" ? (
        <ConfirmDialog
          title="Yozuvni tiklash"
          message="Bu yozuv trashdan qayta tiklanadi. Davom etasizmi?"
          confirmLabel="Tiklash"
          loading={submitting}
          onCancel={() => setDialog(null)}
          onConfirm={restoreRecord}
        />
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          title="Butunlay ochirish"
          message="Bu amal yozuvni butunlay ochiradi. Davom etasizmi?"
          confirmLabel="Butunlay ochirish"
          danger
          loading={submitting}
          onCancel={() => setDialog(null)}
          onConfirm={permanentlyDeleteRecord}
        />
      ) : null}
    </section>
  );
}

function StatsSection({
  stats,
  loading,
  error,
}: {
  stats: UnknownRecord | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[24px] border border-slate-100 bg-white shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
          />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;
  if (!stats) return <EmptyState />;

  const entries = Object.entries(stats);
  if (!entries.length) return <EmptyState />;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {key}
          </p>
          <p className="mt-3 line-clamp-2 text-2xl font-black text-slate-950 dark:text-white">
            {toDisplay(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function getModelLabel(model: TrashModel) {
  return trashModels.find((item) => item.value === model)?.label ?? model;
}

function getTrashRowModelLabel(row: TrashRecord, fallback: string) {
  if (typeof row.model === "string" && isTrashModel(row.model)) return getModelLabel(row.model);
  if (typeof row.type === "string") return row.type;
  return fallback;
}

function getNumericId(row: TrashRecord): number | undefined {
  return typeof row.id === "number" ? row.id : undefined;
}

function getActionModel(row: TrashRecord, fallback: TrashModel | ""): TrashModel | undefined {
  if (typeof row.model === "string" && isTrashModel(row.model)) return row.model;
  return fallback || undefined;
}

function isTrashModel(value: string): value is TrashModel {
  return trashModels.some((item) => item.value === value);
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
          ? "border-rose-200 text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-400/20 dark:hover:bg-rose-400/10"
          : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
