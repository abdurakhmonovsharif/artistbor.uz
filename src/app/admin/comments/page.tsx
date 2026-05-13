"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Input, Select } from "antd";
import {
  CheckCircle2,
  Eye,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import {
  adminActionButtonClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  artistsApi,
  commentsApi,
  type CommentFilters,
  type UpdateCommentPayload,
} from "@/lib/api/admin-content";
import { getArtistSelectOptions } from "@/lib/artist-display";
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
  { key: "artist_id", label: "Sanatkor ID", kind: "number" },
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
  { key: "artist_id", label: "Sanatkor ID" },
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

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    setFilters({ ...initialFilters, page: 1, limit });
    setDraftFilters(initialFilters);
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
          Sanatkorlarga yozilgan izohlarni ko&apos;rish, filterlash va moderatsiya qilish.
        </p>
      </div>

      <div className="inline-flex rounded-[22px] border border-slate-200 bg-white p-1 shadow-sm shadow-slate-950/[0.03] dark:border-white/10 dark:bg-[#111827]">
        <TabButton active={tab === "all"} onClick={() => changeTab("all")}>
          Barcha
        </TabButton>
        <TabButton active={tab === "pending"} onClick={() => changeTab("pending")}>
          Kutilayotganlar
        </TabButton>
      </div>

      {tab === "all" ? (
        <AdminFilterForm
          onSubmit={applyFilters}
          gridClassName="md:grid-cols-[minmax(150px,0.7fr)_minmax(180px,1fr)_minmax(140px,0.65fr)_auto] md:items-center"
          mobileLabel="Qidirish"
        >
            <Select
              className={`${adminFilterControlClass} h-10`}
              value={draftFilters.status ?? ""}
              options={[
                { label: "Holat: Barchasi", value: "" },
                { label: "Kutilmoqda", value: 0 },
                { label: "Published", value: 1 },
              ]}
              onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
            />
            <Select
              className={`${adminFilterControlClass} h-10`}
              loading={artistsLoading}
              value={draftFilters.artist_id ?? ""}
              options={[
                { label: artistsLoading ? "Sanatkor yuklanmoqda..." : "Sanatkor: Barchasi", value: "" },
                ...getArtistSelectOptions(artistOptions, draftFilters.artist_id),
              ]}
              onChange={(artist_id) => setDraftFilters((current) => ({ ...current, artist_id }))}
            />
            <Input
              className={`${adminFilterControlClass} h-10`}
              type="number"
              value={draftFilters.client_id ?? ""}
              placeholder="Mijoz ID"
              onChange={(event) => setDraftFilters((current) => ({ ...current, client_id: event.target.value }))}
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
        <AdminDrawer title="Izoh tafsilotlari" onClose={() => setDialog(null)} size="min(100vw, 720px)">
          <div className="p-4">
            <DetailGrid record={dialog.comment} fields={commentDetailFields} />
          </div>
        </AdminDrawer>
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
    <AdminDrawer title="Izohni tahrirlash" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 p-4">
        <FormField
          compact
          label="Comment"
          type="textarea"
          rows={4}
          value={values.comment}
          onChange={(commentValue) => setValues((current) => ({ ...current, comment: commentValue }))}
        />
        <FormField
          compact
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
    </AdminDrawer>
  );
}

function FormActions({ loading, onClose }: { loading: boolean; onClose: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onClose}
        className={adminActionButtonClass}
      >
        <XCircle className="size-4" />
        Bekor qilish
      </button>
      <button
        type="submit"
        disabled={loading}
        className={adminPrimaryActionButtonClass}
      >
        <CheckCircle2 className="size-4" />
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
        "rounded-[18px] px-5 py-3 text-sm font-semibold transition",
        active
          ? "bg-[#fff7e6] text-[#ad6800] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.16)] dark:bg-[#453821] dark:text-amber-400 dark:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.22)]"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.055] dark:hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
