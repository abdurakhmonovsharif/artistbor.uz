"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import { adminPrimaryActionButtonClass } from "@/components/admin/admin-action-button";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { trashApi, type TrashModel } from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { formatPhone } from "@/lib/phone-format";
import { normalizeDate, toDisplay } from "@/lib/utils";
import type { ListResult, TrashRecord } from "@/types/api";

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

const trashModelValues: TrashModel[] = [
  "user",
  "booking",
  "order",
  "artist-busy-slot",
  "service",
  "artist-application",
  "artist-profile",
  "client-profile",
  "user-profile",
  "category",
  "artist-service",
  "file",
  "artist-gallery",
];

const limit = 20;

type TrashLabels = ReturnType<typeof getTrashLabels>;

const initialFilters: TrashFilters = {
  q: "",
  model: "user",
  page: 1,
  limit,
};

const getTrashDetailFields = (labels: TrashLabels): DetailField[] => [
  { key: "id", label: "ID" },
  { key: "model", label: labels.model },
  { key: "type", label: labels.type },
  { key: "name", label: labels.name },
  { key: "title", label: labels.titleField },
  { key: "status", label: labels.status },
  { key: "deleted_at", label: labels.deletedAt },
  { key: "created_at", label: labels.createdAt },
];

export default function TrashPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getTrashLabels(locale), [locale]);
  const trashDetailFields = useMemo(() => getTrashDetailFields(labels), [labels]);
  const trashModels = useMemo(() => getTrashModelOptions(locale), [locale]);
  const [filters, setFilters] = useState<TrashFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<TrashFilters>(initialFilters);
  const [rows, setRows] = useState<TrashRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<TrashRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const selectedModel = filters.model || "user";
  const selectedModelLabel = getModelLabel(selectedModel, trashModels);
  const isSearchMode = Boolean(filters.q.trim());

  const columns = useMemo<DataTableColumn<TrashRecord>[]>(
    () => [
      { key: "id", label: "ID", kind: "number" },
      {
        key: "__model",
        label: labels.model,
        render: (row) => (
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {getTrashRowModelLabel(row, selectedModelLabel, trashModels)}
          </span>
        ),
      },
      {
        key: "__name",
        label: labels.name,
        render: (row) => (
          <span className="line-clamp-2 max-w-xs text-sm font-black text-slate-900 dark:text-white">
            {formatTrashRowName(row)}
          </span>
        ),
      },
      {
        key: "status",
        label: labels.status,
        render: (row) => <StatusBadge value={row.status ?? row.status_label} fieldKey="status" />,
      },
      {
        key: "__date",
        label: labels.date,
        render: (row) => (
          <span>
            {normalizeDate(row.deleted_at ?? row.created_at)}
          </span>
        ),
      },
    ],
    [labels.date, labels.model, labels.name, labels.status, selectedModelLabel, trashModels],
  );

  const fetchRecords = useCallback(async () => {
    if (!filters.model) {
      setError(labels.selectModel);
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
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed, labels.selectModel]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRecords();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRecords]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const next = {
          ...draftFilters,
          page: 1,
          limit: Number(current.limit) || limit,
        };
        return sameFilters(current, next) ? current : next;
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const refresh = async () => {
    await fetchRecords();
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const openDetail = async (row: TrashRecord) => {
    const id = getNumericId(row);
    const model = getActionModel(row, filters.model);
    if (!model || !id) {
      toast.error(labels.modelOrIdNotFound);
      return;
    }

    setSubmitting(true);
    try {
      const record = await trashApi.detail(model, id);
      setDialog({ type: "view", record });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const restoreRecord = async () => {
    if (dialog?.type !== "restore") return;
    const id = getNumericId(dialog.record);
    const model = getActionModel(dialog.record, filters.model);
    if (!model || !id) {
      toast.error(labels.modelOrIdNotFound);
      return;
    }

    setSubmitting(true);
    try {
      await trashApi.restore(model, id);
      toast.success(labels.restored);
      setDialog(null);
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.restoreFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const permanentlyDeleteRecord = async () => {
    if (dialog?.type !== "delete") return;
    const id = getNumericId(dialog.record);
    const model = getActionModel(dialog.record, filters.model);
    if (!model || !id) {
      toast.error(labels.modelOrIdNotFound);
      return;
    }

    setSubmitting(true);
    try {
      await trashApi.permanentlyDelete(model, id);
      toast.success(labels.deleted);
      setDialog(null);
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.deleteFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const page = Number(filters.page ?? 1);
  const pageCount = isSearchMode
    ? undefined
    : meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
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
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className={adminPrimaryActionButtonClass}
        >
          <RefreshCw className="size-4" />
          {labels.refresh}
        </button>
      </div>

      <AdminFilterForm
        onSubmit={(event) => event.preventDefault()}
        gridClassName="md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center"
        mobileLabel={labels.filter}
      >
          <FormField
            label={labels.search}
            value={draftFilters.q}
            placeholder="q"
            className={`${adminFilterControlClass} artistbor-filter-search ${draftFilters.q ? "artistbor-filter-search-active" : ""}`}
            hideLabel
            compact
            onChange={(q) => setDraftFilters((current) => ({ ...current, q }))}
          />
          <FormField
            label={labels.model}
            type="select"
            required
            value={draftFilters.model}
            options={trashModels}
            className={adminFilterControlClass}
            hideLabel
            compact
            onChange={(model) =>
              setDraftFilters((current) => ({ ...current, model: model as TrashModel | "" }))
            }
          />
            <button
              type="button"
              onClick={resetFilters}
              className={`${adminFilterActionClass} h-10 px-4 md:col-start-4`}
            >
              {labels.reset}
            </button>
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
          getRowKey={(row, index) => getNumericId(row) ?? index}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <IconButton label={labels.viewAction} onClick={() => void openDetail(row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton label={labels.restoreAction} onClick={() => setDialog({ type: "restore", record: row })}>
                <RotateCcw className="size-4" />
              </IconButton>
              <IconButton label={labels.permanentDeleteAction} danger onClick={() => setDialog({ type: "delete", record: row })}>
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
      ) : null}

      {dialog?.type === "view" ? (
        <AdminDrawer title={labels.detailTitle} onClose={() => setDialog(null)} size="min(100vw, 720px)">
          <div className="p-4">
            <DetailGrid record={dialog.record} fields={trashDetailFields} />
          </div>
        </AdminDrawer>
      ) : null}

      {dialog?.type === "restore" ? (
        <ConfirmDialog
          title={labels.restoreTitle}
          message={labels.restoreMessage}
          confirmLabel={labels.restoreAction}
          loading={submitting}
          onCancel={() => setDialog(null)}
          onConfirm={restoreRecord}
        />
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          title={labels.permanentDeleteTitle}
          message={labels.permanentDeleteMessage}
          confirmLabel={labels.permanentDeleteAction}
          danger
          loading={submitting}
          onCancel={() => setDialog(null)}
          onConfirm={permanentlyDeleteRecord}
        />
      ) : null}
    </section>
  );
}

function getModelLabel(model: TrashModel, options: { label: string; value: TrashModel }[]) {
  return options.find((item) => item.value === model)?.label ?? model;
}

function getTrashRowModelLabel(row: TrashRecord, fallback: string, options: { label: string; value: TrashModel }[]) {
  if (typeof row.model === "string" && isTrashModel(row.model)) return getModelLabel(row.model, options);
  if (typeof row.type === "string") return row.type;
  return fallback;
}

function formatTrashRowName(row: TrashRecord) {
  const direct = row.name ?? row.title ?? row.full_name;
  if (direct !== undefined && direct !== null && direct !== "") return toDisplay(direct);

  const phone = formatPhone(row.phone) || toDisplay(row.phone);
  if (phone !== "—") return phone;

  return toDisplay(row.slug);
}

function getNumericId(row: TrashRecord): number | undefined {
  return typeof row.id === "number" ? row.id : undefined;
}

function getActionModel(row: TrashRecord, fallback: TrashModel | ""): TrashModel | undefined {
  if (typeof row.model === "string" && isTrashModel(row.model)) return row.model;
  return fallback || undefined;
}

function sameFilters(left: TrashFilters, right: TrashFilters) {
  return (
    String(left.q ?? "") === String(right.q ?? "") &&
    String(left.model ?? "") === String(right.model ?? "") &&
    Number(left.page ?? 1) === Number(right.page ?? 1) &&
    Number(left.limit ?? limit) === Number(right.limit ?? limit)
  );
}

function isTrashModel(value: string): value is TrashModel {
  return trashModelValues.some((item) => item === value);
}

function getTrashModelOptions(locale: string): { label: string; value: TrashModel }[] {
  const uz: Record<TrashModel, string> = {
    user: "Foydalanuvchi",
    booking: "Band qilish",
    order: "Buyurtma",
    "artist-busy-slot": "Sanatkor band vaqti",
    service: "Xizmat",
    "artist-application": "Sanatkor arizasi",
    "artist-profile": "Sanatkor profili",
    "client-profile": "Mijoz profili",
    "user-profile": "Foydalanuvchi profili",
    category: "Kategoriya",
    "artist-service": "Sanatkor xizmati",
    file: "Fayl",
    "artist-gallery": "Sanatkor galereyasi",
  };
  const ru: Record<TrashModel, string> = {
    user: "Пользователь",
    booking: "Бронирование",
    order: "Заказ",
    "artist-busy-slot": "Занятое время артиста",
    service: "Услуга",
    "artist-application": "Заявка артиста",
    "artist-profile": "Профиль артиста",
    "client-profile": "Профиль клиента",
    "user-profile": "Профиль пользователя",
    category: "Категория",
    "artist-service": "Услуга артиста",
    file: "Файл",
    "artist-gallery": "Галерея артиста",
  };
  const map = locale === "ru" ? ru : uz;
  return trashModelValues.map((value) => ({ label: map[value], value }));
}

function getTrashLabels(locale: string) {
  if (locale === "ru") {
    return {
      date: "Дата",
      createdAt: "Создано",
      deleted: "Запись удалена навсегда",
      deletedAt: "Удалено",
      deleteFailed: "Не удалось удалить навсегда",
      description: "Просмотр, восстановление или окончательное удаление удаленных записей.",
      detailLoadFailed: "Не удалось загрузить детали удаленной записи",
      detailTitle: "Детали удаленной записи",
      eyebrow: "Удаленные",
      filter: "Фильтр",
      loadFailed: "Не удалось загрузить удаленные записи",
      model: "Модель",
      modelOrIdNotFound: "Модель или ID не найдены",
      name: "Название",
      permanentDeleteAction: "Удалить навсегда",
      permanentDeleteMessage: "Это действие удалит запись навсегда. Продолжить?",
      permanentDeleteTitle: "Удалить навсегда",
      refresh: "Обновить",
      reset: "Сбросить",
      restored: "Запись восстановлена",
      restoreAction: "Восстановить",
      restoreFailed: "Не удалось восстановить запись",
      restoreMessage: "Эта запись будет восстановлена из корзины. Продолжить?",
      restoreTitle: "Восстановить запись",
      search: "Поиск",
      selectModel: "Выберите модель",
      status: "Статус",
      title: "Удаленные",
      titleField: "Заголовок",
      type: "Тип",
      viewAction: "Просмотр",
    };
  }

  return {
    date: "Sana",
    createdAt: "Yaratilgan",
    deleted: "Yozuv butunlay o'chirildi",
    deletedAt: "O'chirilgan",
    deleteFailed: "Butunlay o'chirish bajarilmadi",
    description: "O'chirilgan yozuvlarni ko'rish, tiklash yoki butunlay o'chirish.",
    detailLoadFailed: "O'chirilgan yozuv tafsilotlari yuklanmadi",
    detailTitle: "O'chirilgan yozuv tafsilotlari",
    eyebrow: "O'chirilganlar",
    filter: "Filtr",
    loadFailed: "O'chirib tashlangan yozuvlar yuklanmadi",
    model: "Model",
    modelOrIdNotFound: "Model yoki ID topilmadi",
    name: "Nomi",
    permanentDeleteAction: "Butunlay o'chirish",
    permanentDeleteMessage: "Bu amal yozuvni butunlay o'chiradi. Davom etasizmi?",
    permanentDeleteTitle: "Butunlay o'chirish",
    refresh: "Yangilash",
    reset: "Tozalash",
    restored: "Yozuv qayta tiklandi",
    restoreAction: "Tiklash",
    restoreFailed: "Qayta tiklash bajarilmadi",
    restoreMessage: "Bu yozuv trashdan qayta tiklanadi. Davom etasizmi?",
    restoreTitle: "Yozuvni tiklash",
    search: "Qidiruv",
    selectModel: "Model tanlang",
    status: "Holat",
    title: "O'chirilganlar",
    titleField: "Sarlavha",
    type: "Turi",
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
          ? "border-rose-200 text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-400/20 dark:hover:bg-rose-400/10"
          : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
