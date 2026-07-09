"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, SendToBack, X } from "lucide-react";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import {
  DateFilterSelect,
  getDateFilterPatch,
  inferDateFilterMode,
  type DateFilterValue,
} from "@/components/admin/date-filter-select";
import {
  adminActionButtonClass,
  adminActionButtonLargeClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  notificationsApi,
  type NotificationFilters,
  type SendAllNotificationPayload,
} from "@/lib/api/admin-content";
import type { ListResult, NotificationRecord } from "@/types/api";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { normalizeDate, toDisplay } from "@/lib/utils";

type DialogState =
  | { type: "view"; notification: NotificationRecord }
  | { type: "send-all" }
  | null;

const limit = 20;

const initialFilters: NotificationFilters = {
  type: "",
  date_from: "",
  date_to: "",
  sort: "-created_at",
  page: 1,
  limit,
};

export default function NotificationsPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getNotificationLabels(locale), [locale]);
  const notificationTypes = useMemo(() => getNotificationTypes(labels), [labels]);
  const columns = useMemo(() => getNotificationColumns(labels), [labels]);
  const notificationDetailFields = useMemo(() => getNotificationDetailFields(labels), [labels]);
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<NotificationFilters>(initialFilters);
  const [rows, setRows] = useState<NotificationRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<NotificationRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dateFilterMode, setDateFilterMode] = useState(() => inferDateFilterMode(initialFilters));
  const toast = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await notificationsApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  const openDetail = async (row: NotificationRecord) => {
    if (!row.id) {
      toast.error(labels.idNotFound);
      return;
    }
    setSubmitting(true);
    try {
      const notification = await notificationsApi.detail(row.id);
      setDialog({ type: "view", notification });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const changeFilters = (nextFilters: NotificationFilters) => {
    const normalized = { ...nextFilters, page: 1, limit: Number(filters.limit) || limit };
    setDraftFilters(normalized);
    setFilters(normalized);
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    setDateFilterMode(inferDateFilterMode(initialFilters));
  };

  const changeDateFilter = (value: DateFilterValue) => {
    setDateFilterMode(value.mode);
    changeFilters({ ...draftFilters, ...getDateFilterPatch(value) });
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, limit: nextLimit }));
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const page = Number(filters.page ?? 1);
  const pageCount =
    meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            {labels.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            {labels.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {labels.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setDialog({ type: "send-all" })}
            className={adminActionButtonLargeClass}
          >
            <SendToBack className="size-4" />
            {labels.sendAllAction}
          </button>
        </div>
      </div>

      <AdminFilterForm
        onSubmit={(event) => event.preventDefault()}
        gridClassName="md:grid-cols-[minmax(150px,0.7fr)_minmax(260px,1.4fr)_auto] md:items-center"
        mobileLabel={labels.filter}
      >
          <FormField
            label={labels.type}
            type="select"
            className={adminFilterControlClass}
            hideLabel
            compact
            value={draftFilters.type ?? ""}
            options={notificationTypes}
            onChange={(type) => changeFilters({ ...draftFilters, type })}
          />
          <DateFilterSelect
            className={adminFilterControlClass}
            value={{
              mode: dateFilterMode,
              date_from: draftFilters.date_from ?? "",
              date_to: draftFilters.date_to ?? "",
            }}
            labels={{
              label: labels.dateFilter,
              newest: labels.newest,
              oldest: labels.oldest,
              custom: labels.custom,
              from: labels.dateFrom,
              to: labels.dateTo,
            }}
            onChange={changeDateFilter}
          />
          <button
            type="button"
            onClick={resetFilters}
            className={`${adminFilterActionClass} h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300`}
          >
            {labels.clear}
          </button>
      </AdminFilterForm>

      {loading ? (
        <LoadingState label={labels.loading} />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title={labels.empty} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row, index) => row.id ?? index}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <IconButton label={labels.view} onClick={() => void openDetail(row)}>
                <Eye className="size-4" />
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
            <DetailGrid record={dialog.notification} fields={notificationDetailFields} />
          </div>
        </AdminDrawer>
      ) : null}

      {dialog?.type === "send-all" ? (
        <SendAllModal
          labels={labels}
          notificationTypes={notificationTypes}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await notificationsApi.sendAll(payload);
              toast.success(labels.sentAll);
              setDialog(null);
              await fetchNotifications();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.sendFailed);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function SendAllModal({
  labels,
  notificationTypes,
  loading,
  onClose,
  onSubmit,
}: {
  labels: NotificationLabels;
  notificationTypes: Array<{ label: string; value: string }>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: SendAllNotificationPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    title: "",
    message: "",
    type: "system",
    data: "",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload: SendAllNotificationPayload = {
      title: values.title,
      message: values.message,
    };
    if (values.type) payload.type = values.type;
    const data = parseData(values.data, labels);
    if (data.error) {
      setError(data.error);
      return;
    }
    if (data.value) payload.data = data.value;
    await onSubmit(payload);
  };

  return (
    <AdminDrawer title={labels.sendAllTitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 p-4">
        <NotificationBaseFields
          labels={labels}
          notificationTypes={notificationTypes}
          values={values}
          setValues={setValues}
        />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <FormActions labels={labels} loading={loading} onClose={onClose} />
      </form>
    </AdminDrawer>
  );
}

function NotificationBaseFields({
  labels,
  notificationTypes,
  values,
  setValues,
}: {
  labels: NotificationLabels;
  notificationTypes: Array<{ label: string; value: string }>;
  values: {
    title: string;
    message: string;
    type: string;
    data: string;
  };
  setValues: React.Dispatch<React.SetStateAction<typeof values>>;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          compact
          label={labels.titleField}
          value={values.title}
          required
          onChange={(title) => setValues((current) => ({ ...current, title }))}
        />
        <FormField
          compact
          label={labels.type}
          type="select"
          value={values.type}
          options={notificationTypes}
          onChange={(type) => setValues((current) => ({ ...current, type }))}
        />
      </div>
      <FormField
        label={labels.messageField}
        type="textarea"
        rows={4}
        required
        value={values.message}
        onChange={(message) => setValues((current) => ({ ...current, message }))}
      />
      <FormField
        label={labels.dataJson}
        type="textarea"
        rows={4}
        value={values.data}
        placeholder='{"action":"open_promo"}'
        onChange={(data) => setValues((current) => ({ ...current, data }))}
      />
    </>
  );
}

function parseData(
  value: string,
  labels: NotificationLabels,
): { value?: Record<string, unknown>; error?: string } {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: labels.dataJsonObject };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: labels.dataJsonInvalid };
  }
}

