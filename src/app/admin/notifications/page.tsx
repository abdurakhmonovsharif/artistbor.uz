"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Eye, Send, SendToBack, Search } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid, type DetailField } from "@/components/admin/detail-grid";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  notificationsApi,
  type NotificationFilters,
  type SendAllNotificationPayload,
  type SendNotificationPayload,
} from "@/lib/api/admin-content";
import type { NotificationRecord } from "@/types/api";
import { normalizeDate, toDisplay } from "@/lib/utils";

type DialogState =
  | { type: "view"; notification: NotificationRecord }
  | { type: "send-filtered" }
  | { type: "send-all" }
  | null;

const notificationTypes = [
  { label: "System", value: "system" },
  { label: "Order", value: "order" },
  { label: "Promo", value: "promo" },
];

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
};

export default function NotificationsPage() {
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<NotificationFilters>(initialFilters);
  const [rows, setRows] = useState<NotificationRecord[]>([]);
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

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters(draftFilters);
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

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
            onClick={() => setDialog({ type: "send-filtered" })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Send className="size-4" />
            Filter bo&apos;yicha
          </button>
          <button
            type="button"
            onClick={() => setDialog({ type: "send-all" })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-amber-400/25 transition hover:bg-amber-300"
          >
            <SendToBack className="size-4" />
            Send all
          </button>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <FormField
            label="Type"
            type="select"
            value={draftFilters.type ?? ""}
            options={notificationTypes}
            onChange={(type) => setDraftFilters((current) => ({ ...current, type }))}
          />
          <FormField
            label="Sanadan"
            type="date"
            value={draftFilters.date_from ?? ""}
            onChange={(date_from) => setDraftFilters((current) => ({ ...current, date_from }))}
          />
          <FormField
            label="Sanagacha"
            type="date"
            value={draftFilters.date_to ?? ""}
            onChange={(date_to) => setDraftFilters((current) => ({ ...current, date_to }))}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
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

      {dialog?.type === "view" ? (
        <Modal title="Xabarnoma tafsilotlari" onClose={() => setDialog(null)} width="max-w-5xl">
          <DetailGrid record={dialog.notification} fields={notificationDetailFields} />
        </Modal>
      ) : null}

      {dialog?.type === "send-filtered" ? (
        <SendFilteredModal
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              const result = await notificationsApi.send(payload);
              const count =
                typeof result.recipient_count === "number"
                  ? ` Qabul qiluvchilar: ${result.recipient_count}`
                  : "";
              toast.success(`Xabarnoma yuborildi.${count}`);
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

function SendFilteredModal({
  loading,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: SendNotificationPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    title: "",
    message: "",
    type: "system",
    role: "",
    region_id: "",
    district_id: "",
    data: "",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload: SendNotificationPayload = {
      title: values.title,
      message: values.message,
    };
    if (values.type) payload.type = values.type;
    if (values.role) payload.role = values.role;
    if (values.region_id) payload.region_id = Number(values.region_id);
    if (values.district_id) payload.district_id = Number(values.district_id);
    const data = parseData(values.data);
    if (data.error) {
      setError(data.error);
      return;
    }
    if (data.value) payload.data = data.value;
    await onSubmit(payload);
  };

  return (
    <Modal title="Filter bo'yicha xabarnoma yuborish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <NotificationBaseFields values={values} setValues={setValues} includeRole />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </Modal>
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
    role: "",
    region_id: "",
    district_id: "",
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
    <Modal title="Barchaga xabarnoma yuborish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <NotificationBaseFields values={values} setValues={setValues} />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </Modal>
  );
}

function NotificationBaseFields({
  values,
  setValues,
  includeRole,
}: {
  values: {
    title: string;
    message: string;
    type: string;
    role: string;
    region_id: string;
    district_id: string;
    data: string;
  };
  setValues: React.Dispatch<React.SetStateAction<typeof values>>;
  includeRole?: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Sarlavha"
          value={values.title}
          required
          onChange={(title) => setValues((current) => ({ ...current, title }))}
        />
        <FormField
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
      {includeRole ? (
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            label="Role"
            type="select"
            value={values.role}
            options={[
              { label: "Mijoz", value: "client" },
              { label: "Artist", value: "artist" },
            ]}
            onChange={(role) => setValues((current) => ({ ...current, role }))}
          />
          <FormField
            label="Region ID"
            type="number"
            value={values.region_id}
            onChange={(region_id) => setValues((current) => ({ ...current, region_id }))}
          />
          <FormField
            label="District ID"
            type="number"
            value={values.district_id}
            onChange={(district_id) => setValues((current) => ({ ...current, district_id }))}
          />
        </div>
      ) : null}
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
      className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
    >
      {children}
    </button>
  );
}
