"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { useI18n } from "@/lib/i18n/i18n-provider";
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

type CommentLabels = ReturnType<typeof getCommentLabels>;

const getCommentColumns = (labels: CommentLabels): DataTableColumn<CommentRecord>[] => [
  { key: "id", label: "ID", kind: "number" },
  {
    key: "comment",
    label: labels.comment,
    render: (row) => (
      <span className="line-clamp-2 max-w-md text-sm font-semibold text-slate-700 dark:text-slate-200">
        {toDisplay(row.comment ?? row.message ?? row.text)}
      </span>
    ),
  },
  { key: "artist_id", label: labels.artistId, kind: "number" },
  { key: "client_id", label: labels.clientId, kind: "number" },
  {
    key: "is_published",
    label: labels.isPublished,
    render: (row) => <StatusBadge value={row.is_published} fieldKey="is_published" />,
  },
  {
    key: "status",
    label: labels.status,
    render: (row) => <StatusBadge value={row.status} fieldKey="status" />,
  },
  {
    key: "created_at",
    label: labels.createdAt,
    render: (row) => <span>{normalizeDate(row.created_at)}</span>,
  },
];

const getCommentDetailFields = (labels: CommentLabels): DetailField[] => [
  { key: "id", label: "ID" },
  { key: "comment", label: labels.comment },
  { key: "artist_id", label: labels.artistId },
  { key: "client_id", label: labels.clientId },
  { key: "is_published", label: labels.isPublished },
  { key: "status", label: labels.status },
  { key: "created_at", label: labels.createdAt },
];

const initialFilters: CommentFilters = {
  status: "",
  artist_id: "",
  client_id: "",
  page: 1,
  limit,
};