function FormActions({
  labels,
  loading,
  onClose,
}: {
  labels: NotificationLabels;
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
        <X className="size-4" />
        {labels.close}
      </button>
      <button
        type="submit"
        disabled={loading}
        className={adminPrimaryActionButtonClass}
      >
        <CheckCircle2 className="size-4" />
        {loading ? labels.sending : labels.send}
      </button>
    </div>
  );
}

type NotificationLabels = ReturnType<typeof getNotificationLabels>;

function getNotificationTypes(labels: NotificationLabels) {
  return [
    { label: labels.systemType, value: "system" },
    { label: labels.orderType, value: "order" },
    { label: labels.promoType, value: "promo" },
  ];
}

function getNotificationColumns(labels: NotificationLabels): DataTableColumn<NotificationRecord>[] {
  return [
    { key: "id", label: "ID", kind: "number" },
    {
      key: "title",
      label: labels.titleField,
      render: (row) => (
        <span className="line-clamp-2 max-w-xs text-sm font-black text-slate-900 dark:text-white">
          {toDisplay(row.title ?? row.title_uz ?? row.subject)}
        </span>
      ),
    },
    {
      key: "message",
      label: labels.messageField,
      render: (row) => (
        <span className="line-clamp-2 max-w-md text-sm font-semibold text-slate-600 dark:text-slate-300">
          {toDisplay(row.message ?? row.body ?? row.text)}
        </span>
      ),
    },
    { key: "type", label: labels.type, render: (row) => <StatusBadge value={row.type} /> },
    { key: "created_at", label: labels.createdAt, render: (row) => normalizeDate(row.created_at) },
  ];
}

