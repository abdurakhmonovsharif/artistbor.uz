"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { CheckCircle2, Eye, Send, SendToBack, X } from "lucide-react";
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
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, InlineLoadingState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  notificationsApi,
  regionsApi,
  type NotificationFilters,
  type SendAllNotificationPayload,
  type SendNotificationPayload,
} from "@/lib/api/admin-content";
import type { District, NotificationRecord, Region } from "@/types/api";
import {
  buildSendAllNotificationPayload,
  buildTargetedNotificationPayload,
  type NotificationPayloadError,
} from "@/lib/admin-notification";
import { getDashboardNotification, getDashboardStatus } from "@/lib/i18n/dashboard-copy";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useLatestRequest } from "@/lib/use-latest-request";
import { normalizeDate, toDisplay } from "@/lib/utils";

type DialogState =
  | { type: "view"; notification: NotificationRecord; detailLoading: boolean }
  | { type: "send-filtered" }
  | { type: "send-all" }
  | null;

const initialFilters: NotificationFilters = {
  type: "",
  date_from: "",
  date_to: "",
};

export default function NotificationsPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getNotificationLabels(locale), [locale]);
  const notificationTypes = useMemo(() => getNotificationTypes(locale), [locale]);
  const columns = useMemo(() => getNotificationColumns(labels), [labels]);
  const notificationDetailFields = useMemo(() => getNotificationDetailFields(labels), [labels]);
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<NotificationFilters>(initialFilters);
  const [rows, setRows] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dateFilterMode, setDateFilterMode] = useState(() => inferDateFilterMode(initialFilters));
  const toast = useToast();
  const startListRequest = useLatestRequest(filters);

  const fetchNotifications = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startListRequest();
    if (!background) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await notificationsApi.list(filters);
      if (!isLatestRequest()) return;
      setRows(result.items);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : labels.loadFailed;
      if (background) toast.error(message);
      else setError(message);
    } finally {
      if (isLatestRequest()) setLoading(false);
    }
  }, [filters, labels, startListRequest, toast]);

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
    setDialog({ type: "view", notification: row, detailLoading: true });
    try {
      const notification = await notificationsApi.detail(row.id);
      setDialog((current) =>
        current?.type === "view" && current.notification.id === row.id
          ? { type: "view", notification, detailLoading: false }
          : current,
      );
    } catch (caught) {
      setDialog((current) =>
        current?.type === "view" && current.notification.id === row.id
          ? { ...current, detailLoading: false }
          : current,
      );
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    }
  };

  const changeFilters = (nextFilters: NotificationFilters) => {
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
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

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDialog({ type: "send-filtered" })}
              className={adminPrimaryActionButtonClass}
            >
              <Send className="size-4" />
              {labels.sendFilteredAction}
            </button>
            <button
              type="button"
              onClick={() => setDialog({ type: "send-all" })}
              className={adminActionButtonLargeClass}
            >
              <SendToBack className="size-4" />
              {labels.sendAllAction}
            </button>
          </div>
        )}
      />

      <AdminFilterForm
        onSubmit={(event) => event.preventDefault()}
        gridClassName="md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center"
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
            className={`${adminFilterActionClass} h-10 px-4 md:col-start-4`}
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

      {dialog?.type === "view" ? (
        <AdminDrawer title={labels.detailTitle} onClose={() => setDialog(null)} size="min(100vw, 720px)">
          <div className="p-4">
            {dialog.detailLoading ? <InlineLoadingState /> : null}
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
              void fetchNotifications({ background: true });
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.sendFailed);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "send-filtered" ? (
        <TargetedNotificationModal
          locale={locale}
          labels={labels}
          notificationTypes={notificationTypes}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              const result = await notificationsApi.send(payload);
              toast.success(labels.sentFiltered(result.recipient_count));
              setDialog(null);
              void fetchNotifications({ background: true });
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

type NotificationBaseValues = {
  title: string;
  message: string;
  type: string;
  data: string;
};

type TargetedNotificationValues = NotificationBaseValues & {
  role: string;
  region_id: string;
  district_id: string;
};

function TargetedNotificationModal({
  locale,
  labels,
  notificationTypes,
  loading,
  onClose,
  onSubmit,
}: {
  locale: "uz" | "ru";
  labels: NotificationLabels;
  notificationTypes: Array<{ label: string; value: string }>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: SendNotificationPayload) => Promise<void>;
}) {
  const [values, setValues] = useState<TargetedNotificationValues>({
    title: "",
    message: "",
    type: "system",
    data: "",
    role: "",
    region_id: "",
    district_id: "",
  });
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    regionsApi
      .list({ page: 1, limit: 1000 })
      .then((result) => {
        if (active) setRegions(result.items.filter((region) => region.id !== undefined));
      })
      .catch(() => {
        if (active) setError(labels.locationsLoadFailed);
      })
      .finally(() => {
        if (active) setLocationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [labels.locationsLoadFailed]);

  useEffect(() => {
    let active = true;
    const regionId = Number(values.region_id);
    if (!regionId) {
      return () => {
        active = false;
      };
    }

    regionsApi
      .districts(regionId)
      .then((result) => {
        if (active) setDistricts(result.items.filter((district) => district.id !== undefined));
      })
      .catch(() => {
        if (active) setError(labels.locationsLoadFailed);
      })
      .finally(() => {
        if (active) setLocationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [labels.locationsLoadFailed, values.region_id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = buildTargetedNotificationPayload(values);
    if (result.error) {
      setError(notificationPayloadErrorMessage(result.error, labels));
      return;
    }
    await onSubmit(result.payload);
  };

  const regionOptions = [
    { label: labels.allRegions, value: "" },
    ...regions.map((region) => ({
      label: localizedLocationName(region, locale),
      value: String(region.id),
    })),
  ];
  const districtOptions = [
    { label: labels.allDistricts, value: "" },
    ...districts.map((district) => ({
      label: localizedLocationName(district, locale),
      value: String(district.id),
    })),
  ];

  return (
    <AdminDrawer title={labels.sendFilteredTitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 p-4">
        <NotificationBaseFields
          labels={labels}
          notificationTypes={notificationTypes}
          values={values}
          setValues={setValues}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            compact
            label={labels.role}
            type="select"
            value={values.role}
            options={[
              { label: labels.allRoles, value: "" },
              { label: labels.clients, value: "client" },
              { label: labels.artists, value: "artist" },
            ]}
            onChange={(role) => setValues((current) => ({ ...current, role }))}
          />
          <FormField
            compact
            label={labels.region}
            type="select"
            value={values.region_id}
            options={regionOptions}
            disabled={locationsLoading && regions.length === 0}
            onChange={(region_id) => {
              setDistricts([]);
              setLocationsLoading(Boolean(region_id));
              setValues((current) => ({ ...current, region_id, district_id: "" }))
            }}
          />
          <FormField
            compact
            label={labels.district}
            type="select"
            value={values.district_id}
            options={districtOptions}
            disabled={!values.region_id || locationsLoading}
            onChange={(district_id) =>
              setValues((current) => ({ ...current, district_id }))
            }
          />
        </div>
        <p className="text-xs font-semibold leading-5 text-artistbor-secondary">
          {labels.targetHint}
        </p>
        {error ? <p role="alert" className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <FormActions labels={labels} loading={loading} onClose={onClose} />
      </form>
    </AdminDrawer>
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
    const result = buildSendAllNotificationPayload(values);
    if (result.error) {
      setError(notificationPayloadErrorMessage(result.error, labels));
      return;
    }
    await onSubmit(result.payload);
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

function NotificationBaseFields<T extends NotificationBaseValues>({
  labels,
  notificationTypes,
  values,
  setValues,
}: {
  labels: NotificationLabels;
  notificationTypes: Array<{ label: string; value: string }>;
  values: T;
  setValues: Dispatch<SetStateAction<T>>;
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

function localizedLocationName(location: Region | District, locale: "uz" | "ru") {
  if (locale === "ru") return location.name_ru || location.name_uz || location.name_en || `#${location.id}`;
  return location.name_uz || location.name_ru || location.name_en || `#${location.id}`;
}

function notificationPayloadErrorMessage(error: NotificationPayloadError, labels: NotificationLabels) {
  if (error === "target_required") return labels.targetRequired;
  if (error === "data_json_object") return labels.dataJsonObject;
  return labels.dataJsonInvalid;
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

function getNotificationTypes(locale: "uz" | "ru") {
  return [
    { label: getDashboardStatus("notification_type", "system", locale).label, value: "system" },
    { label: getDashboardStatus("notification_type", "order", locale).label, value: "order" },
    { label: getDashboardStatus("notification_type", "promo", locale).label, value: "promo" },
  ];
}

function getNotificationColumns(labels: NotificationLabels): DataTableColumn<NotificationRecord>[] {
  return [
    { key: "public_id", label: "Public ID", render: (row) => toDisplay(row.public_id) },
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
    { key: "type", label: labels.type, render: (row) => <StatusBadge value={row.type} fieldKey="notification_type" /> },
    { key: "created_at", label: labels.createdAt, render: (row) => normalizeDate(row.created_at) },
  ];
}

function getNotificationDetailFields(labels: NotificationLabels): DetailField[] {
  return [
    { key: "public_id", label: "Public ID" },
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
      allDistricts: "Все районы",
      allRegions: "Все регионы",
      allRoles: "Все роли",
      artists: "Артисты",
      body: "Текст",
      clients: "Клиенты",
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
      district: "Район",
      empty: "Уведомления не найдены",
      eyebrow: "Уведомления",
      filter: "Фильтр",
      idNotFound: "ID уведомления не найден",
      loadFailed: "Не удалось загрузить уведомления",
      loading: "Загрузка уведомлений...",
      locationsLoadFailed: "Не удалось загрузить регионы и районы",
      messageField: "Сообщение",
      newest: "Новые",
      oldest: "Старые",
      orderType: "Заказ",
      promoType: "Промо",
      region: "Регион",
      role: "Роль получателя",
      send: "Отправить",
      sendAllAction: "Отправить всем",
      sendAllTitle: "Отправить уведомление всем",
      sendFilteredAction: "Отправить по фильтру",
      sendFilteredTitle: "Отправить выбранной аудитории",
      sendFailed: "Не удалось отправить уведомление",
      sending: "Отправка...",
      sentAll: getDashboardNotification("notificationSentAll", "ru"),
      sentFiltered: (recipientCount?: number) => {
        const base = getDashboardNotification("notificationSentFiltered", "ru");
        return recipientCount === undefined ? base : `${base}. Получателей: ${recipientCount}`;
      },
      systemType: "Системное",
      targetHint: "Выберите хотя бы одну роль, регион или район. Пустая аудитория не будет отправлена.",
      targetRequired: "Выберите роль, регион или район получателей",
      title: "Уведомления",
      titleField: "Заголовок",
      titleUz: "Заголовок UZ",
      type: "Тип",
      view: "Просмотр",
    };
  }

  return {
    allDistricts: "Barcha tumanlar",
    allRegions: "Barcha viloyatlar",
    allRoles: "Barcha rollar",
    artists: "San’atkorlar",
    body: "Matn",
    clients: "Mijozlar",
    clear: "Tozalash",
    close: "Yopish",
    createdAt: "Yaratilgan",
    custom: "Sozlash",
    dataJson: "Data JSON",
    dataJsonInvalid: "Data JSON noto'g'ri formatda",
    dataJsonObject: "Data JSON obyekt bo'lishi kerak",
    dateFrom: "Sanadan",
    dateFilter: "Sana",
    dateTo: "Sanagacha",
    description: "Foydalanuvchilarga yuborilgan xabarnomalarni ko'rish va yangi xabar yuborish.",
    detailLoadFailed: "Xabarnoma tafsilotlari yuklanmadi",
    detailTitle: "Xabarnoma tafsilotlari",
    district: "Tuman",
    empty: "Xabarnomalar topilmadi",
    eyebrow: "Xabarnomalar",
    filter: "Filtr",
    idNotFound: "Xabarnoma ID topilmadi",
    loadFailed: "Xabarnomalar yuklanmadi",
    loading: "Xabarnomalar yuklanmoqda...",
    locationsLoadFailed: "Viloyat va tumanlar yuklanmadi",
    messageField: "Xabar",
    newest: "Yangilari",
    oldest: "Eng eskilari",
    orderType: "Buyurtma",
    promoType: "Promo",
    region: "Viloyat",
    role: "Qabul qiluvchi roli",
    send: "Yuborish",
    sendAllAction: "Barchaga yuborish",
    sendAllTitle: "Barchaga xabarnoma yuborish",
    sendFilteredAction: "Filtr bo‘yicha yuborish",
    sendFilteredTitle: "Tanlangan auditoriyaga yuborish",
    sendFailed: "Xabarnoma yuborilmadi",
    sending: "Yuborilmoqda...",
    sentAll: getDashboardNotification("notificationSentAll", "uz"),
    sentFiltered: (recipientCount?: number) => {
      const base = getDashboardNotification("notificationSentFiltered", "uz");
      return recipientCount === undefined ? base : `${base}. Qabul qiluvchilar: ${recipientCount}`;
    },
    systemType: "Tizim",
    targetHint: "Kamida bitta rol, viloyat yoki tumanni tanlang. Bo‘sh auditoriyaga yuborilmaydi.",
    targetRequired: "Qabul qiluvchilar roli, viloyati yoki tumanini tanlang",
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