export default function CommentsPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getCommentLabels(locale), [locale]);
  const columns = useMemo(() => getCommentColumns(labels), [labels]);
  const commentDetailFields = useMemo(() => getCommentDetailFields(labels), [labels]);
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
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed, tab]);

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
      toast.error(labels.idNotFound);
      return;
    }
    setSubmitting(true);
    try {
      const comment = await commentsApi.detail(row.id);
      setDialog({ type, comment });
    } catch (caught) {
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
        toast.success(labels.deleted);
      } else if (type === "publish") {
        await commentsApi.publish(dialog.comment.id);
        toast.success(labels.published);
      } else if (type === "unpublish") {
        await commentsApi.unpublish(dialog.comment.id);
        toast.success(labels.unpublished);
      } else {
        await commentsApi.restore(dialog.comment.id);
        toast.success(labels.restored);
      }
      setDialog(null);
      await fetchComments();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.actionFailed);
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

      <div className="inline-flex rounded-[18px] border border-slate-200 bg-white p-1 shadow-none dark:border-white/10 dark:bg-[#111827]">
        <TabButton active={tab === "all"} onClick={() => changeTab("all")}>
          {labels.allTab}
        </TabButton>
        <TabButton active={tab === "pending"} onClick={() => changeTab("pending")}>
          {labels.pendingTab}
        </TabButton>
      </div>

      {tab === "all" ? (
        <AdminFilterForm
          onSubmit={applyFilters}
          gridClassName="md:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] md:items-center"
          mobileLabel={labels.search}
        >
            <Select
              className={`${adminFilterControlClass} h-10`}
              value={draftFilters.status ?? ""}
              options={[
                { label: labels.statusAll, value: "" },
                { label: labels.pending, value: 0 },
                { label: labels.publishedStatus, value: 1 },
              ]}
              onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
            />
            <Select
              className={`${adminFilterControlClass} h-10`}
              loading={artistsLoading}
              value={draftFilters.artist_id ?? ""}
              options={[
                { label: artistsLoading ? labels.artistLoading : labels.artistAll, value: "" },
                ...getArtistSelectOptions(artistOptions, draftFilters.artist_id),
              ]}
              onChange={(artist_id) => setDraftFilters((current) => ({ ...current, artist_id }))}
            />
            <Input
              className={`${adminFilterControlClass} h-10`}
              type="number"
              value={draftFilters.client_id ?? ""}
              placeholder={labels.clientId}
              onChange={(event) => setDraftFilters((current) => ({ ...current, client_id: event.target.value }))}
            />
            <Button
              htmlType="button"
              className={`${adminFilterActionClass} h-10 md:col-start-5`}
              icon={<RotateCcw className="size-4" />}
              onClick={resetFilters}
            >
              {labels.reset}
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
              <IconButton label={labels.viewAction} onClick={() => void openDialog("view", row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton label={labels.editAction} onClick={() => void openDialog("edit", row)}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton label={labels.publishAction} onClick={() => setDialog({ type: "publish", comment: row })}>
                <CheckCircle2 className="size-4" />
              </IconButton>
              <IconButton label={labels.unpublishAction} onClick={() => setDialog({ type: "unpublish", comment: row })}>
                <XCircle className="size-4" />
              </IconButton>
              <IconButton label={labels.restoreAction} onClick={() => setDialog({ type: "restore", comment: row })}>
                <RotateCcw className="size-4" />
              </IconButton>
              <IconButton danger label={labels.deleteAction} onClick={() => setDialog({ type: "delete", comment: row })}>
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
            <DetailGrid record={dialog.comment} fields={commentDetailFields} />
          </div>
        </AdminDrawer>
      ) : null}

      {dialog?.type === "edit" ? (
        <EditCommentModal
          comment={dialog.comment}
          labels={labels}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.comment.id) return;
            setSubmitting(true);
            try {
              await commentsApi.update(dialog.comment.id, payload);
              toast.success(labels.updated);
              setDialog(null);
              await fetchComments();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.updateFailed);
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
          title={labels.deleteTitle}
          message={labels.deleteMessage}
          confirmLabel={labels.deleteAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("delete")}
        />
      ) : null}

      {dialog?.type === "publish" ? (
        <ConfirmDialog
          loading={submitting}
          title={labels.publishTitle}
          message={labels.publishMessage}
          confirmLabel={labels.publishAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("publish")}
        />
      ) : null}

      {dialog?.type === "unpublish" ? (
        <ConfirmDialog
          loading={submitting}
          title={labels.unpublishTitle}
          message={labels.unpublishMessage}
          confirmLabel={labels.unpublishAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("unpublish")}
        />
      ) : null}

      {dialog?.type === "restore" ? (
        <ConfirmDialog
          loading={submitting}
          title={labels.restoreTitle}
          message={labels.restoreMessage}
          confirmLabel={labels.restoreAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runAction("restore")}
        />
      ) : null}

    </section>
  );
}

function EditCommentModal({
  comment,
  labels,
  loading,
  onClose,
  onSubmit,
}: {
  comment: CommentRecord;
  labels: CommentLabels;
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
    <AdminDrawer title={labels.editTitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 p-4">
        <FormField
          compact
          label={labels.comment}
          type="textarea"
          rows={4}
          value={values.comment}
          onChange={(commentValue) => setValues((current) => ({ ...current, comment: commentValue }))}
        />
        <FormField
          compact
          label={labels.isPublished}
          type="select"
          value={values.is_published}
          options={[
            { label: labels.pending, value: 0 },
            { label: labels.publishedStatus, value: 1 },
          ]}
          onChange={(is_published) => setValues((current) => ({ ...current, is_published }))}
        />
        <FormActions labels={labels} loading={loading} onClose={onClose} />
      </form>
    </AdminDrawer>
  );
}

function FormActions({
  labels,
  loading,
  onClose,
}: {
  labels: CommentLabels;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onClose}
        className={adminActionButtonClass}
      >
        <XCircle className="size-4" />
        {labels.closeAction}
      </button>
      <button
        type="submit"
        disabled={loading}
        className={adminPrimaryActionButtonClass}
      >
        <CheckCircle2 className="size-4" />
        {loading ? labels.saving : labels.saveAction}
      </button>
    </div>
  );
}