function getNotificationDetailFields(labels: NotificationLabels): DetailField[] {
  return [
    { key: "id", label: "ID" },
    { key: "title", label: labels.titleField },
    { key: "title_uz", label: labels.titleUz },
    { key: "message", label: labels.messageField },
    { key: "body", label: labels.body },
    { key: "type", label: labels.type },
    { key: "created_at", label: labels.createdAt },
  ];
}

function getNotificationLabels(locale: string) {
  if (locale === "ru") {
    return {
      body: "Текст",
      clear: "Очистить",
      close: "Закрыть",
      createdAt: "Создано",
      custom: "Настроить",
      dataJson: "Data JSON",
      dataJsonInvalid: "Data JSON имеет неверный формат",
      dataJsonObject: "Data JSON должен быть объектом",
      dateFrom: "С даты",
      dateFilter: "Дата",
      dateTo: "По дату",
      description: "Просмотр отправленных пользователям уведомлений и отправка нового сообщения.",
      detailLoadFailed: "Не удалось загрузить детали уведомления",
      detailTitle: "Детали уведомления",
      empty: "Уведомления не найдены",
      eyebrow: "Уведомления",
      filter: "Фильтр",
      idNotFound: "ID уведомления не найден",
      loadFailed: "Не удалось загрузить уведомления",
      loading: "Загрузка уведомлений...",
      messageField: "Сообщение",
      newest: "Новые",
      oldest: "Старые",
      orderType: "Заказ",
      promoType: "Промо",
      send: "Отправить",
      sendAllAction: "Отправить всем",
      sendAllTitle: "Отправить уведомление всем",
      sendFailed: "Не удалось отправить уведомление",
      sending: "Отправка...",
      sentAll: "Уведомление отправлено всем пользователям",
      systemType: "Системное",
      title: "Уведомления",
      titleField: "Заголовок",
      titleUz: "Заголовок UZ",
      type: "Тип",
      view: "Просмотр",
    };
  }

  return {
    body: "Matn",
    clear: "Tozalash",
    close: "Yopish",
    createdAt: "Yaratilgan",
    custom: "Sozlash",
    dataJson: "Data JSON",
    dataJsonInvalid: "Data JSON noto'g'ri formatda",
    dataJsonObject: "Data JSON object bo'lishi kerak",
    dateFrom: "Sanadan",
    dateFilter: "Sana",
    dateTo: "Sanagacha",
    description: "Foydalanuvchilarga yuborilgan xabarnomalarni ko'rish va yangi xabar yuborish.",
    detailLoadFailed: "Xabarnoma tafsilotlari yuklanmadi",
    detailTitle: "Xabarnoma tafsilotlari",
    empty: "Xabarnomalar topilmadi",
    eyebrow: "Xabarnomalar",
    filter: "Filter",
    idNotFound: "Notification ID topilmadi",
    loadFailed: "Xabarnomalar yuklanmadi",
    loading: "Xabarnomalar yuklanmoqda...",
    messageField: "Xabar",
    newest: "Yangilari",
    oldest: "Eng eskilari",
    orderType: "Buyurtma",
    promoType: "Promo",
    send: "Yuborish",
    sendAllAction: "Barchaga yuborish",
    sendAllTitle: "Barchaga xabarnoma yuborish",
    sendFailed: "Xabarnoma yuborilmadi",
    sending: "Yuborilmoqda...",
    sentAll: "Xabarnoma barcha foydalanuvchilarga yuborildi",
    systemType: "Tizim",
    title: "Xabarnomalar",
    titleField: "Sarlavha",
    titleUz: "Sarlavha UZ",
    type: "Turi",
    view: "Ko'rish",
  };
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
      className="cursor-pointer rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
    >
      {children}
    </button>
  );
}
