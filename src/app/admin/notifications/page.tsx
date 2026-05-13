"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, SendToBack, X } from "lucide-react";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
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
import { normalizeDate, toDisplay } from "@/lib/utils";

type DialogState =
  | { type: "view"; notification: NotificationRecord }
  | { type: "send-all" }
  | null;

const notificationTypes = [
  { label: "System", value: "system" },
  { label: "Order", value: "order" },
  { label: "Promo", value: "promo" },
];

const limit = 20;

const columns: DataTableColumn<NotificationRecord>[] = [
  { key: "id", label: "ID", kind: "number" },
  {
    key: "title",
    label: "Sarlavha",
    render: (row) => (
      <span className="line-clamp-2 max-w-xs text-sm font-black text-slate-900 dark:text-white">
        {toDisplay(row.title ?? row.title_uz ?? row.subject)}
      </span>
    ),
  },
  {
    key: "message",
    label: "Xabar",
    render: (row) => (
      <span className="line-clamp-2 max-w-md text-sm font-semibold text-slate-600 dark:text-slate-300">
        {toDisplay(row.message ?? row.body ?? row.text)}
      </span>
    ),
  },
  { key: "type", label: "Turi", render: (row) => <StatusBadge value={row.type} /> },
  { key: "created_at", label: "Yaratilgan", render: (row) => normalizeDate(row.created_at) },
];

const notificationDetailFields: DetailField[] = [
  { key: "id", label: "ID" },
  { key: "title", label: "Sarlavha" },
  { key: "title_uz", label: "Sarlavha UZ" },
  { key: "message", label: "Xabar" },
  { key: "body", label: "Matn" },
  { key: "type", label: "Turi" },
  { key: "created_at", label: "Yaratilgan" },
];

const initialFilters: NotificationFilters = {
  type: "",
  date_from: "",
  date_to: "",
  page: 1,
  limit,
};

export default function NotificationsPage() {
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<NotificationFilters>(initialFilters);
  const [rows, setRows] = useState<NotificationRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<NotificationRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await notificationsApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Xabarnomalar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  const openDetail = async (row: NotificationRecord) => {
    if (!row.id) {
      toast.error("Notification ID topilmadi");
      return;
    }
    setSubmitting(true);
    try {
      const notification = await notificationsApi.detail(row.id);
      setDialog({ type: "view", notification });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Xabarnoma tafsilotlari yuklanmadi");
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
            Xabarnomalar
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            Xabarnomalar
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Foydalanuvchilarga yuborilgan xabarnomalarni ko&apos;rish va yangi xabar yuborish.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setDialog({ type: "send-all" })}
            className={adminActionButtonLargeClass}
          >
            <SendToBack className="size-4" />
            Send all
          </button>
        </div>
      </div>

      <AdminFilterForm
        onSubmit={(event) => event.preventDefault()}
        gridClassName="md:grid-cols-[minmax(150px,0.75fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_auto] md:items-center"
        mobileLabel="Filter"
      >
          <FormField
            label="Type"
            type="select"
            className={adminFilterControlClass}
            hideLabel
            compact
            value={draftFilters.type ?? ""}
            options={notificationTypes}
            onChange={(type) => changeFilters({ ...draftFilters, type })}
          />
          <FormField
            label="Sanadan"
            type="date"
            className={adminFilterControlClass}
            hideLabel
            compact
            value={draftFilters.date_from ?? ""}
            onChange={(date_from) => changeFilters({ ...draftFilters, date_from })}
          />
          <FormField
            label="Sanagacha"
            type="date"
            className={adminFilterControlClass}
            hideLabel
            compact
            value={draftFilters.date_to ?? ""}
            onChange={(date_to) => changeFilters({ ...draftFilters, date_to })}
          />
          <button
            type="button"
            onClick={resetFilters}
            className={`${adminFilterActionClass} h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300`}
          >
            Tozalash
          </button>
      </AdminFilterForm>

      {loading ? (
        <LoadingState label="Xabarnomalar yuklanmoqda..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="Xabarnomalar topilmadi" />
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
        <AdminDrawer title="Xabarnoma tafsilotlari" onClose={() => setDialog(null)} size="min(100vw, 720px)">
          <div className="p-4">
            <DetailGrid record={dialog.notification} fields={notificationDetailFields} />
          </div>
        </AdminDrawer>
      ) : null}

      {dialog?.type === "send-all" ? (
        <SendAllModal
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await notificationsApi.sendAll(payload);
              toast.success("Xabarnoma barcha foydalanuvchilarga yuborildi");
              setDialog(null);
              await fetchNotifications();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Xabarnoma yuborilmadi");
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
  loading,
  onClose,
  onSubmit,
}: {
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
    const data = parseData(values.data);
    if (data.error) {
      setError(data.error);
      return;
    }
    if (data.value) payload.data = data.value;
    await onSubmit(payload);
  };

  return (
    <AdminDrawer title="Barchaga xabarnoma yuborish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 p-4">
        <NotificationBaseFields values={values} setValues={setValues} />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </AdminDrawer>
  );
}

function NotificationBaseFields({
  values,
  setValues,
}: {
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
          label="Sarlavha"
          value={values.title}
          required
          onChange={(title) => setValues((current) => ({ ...current, title }))}
        />
        <FormField
          compact
          label="Type"
          type="select"
          value={values.type}
          options={notificationTypes}
          onChange={(type) => setValues((current) => ({ ...current, type }))}
        />
      </div>
      <FormField
        label="Message"
        type="textarea"
        rows={4}
        required
        value={values.message}
        onChange={(message) => setValues((current) => ({ ...current, message }))}
      />
      <FormField
        label="Data JSON"
        type="textarea"
        rows={4}
        value={values.data}
        placeholder='{"action":"open_promo"}'
        onChange={(data) => setValues((current) => ({ ...current, data }))}
      />
    </>
  );
}

function parseData(value: string): { value?: Record<string, unknown>; error?: string } {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "Data JSON object bolishi kerak" };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: "Data JSON notogri formatda" };
  }
}

function FormActions({ loading, onClose }: { loading: boolean; onClose: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onClose}
        className={adminActionButtonClass}
      >
        <X className="size-4" />
        Yopish
      </button>
      <button
        type="submit"
        disabled={loading}
        className={adminPrimaryActionButtonClass}
      >
        <CheckCircle2 className="size-4" />
        {loading ? "Yuborilmoqda..." : "Yuborish"}
      </button>
    </div>
  );
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