function getCommentLabels(locale: string) {
  if (locale === "ru") {
    return {
      actionFailed: "Не удалось выполнить действие",
      allTab: "Все",
      artistAll: "Артист: Все",
      artistId: "ID артиста",
      artistLoading: "Артисты загружаются...",
      clientId: "ID клиента",
      closeAction: "Закрыть",
      comment: "Комментарий",
      createdAt: "Создано",
      deleted: "Комментарий удален",
      deleteAction: "Удалить",
      deleteMessage: "Подтвердите удаление комментария.",
      deleteTitle: "Удалить комментарий",
      description: "Просмотр, фильтрация и модерация комментариев к артистам.",
      detailLoadFailed: "Не удалось загрузить детали комментария",
      detailTitle: "Детали комментария",
      editAction: "Редактировать",
      editTitle: "Редактировать комментарий",
      eyebrow: "Комментарии",
      idNotFound: "ID комментария не найден",
      isPublished: "Показан",
      loadFailed: "Не удалось загрузить комментарии",
      pending: "Ожидает",
      pendingTab: "Ожидающие",
      published: "Комментарий опубликован",
      publishedStatus: "Показан",
      publishAction: "Показать",
      publishMessage: "Подтвердите публикацию комментария.",
      publishTitle: "Показать комментарий",
      reset: "Сбросить",
      restoreAction: "Восстановить",
      restoreMessage: "Подтвердите восстановление комментария.",
      restoreTitle: "Восстановить комментарий",
      restored: "Комментарий восстановлен",
      saveAction: "Сохранить",
      saving: "Сохранение...",
      search: "Поиск",
      status: "Статус",
      statusAll: "Статус: Все",
      title: "Комментарии",
      unpublished: "Комментарий скрыт",
      unpublishAction: "Скрыть",
      unpublishMessage: "Подтвердите скрытие комментария.",
      unpublishTitle: "Скрыть комментарий",
      updated: "Комментарий обновлен",
      updateFailed: "Не удалось обновить комментарий",
      viewAction: "Просмотр",
    };
  }

  return {
    actionFailed: "Amal bajarilmadi",
    allTab: "Barchasi",
    artistAll: "Sanatkor: Barchasi",
    artistId: "Sanatkor ID",
    artistLoading: "Sanatkorlar yuklanmoqda...",
    clientId: "Mijoz ID",
    closeAction: "Yopish",
    comment: "Izoh",
    createdAt: "Yaratilgan",
    deleted: "Izoh o'chirildi",
    deleteAction: "O'chirish",
    deleteMessage: "Izohni o'chirishni tasdiqlaysizmi?",
    deleteTitle: "Izohni o'chirish",
    description: "Sanatkorlarga yozilgan izohlarni ko'rish, filterlash va moderatsiya qilish.",
    detailLoadFailed: "Izoh tafsilotlari yuklanmadi",
    detailTitle: "Izoh tafsilotlari",
    editAction: "Tahrirlash",
    editTitle: "Izohni tahrirlash",
    eyebrow: "Izohlar",
    idNotFound: "Izoh ID topilmadi",
    isPublished: "Ko'rsatilgan",
    loadFailed: "Izohlar yuklanmadi",
    pending: "Kutilmoqda",
    pendingTab: "Kutilayotganlar",
    published: "Izoh ko'rsatildi",
    publishedStatus: "Ko'rsatilgan",
    publishAction: "Ko'rsatish",
    publishMessage: "Izohni ko'rsatishni tasdiqlaysizmi?",
    publishTitle: "Izohni ko'rsatish",
    reset: "Tozalash",
    restoreAction: "Tiklash",
    restoreMessage: "Izohni tiklashni tasdiqlaysizmi?",
    restoreTitle: "Izohni tiklash",
    restored: "Izoh tiklandi",
    saveAction: "Saqlash",
    saving: "Saqlanmoqda...",
    search: "Qidirish",
    status: "Holat",
    statusAll: "Holat: Barchasi",
    title: "Izohlar",
    unpublished: "Izoh yashirildi",
    unpublishAction: "Yashirish",
    unpublishMessage: "Izohni yashirishni tasdiqlaysizmi?",
    unpublishTitle: "Izohni yashirish",
    updated: "Izoh yangilandi",
    updateFailed: "Yangilash bajarilmadi",
    viewAction: "Ko'rish",
  };
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
