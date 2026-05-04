"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Flag,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  artistsApi,
  ordersApi,
  type OrderFilters,
  type RescheduleOrderPayload,
  type UpdateOrderPayload,
} from "@/lib/api/admin-content";
import { getArtistSelectOptions } from "@/lib/artist-display";
import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type { ArtistProfile, ListResult, OrderRecord, UnknownRecord } from "@/types/api";

type DialogState =
  | { type: "actions"; order: OrderRecord }
  | { type: "edit"; order: OrderRecord }
  | { type: "confirm"; order: OrderRecord }
  | { type: "complete"; order: OrderRecord }
  | { type: "cancel"; order: OrderRecord }
  | { type: "reschedule"; order: OrderRecord }
  | null;

const limit = 20;

const orderStatusOptions = [
  { label: "Kutilmoqda", value: "pending" },
  { label: "Tasdiqlangan", value: "confirmed" },
  { label: "Jarayonda", value: "in_progress" },
  { label: "Yakunlangan", value: "completed" },
  { label: "Bekor qilingan", value: "cancelled" },
];

const columns: DataTableColumn<OrderRecord>[] = [
  { key: "id", label: "ID", kind: "number" },
  {
    key: "status",
    label: "Holat",
    render: (row) => <StatusBadge value={row.status ?? row.status_code} />,
  },
  {
    key: "date",
    label: "Vaqt",
    render: (row) => (
      <div className="min-w-32">
        <p className="font-black text-slate-900 dark:text-white">{toDisplay(row.date)}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {toDisplay(row.time ?? row.start_time)}
          {row.end_time ? ` - ${row.end_time}` : ""}
        </p>
      </div>
    ),
  },
  { key: "artist_id", label: "Artist ID", kind: "number" },
  { key: "client_id", label: "Mijoz ID", kind: "number" },
  {
    key: "service_id",
    label: "Xizmat",
    render: (row) => (
      <div className="space-y-1 text-sm">
        <p className="font-black text-slate-900 dark:text-white">#{toDisplay(row.service_id)}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Sub: {toDisplay(row.sub_service_id)}
        </p>
      </div>
    ),
  },
  {
    key: "region_id",
    label: "Hudud",
    render: (row) => (
      <div className="space-y-1 text-sm">
        <p>Region: {toDisplay(row.region_id)}</p>
        <p>District: {toDisplay(row.district_id)}</p>
      </div>
    ),
  },
  {
    key: "address",
    label: "Manzil",
    render: (row) => <span className="line-clamp-2">{toDisplay(row.address)}</span>,
  },
];

