"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  artistsApi,
  commentsApi,
  type CommentFilters,
  type UpdateCommentPayload,
} from "@/lib/api/admin-content";
import { getArtistId, getArtistName, getArtistSelectOptions } from "@/lib/artist-display";
import { cn, normalizeDate, toDisplay } from "@/lib/utils";
import type { ArtistProfile, CommentRecord, ListResult } from "@/types/api";

type Tab = "all" | "pending";

type DialogState =
  | { type: "view"; comment: CommentRecord }
  | { type: "edit"; comment: CommentRecord }
  | { type: "delete"; comment: CommentRecord }
  | { type: "publish"; comment: CommentRecord }
  | { type: "unpublish"; comment: CommentRecord }
  | { type: "restore"; comment: CommentRecord }
  | { type: "artist-comments"; title: string; rows: CommentRecord[]; loading: boolean; error: string | null }
  | null;

const limit = 20;

const columns: DataTableColumn<CommentRecord>[] = [
  { key: "id", label: "ID", kind: "number" },
  {
    key: "comment",
    label: "Izoh",
    render: (row) => (
      <span className="line-clamp-2 max-w-md text-sm font-semibold text-slate-700 dark:text-slate-200">
        {toDisplay(row.comment ?? row.message ?? row.text)}
      </span>
    ),
  },
  { key: "artist_id", label: "Artist ID", kind: "number" },
  { key: "client_id", label: "Mijoz ID", kind: "number" },
  {
    key: "is_published",
    label: "Ko'rsatilgan",
    render: (row) => <StatusBadge value={row.is_published} />,
  },
  {
    key: "status",
    label: "Holat",
    render: (row) => <StatusBadge value={row.status} />,
  },
  {
    key: "created_at",
    label: "Yaratilgan",
    render: (row) => <span>{normalizeDate(row.created_at)}</span>,
  },
];

const commentDetailFields: DetailField[] = [
  { key: "id", label: "ID" },
  { key: "comment", label: "Izoh" },
  { key: "artist_id", label: "Artist ID" },
  { key: "client_id", label: "Mijoz ID" },
  { key: "is_published", label: "Ko'rsatilgan" },
  { key: "status", label: "Holat" },
  { key: "created_at", label: "Yaratilgan" },
];

const initialFilters: CommentFilters = {
  status: "",
  artist_id: "",
  client_id: "",
  page: 1,
  limit,
};

export default function CommentsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [filters, setFilters] = useState<CommentFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<CommentFilters>(initialFilters);
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [rows, setRows] = useState<CommentRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<CommentRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result =
        tab === "pending"
          ? await commentsApi.pending(filters.page, filters.limit)
          : await commentsApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Izohlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters, tab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchComments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchComments]);

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

  const openDialog = async (type: "view" | "edit", row: CommentRecord) => {
    if (!row.id) {
      toast.error("Comment ID topilmadi");
      return;
    }
    setSubmitting(true);
    try {
      const comment = await commentsApi.detail(row.id);
      setDialog({ type, comment });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Izoh tafsilotlari yuklanmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1, limit });
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit }));
  };

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    setFilters({ ...initialFilters, page: 1, limit });
    setDraftFilters(initialFilters);
  };

  const openArtistComments = async () => {
    const artistId = Number(draftFilters.artist_id || filters.artist_id);
    if (!Number.isFinite(artistId) || artistId <= 0) {
      toast.error("Artist ID kiriting");
      return;
    }
    const artistName = artistOptions.find((artist) => String(getArtistId(artist)) === String(artistId));
    setDialog({
      type: "artist-comments",
      title: `${artistName ? getArtistName(artistName) : `Artist #${artistId}`} izohlari`,
      rows: [],
      loading: true,
      error: null,
    });
    try {
      const result = await commentsApi.byArtist(artistId);
      setDialog({
        type: "artist-comments",
        title: `${artistName ? getArtistName(artistName) : `Artist #${artistId}`} izohlari`,
        rows: result.items,
        loading: false,
        error: null,
      });
    } catch (caught) {
      setDialog({
        type: "artist-comments",
        title: `${artistName ? getArtistName(artistName) : `Artist #${artistId}`} izohlari`,
        rows: [],
        loading: false,
        error: caught instanceof Error ? caught.message : "Artist izohlari yuklanmadi",
      });
    }
  };

  const runAction = async (type: "delete" | "publish" | "unpublish" | "restore") => {
    if (!dialog || dialog.type !== type || !dialog.comment.id) return;
    setSubmitting(true);
    try {
      if (type === "delete") {
        await commentsApi.delete(dialog.comment.id);
        toast.success("Izoh ochirildi");
      } else if (type === "publish") {
        await commentsApi.publish(dialog.comment.id);
        toast.success("Izoh ko'rsatildi");
      } else if (type === "unpublish") {
        await commentsApi.unpublish(dialog.comment.id);
        toast.success("Izoh yashirildi");
      } else {
        await commentsApi.restore(dialog.comment.id);
        toast.success("Izoh tiklandi");
      }
      setDialog(null);
      await fetchComments();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Amal bajarilmadi");
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
          Izohlar
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Izohlar
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Artistlarga yozilgan izohlarni ko&apos;rish, filterlash va moderatsiya qilish.
        </p>
      </div>

      <div className="inline-flex rounded-[22px] border border-slate-100 bg-white p-1 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950">
        <TabButton active={tab === "all"} onClick={() => changeTab("all")}>
          Barcha
        </TabButton>
        <TabButton active={tab === "pending"} onClick={() => changeTab("pending")}>
          Kutilayotganlar
        </TabButton>
      </div>

      {tab === "all" ? (
        <form
          onSubmit={applyFilters}
          className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <FormField
              label="Holat"
              type="select"
              value={draftFilters.status ?? ""}
              options={[
                { label: "Kutilmoqda", value: 0 },
                { label: "Published", value: 1 },
              ]}
              onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
            />
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
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={openArtistComments}
              className="rounded-2xl border border-amber-200 px-5 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-300 dark:hover:bg-amber-400/10"
            >
              Artist izohlari
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
      ) : null}

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
              <IconButton label="Korish" onClick={() => void openDialog("view", row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton label="Tahrirlash" onClick={() => void openDialog("edit", row)}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton label="Ko'rsatish" onClick={() => setDialog({ type: "publish", comment: row })}>
                <CheckCircle2 className="size-4" />
              </IconButton>
              <IconButton label="Unpublish" onClick={() => setDialog({ type: "unpublish", comment: row })}>
                <XCircle className="size-4" />
              </IconButton>
              <IconButton label="Tiklash" onClick={() => setDialog({ type: "restore", comment: row })}>
                <RotateCcw className="size-4" />
              </IconButton>
              <IconButton danger label="Ochirish" onClick={() => setDialog({ type: "delete", comment: row })}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          )}
        />
      )}

      {pageCount ? (
        <Pagination meta={meta} page={page} onPageChange={changePage} />
      ) : (
        <FallbackPagination page={page} rowsCount={rows.length} onPageChange={changePage} />
      )}

      {dialog?.type === "view" ? (
        <Modal title="Izoh tafsilotlari" onClose={() => setDialog(null)} width="max-w-5xl">
          <DetailGrid record={dialog.comment} fields={commentDetailFields} />
        </Modal>
      ) : null}

      {dialog?.type === "edit" ? (
        <EditCommentModal
          comment={dialog.comment}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.comment.id) return;
            setSubmitting(true);
            try {
              await commentsApi.update(dialog.comment.id, payload);
              toast.success("Izoh yangilandi");
              setDialog(null);
              await fetchComments();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Yangilash bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          title="Izohni ochirish"
          message="Izohni ochirishni tasdiqlaysizmi?"
          confirmLabel="Ochirish"
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("delete")}
        />
      ) : null}

      {dialog?.type === "publish" ? (
        <ConfirmDialog
          loading={submitting}
          title="Izohni ko'rsatish"
          message="Izohni ko'rsatishni tasdiqlaysizmi?"
          confirmLabel="Publish"
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("publish")}
        />
      ) : null}

      {dialog?.type === "unpublish" ? (
        <ConfirmDialog
          loading={submitting}
          title="Izohni yashirish"
          message="Izohni unpublish qilishni tasdiqlaysizmi?"
          confirmLabel="Unpublish"
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("unpublish")}
        />
      ) : null}

      {dialog?.type === "restore" ? (
        <ConfirmDialog
          loading={submitting}
          title="Izohni tiklash"
          message="Izohni tiklashni tasdiqlaysizmi?"
          confirmLabel="Tiklash"
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("restore")}
        />
      ) : null}

      {dialog?.type === "artist-comments" ? (
        <Modal title={dialog.title} onClose={() => setDialog(null)} width="max-w-5xl">
          {dialog.loading ? (
            <LoadingState label="Artist izohlari yuklanmoqda..." />
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

function EditCommentModal({
  comment,
  loading,
  onClose,
  onSubmit,
}: {
  comment: CommentRecord;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateCommentPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    comment: typeof comment.comment === "string" ? comment.comment : "",
    is_published:
      typeof comment.is_published === "number" || typeof comment.is_published === "string"
        ? String(comment.is_published)
        : "",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: UpdateCommentPayload = {};
    if (values.comment) payload.comment = values.comment;
    if (values.is_published !== "") payload.is_published = Number(values.is_published);
    await onSubmit(payload);
  };

  return (
    <Modal title="Izohni tahrirlash" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <FormField
          label="Comment"
          type="textarea"
          rows={4}
          value={values.comment}
          onChange={(commentValue) => setValues((current) => ({ ...current, comment: commentValue }))}
        />
        <FormField
          label="Published"
          type="select"
          value={values.is_published}
          options={[
            { label: "Kutilmoqda", value: 0 },
            { label: "Published", value: 1 },
          ]}
          onChange={(is_published) => setValues((current) => ({ ...current, is_published }))}
        />
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </Modal>
  );
}

function FormActions({ loading, onClose }: { loading: boolean; onClose: () => void }) {
  return (
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

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[18px] px-5 py-3 text-sm font-black transition",
        active
          ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
          : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function FallbackPagination({
  page,
  rowsCount,
  onPageChange,
}: {
  page: number;
  rowsCount: number;
  onPageChange: (page: number) => void;
}) {
  if (page <= 1 && rowsCount < limit) return null;
  return (
    <div className="flex justify-end gap-2 rounded-[22px] border border-slate-100 bg-white px-5 py-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-950">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-xl border border-slate-200 px-4 py-2 font-black disabled:opacity-40 dark:border-white/10"
      >
        Oldingi
      </button>
      <span className="rounded-xl bg-amber-100 px-4 py-2 font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
        {page}
      </span>
      <button
        type="button"
        disabled={rowsCount < limit}
        onClick={() => onPageChange(page + 1)}
        className="rounded-xl border border-slate-200 px-4 py-2 font-black disabled:opacity-40 dark:border-white/10"
      >
        Keyingi
      </button>
    </div>
  );
}