const initialFilters: OrderFilters = {
  status: "",
  artist_id: "",
  client_id: "",
  date_from: "",
  date_to: "",
  page: 1,
  limit,
};

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(initialFilters);
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [rows, setRows] = useState<OrderRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<OrderRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ordersApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Buyurtmalar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOrders]);

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

  const openDialog = async (type: "edit", row: OrderRecord) => {
    if (!row.id) {
      toast.error("Order ID topilmadi");
      return;
    }
    setSubmitting(true);
    try {
      const order = await ordersApi.detail(row.id);
      setDialog({ type, order });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Buyurtma tafsilotlari yuklanmadi");
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

  const runSimpleAction = async (type: "confirm" | "complete") => {
    if (!dialog || dialog.type !== type || !dialog.order.id) return;
    setSubmitting(true);
    try {
      if (type === "confirm") {
        await ordersApi.confirm(dialog.order.id);
        toast.success("Buyurtma tasdiqlandi");
      } else {
        await ordersApi.complete(dialog.order.id);
        toast.success("Buyurtma bajarildi");
      }
      setDialog(null);
      await fetchOrders();
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
          Buyurtmalar
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Buyurtmalar
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Buyurtmalar holatini kuzatish, tasdiqlash, yakunlash va qayta rejalash.
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-5">
          <FormField
            label="Holat"
            type="select"
            value={draftFilters.status ?? ""}
            options={orderStatusOptions}
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
            <button
              type="button"
              onClick={() => setDialog({ type: "actions", order: row })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
            >
              <MoreHorizontal className="size-4" />
              Amallar
            </button>
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

      {dialog?.type === "actions" ? (
        <OrderActionsModal
          order={dialog.order}
          onClose={() => setDialog(null)}
          onEdit={() => void openDialog("edit", dialog.order)}
          onConfirm={() => setDialog({ type: "confirm", order: dialog.order })}
          onComplete={() => setDialog({ type: "complete", order: dialog.order })}
          onReschedule={() => setDialog({ type: "reschedule", order: dialog.order })}
          onCancel={() => setDialog({ type: "cancel", order: dialog.order })}
        />
      ) : null}

      {dialog?.type === "edit" ? (
        <EditOrderModal
          order={dialog.order}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.order.id) return;
            setSubmitting(true);
            try {
              await ordersApi.update(dialog.order.id, payload);
              toast.success("Buyurtma yangilandi");
              setDialog(null);
              await fetchOrders();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Yangilash bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "confirm" ? (
        <ConfirmDialog
          loading={submitting}
          title="Buyurtmani tasdiqlash"
          message="Buyurtmani tasdiqlashni tasdiqlaysizmi?"
          confirmLabel="Tasdiqlash"
          onCancel={() => setDialog(null)}
          onConfirm={() => runSimpleAction("confirm")}
        />
      ) : null}

      {dialog?.type === "complete" ? (
        <ConfirmDialog
          loading={submitting}
          title="Buyurtmani yakunlash"
          message="Buyurtmani bajarildi deb belgilashni tasdiqlaysizmi?"
          confirmLabel="Bajarildi"
          onCancel={() => setDialog(null)}
          onConfirm={() => runSimpleAction("complete")}
        />
      ) : null}

      {dialog?.type === "cancel" ? (
        <CancelOrderModal
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (!dialog.order.id) return;
            setSubmitting(true);
            try {
              await ordersApi.cancel(dialog.order.id, reason);
              toast.success("Buyurtma bekor qilindi");
              setDialog(null);
              await fetchOrders();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Bekor qilish bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "reschedule" ? (
        <RescheduleOrderModal
          order={dialog.order}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.order.id) return;
            setSubmitting(true);
            try {
              await ordersApi.reschedule(dialog.order.id, payload);
              toast.success("Buyurtma qayta belgilandi");
              setDialog(null);
              await fetchOrders();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Qayta belgilash bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function EditOrderModal({
  order,
  loading,
  onClose,
  onSubmit,
}: {
  order: OrderRecord;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateOrderPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    notes: typeof order.notes === "string" ? order.notes : "",
    address: typeof order.address === "string" ? order.address : "",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: UpdateOrderPayload = {};
    if (values.notes) payload.notes = values.notes;
    if (values.address) payload.address = values.address;
    await onSubmit(payload);
  };

  return (
    <Modal title="Buyurtmani tahrirlash" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <FormField
          label="Notes"
          type="textarea"
          rows={4}
          value={values.notes}
          onChange={(notes) => setValues((current) => ({ ...current, notes }))}
        />
        <FormField
          label="Address"
          type="textarea"
          rows={4}
          value={values.address}
          onChange={(address) => setValues((current) => ({ ...current, address }))}
        />
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </Modal>
  );
}

function CancelOrderModal({
  loading,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setError("Majburiy maydon");
      return;
    }
    await onSubmit(reason);
  };

  return (
    <Modal title="Buyurtmani bekor qilish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <FormField
          label="Sabab"
          type="textarea"
          rows={4}
          required
          value={reason}
          error={error}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />
        <FormActions danger loading={loading} onClose={onClose} submitLabel="Bekor qilish" />
      </form>
    </Modal>
  );
}

function RescheduleOrderModal({
  order,
  loading,
  onClose,
  onSubmit,
}: {
  order: OrderRecord;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: RescheduleOrderPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    date: "",
    start_time: "",
    end_time: "",
    reason: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<unknown>(null);
  const [conflictsLoading, setConflictsLoading] = useState(true);
  const [conflictsError, setConflictsError] = useState<string | null>(null);

  useEffect(() => {
    if (!order.id) return;
    const timer = window.setTimeout(async () => {
      setConflictsLoading(true);
      setConflictsError(null);
      try {
        const result = await ordersApi.conflicts(order.id as number);
        setConflicts(result);
      } catch (caught) {
        setConflictsError(caught instanceof Error ? caught.message : "Konflikt tekshiruvi bajarilmadi");
      } finally {
        setConflictsLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [order.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.date) nextErrors.date = "Majburiy maydon";
    if (!values.start_time) nextErrors.start_time = "Majburiy maydon";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      date: values.date,
      start_time: values.start_time,
      end_time: values.end_time || undefined,
      reason: values.reason || undefined,
    });
  };

  return (
    <Modal title="Buyurtmani qayta belgilash" onClose={onClose}>
      <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Konflikt tekshiruvi
        </p>
        {conflictsLoading ? (
          <div className="mt-3">
            <LoadingState label="Konfliktlar tekshirilmoqda..." />
          </div>
        ) : conflictsError ? (
          <p className="mt-3 text-sm font-semibold text-rose-500">{conflictsError}</p>
        ) : (
          <div className="mt-3">
            <ValueBlock fieldKey="conflicts" value={conflicts} />
          </div>
        )}
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Sana"
            type="date"
            required
            value={values.date}
            error={errors.date}
            onChange={(date) => setValues((current) => ({ ...current, date }))}
          />
          <FormField
            label="Boshlanish"
            type="time"
            required
            value={values.start_time}
            error={errors.start_time}
            onChange={(start_time) => setValues((current) => ({ ...current, start_time }))}
          />
          <FormField
            label="Tugash"
            type="time"
            value={values.end_time}
            onChange={(end_time) => setValues((current) => ({ ...current, end_time }))}
          />
          <FormField
            label="Sabab"
            value={values.reason}
            onChange={(reason) => setValues((current) => ({ ...current, reason }))}
          />
        </div>
        <FormActions loading={loading} onClose={onClose} submitLabel="Qayta belgilash" />
      </form>
    </Modal>
  );
}

function OrderActionsModal({
  order,
  onClose,
  onEdit,
  onConfirm,
  onComplete,
  onReschedule,
  onCancel,
}: {
  order: OrderRecord;
  onClose: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={`Buyurtma #${order.id ?? "—"} amallari`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-3">
          <InfoCard label="Holat" value={<StatusBadge value={order.status ?? order.status_code} />} />
          <InfoCard label="Sana" value={order.date} />
          <InfoCard label="Vaqt" value={order.time ?? order.start_time} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionButton label="Tahrirlash" description="Manzil yoki izohlarni yangilash" onClick={onEdit}>
            <Pencil className="size-5" />
          </ActionButton>
          <ActionButton
            tone="confirm"
            label="Tasdiqlash"
            description="Kutilmoqda → Tasdiqlangan. Artist ishni boshlashi uchun ruxsat beriladi."
            onClick={onConfirm}
          >
            <ShieldCheck className="size-5" />
          </ActionButton>
          <ActionButton
            tone="complete"
            label="Yakunlash"
            description="Jarayonda/tasdiqlangan → Yakunlangan. Ish bajarilganidan keyin bosiladi."
            onClick={onComplete}
          >
            <Flag className="size-5" />
          </ActionButton>
          <ActionButton label="Vaqtni o'zgartirish" description="Buyurtma sanasi yoki vaqtini almashtirish" onClick={onReschedule}>
            <CalendarClock className="size-5" />
          </ActionButton>
          <ActionButton danger label="Bekor qilish" description="Buyurtmani sabab bilan bekor qilish" onClick={onCancel}>
            <XCircle className="size-5" />
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}

function ActionButton({
  label,
  description,
  children,
  danger,
  tone = "default",
  onClick,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
  tone?: "default" | "confirm" | "complete" | "danger";
  onClick: () => void;
}) {
  const resolvedTone = danger ? "danger" : tone;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${actionToneClass(resolvedTone)}`}
    >
      <span className="mt-0.5">{children}</span>
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-1 block text-xs font-semibold opacity-70">{description}</span>
      </span>
    </button>
  );
}

function actionToneClass(tone: "default" | "confirm" | "complete" | "danger") {
  if (tone === "confirm") {
    return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300";
  }
  if (tone === "complete") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (tone === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
  }
  return "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-amber-400/10";
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{value ?? "—"}</div>
    </div>
  );
}

function ValueBlock({
  fieldKey,
  value,
}: {
  fieldKey: string;
  value: unknown;
}) {
  if (Array.isArray(value)) {
    if (!value.length) return <span>—</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950"
          >
            {isRecord(item) ? <ObjectDetails record={item} /> : <PrimitiveValue fieldKey={fieldKey} value={item} />}
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) return <ObjectDetails record={value} />;

  return <PrimitiveValue fieldKey={fieldKey} value={value} />;
}

function ObjectDetails({ record }: { record: UnknownRecord }) {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);
  if (!entries.length) return <span>—</span>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950"
        >
          <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
            {humanizeKey(key)}
          </span>
          <div className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
            <ValueBlock fieldKey={key} value={value} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PrimitiveValue({
  fieldKey,
  value,
}: {
  fieldKey: string;
  value: unknown;
}) {
  if (isStatusField(fieldKey)) return <StatusBadge value={value} />;
  if (fieldKey.endsWith("_at") || fieldKey === "created_at" || fieldKey === "updated_at") {
    return <span>{normalizeDate(value)}</span>;
  }
  return <span className="break-words">{toDisplay(value)}</span>;
}

function isStatusField(key: string) {
  return key === "status" || key === "status_code" || key.endsWith("_status") || key.startsWith("is_");
}

function humanizeKey(key: string) {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();
}

function FormActions({
  loading,
  onClose,
  danger,
  submitLabel = "Saqlash",
}: {
  loading: boolean;
  onClose: () => void;
  danger?: boolean;
  submitLabel?: string;
}) {
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
        className={`rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.16em] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
          danger
            ? "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600"
            : "bg-amber-400 text-slate-950 shadow-amber-400/25 hover:bg-amber-300"
        }`}
      >
        {loading ? "Bajarilmoqda..." : submitLabel}
      </button>
    </div>
  );
}
