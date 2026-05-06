"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Flag,
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
import { isLocationIdKey, LocationName } from "@/components/admin/location-name";
import {
  ActionsCell,
  BookingCell,
  DateTimeCell,
  EntityName,
  LocationCell,
  MoneyText,
  StatusBadge as OrderStatusBadge,
} from "@/components/admin/order-table-cells";
import { useToast } from "@/components/ui/toast";
import {
  artistsApi,
  districtsApi,
  ordersApi,
  regionsApi,
  servicesApi,
  usersApi,
  type OrderFilters,
  type RescheduleOrderPayload,
  type UpdateOrderPayload,
} from "@/lib/api/admin-content";
import { getArtistName, getArtistSelectOptions } from "@/lib/artist-display";
import { formatBookingDate, formatBookingTimeRange } from "@/lib/order-format";
import { getOrderUiStatus } from "@/lib/order-status";
import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type {
  ArtistProfile,
  District,
  ListResult,
  OrderRecord,
  Region,
  Service,
  UnknownRecord,
  User,
} from "@/types/api";

type DialogState =
  | { type: "actions"; order: OrderRecord }
  | { type: "edit"; order: OrderRecord }
  | { type: "confirm"; order: OrderRecord }
  | { type: "complete"; order: OrderRecord }
  | { type: "cancel"; order: OrderRecord }
  | { type: "reschedule"; order: OrderRecord }
  | null;

const limit = 20;
const clientRole = 10;

const orderStatusOptions = [
  { label: "Kutilmoqda", value: "10" },
  { label: "To'lov kutilmoqda", value: "20" },
  { label: "Tasdiqlangan", value: "30" },
  { label: "Bekor qilingan", value: "40" },
  { label: "Yakunlangan", value: "50" },
];

const paymentStatusOptions = [
  { label: "To'lov kutilmoqda", value: "10" },
  { label: "To'langan", value: "20" },
  { label: "Qaytarilgan", value: "30" },
];

const initialFilters: OrderFilters = {
  status: "",
  payment_status: "",
  artist_id: "",
  date_from: "",
  date_to: "",
  page: 1,
  limit,
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();

  return (
    <OrdersTable
      key={queryKey}
      initialOrderFilters={createFiltersFromSearchParams(searchParams)}
    />
  );
}

function OrdersTable({ initialOrderFilters }: { initialOrderFilters: OrderFilters }) {
  const [filters, setFilters] = useState<OrderFilters>(initialOrderFilters);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(initialOrderFilters);
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
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
      const result = await ordersApi.list({
        ...filters,
        expand: "client,artist,service,subService",
      });
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
      setLookupsLoading(true);
      try {
        const [clientsResult, artistsResult, servicesResult, regionsResult, districtsResult] =
          await Promise.all([
            usersApi.list({ role: clientRole, page: 1, limit: 500, expand: "profile,region,district" }),
            artistsApi.list({ page: 1, limit: 500 }),
            servicesApi.list({ page: 1, limit: 1000 }),
            regionsApi.list({ page: 1, limit: 1000 }),
            districtsApi.list({ page: 1, limit: 1000 }),
          ]);
        setClients(clientsResult.items);
        setArtistOptions(artistsResult.items);
        setServices(servicesResult.items);
        setRegions(regionsResult.items);
        setDistricts(districtsResult.items);
      } catch {
        setClients([]);
        setArtistOptions([]);
        setServices([]);
        setRegions([]);
        setDistricts([]);
      } finally {
        setLookupsLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const clientMap = useMemo(() => createEntityMap(clients, (client) => [client.id]), [clients]);
  const artistMap = useMemo(
    () => createEntityMap(artistOptions, (artist) => [artist.id, artist.user_id]),
    [artistOptions],
  );
  const serviceMap = useMemo(() => createEntityMap(services, (service) => [service.id]), [services]);
  const regionMap = useMemo(() => createEntityMap(regions, (region) => [region.id]), [regions]);
  const districtMap = useMemo(() => createEntityMap(districts, (district) => [district.id]), [districts]);

  const columns = useMemo<DataTableColumn<OrderRecord>[]>(
    () => [
      {
        key: "booking",
        label: "Buyurtma",
        render: (row) => (
          <BookingCell
            id={row.id}
            createdAt={row.created_at}
          />
        ),
      },
      {
        key: "date_time",
        label: "Sana / vaqt",
        render: (row) => (
          <DateTimeCell date={row.date} time={row.time ?? row.start_time} timeTo={row.time_to ?? row.end_time} />
        ),
      },
      {
        key: "client",
        label: "Mijoz",
        render: (row) => {
          const client = getClientDisplay(row, clientMap);
          return <EntityName primary={client.primary} secondary={client.secondary} fallback={client.fallback} />;
        },
      },
      {
        key: "artist",
        label: "Artist",
        render: (row) => {
          const artist = getArtistDisplay(row, artistMap);
          return <EntityName primary={artist.primary} secondary={artist.secondary} fallback={artist.fallback} />;
        },
      },
      {
        key: "service",
        label: "Xizmat",
        render: (row) => {
          const service = getServiceDisplay(row.service, row.service_id, serviceMap);
          const subService = getServiceDisplay(row.subService ?? row.sub_service, row.sub_service_id, serviceMap);
          return (
            <div className="min-w-36">
              <EntityName
                primary={service.primary}
                secondary={subService.primary || (row.sub_service_id ? subService.fallback : undefined)}
                fallback={service.fallback}
              />
              <div className="mt-1">
                <MoneyText value={row.total_price} />
              </div>
            </div>
          );
        },
      },
      {
        key: "location",
        label: "Hudud",
        render: (row) => {
          const region = getLocationName(row.region, row.region_id, regionMap);
          const district = getLocationName(row.district, row.district_id, districtMap);
          return (
            <LocationCell
              region={region.name}
              district={district.name}
              address={typeof row.address === "string" ? row.address : null}
              comment={typeof row.comment === "string" ? row.comment : null}
              regionFallback={region.fallback}
              districtFallback={district.fallback}
            />
          );
        },
      },
      {
        key: "status",
        label: "Holat",
        render: (row) => <OrderStatusBadge status={getOrderUiStatus(row)} />,
      },
    ],
    [artistMap, clientMap, districtMap, regionMap, serviceMap],
  );

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
    meta?.pageCount ??
    (meta?.total && (meta?.perPage ?? meta?.limit)
      ? Math.ceil(meta.total / (meta.perPage ?? meta.limit ?? limit))
      : undefined);

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
            label="To'lov"
            type="select"
            value={draftFilters.payment_status ?? ""}
            options={paymentStatusOptions}
            onChange={(payment_status) =>
              setDraftFilters((current) => ({ ...current, payment_status }))
            }
          />
          <FormField
            label={lookupsLoading ? "Artist yuklanmoqda..." : "Artist"}
            type="select"
            value={draftFilters.artist_id ?? ""}
            options={getArtistSelectOptions(artistOptions, draftFilters.artist_id)}
            onChange={(artist_id) => setDraftFilters((current) => ({ ...current, artist_id }))}
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
        <OrdersSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {rows.map((row, index) => (
              <OrderMobileCard
                key={String(row.id ?? index)}
                row={row}
                client={getClientDisplay(row, clientMap)}
                artist={getArtistDisplay(row, artistMap)}
                service={getServiceDisplay(row.service, row.service_id, serviceMap)}
                subService={getServiceDisplay(row.subService ?? row.sub_service, row.sub_service_id, serviceMap)}
                region={getLocationName(row.region, row.region_id, regionMap)}
                district={getLocationName(row.district, row.district_id, districtMap)}
                onDetails={() => setDialog({ type: "actions", order: row })}
                onPrimary={(action) => setDialog({ type: action, order: row })}
              />
            ))}
          </div>
          <div className="hidden lg:block">
            <DataTable
              columns={columns}
              rows={rows}
              getRowKey={(row, index) => row.id ?? index}
              actions={(row) => {
                const primaryAction = getPrimaryOrderAction(row);
                return (
                  <ActionsCell
                    primaryLabel={primaryAction?.label}
                    onPrimary={
                      primaryAction
                        ? () => setDialog({ type: primaryAction.action, order: row })
                        : undefined
                    }
                    onDetails={() => setDialog({ type: "actions", order: row })}
                  />
                );
              }}
            />
          </div>
        </>
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

type EntityDisplay = {
  primary?: string;
  secondary?: string;
  fallback: string;
};

type DisplayEntity = {
  first_name?: unknown;
  last_name?: unknown;
  full_name?: unknown;
  phone?: unknown;
  email?: unknown;
  extra_phone?: unknown;
  name?: unknown;
  name_uz?: unknown;
  name_ru?: unknown;
  name_en?: unknown;
  title?: unknown;
  slug?: unknown;
};

type LocationDisplay = {
  name?: string;
  fallback?: string;
};

type PrimaryOrderAction = {
  label: string;
  action: "confirm" | "complete";
};

function OrderMobileCard({
  row,
  client,
  artist,
  service,
  subService,
  region,
  district,
  onDetails,
  onPrimary,
}: {
  row: OrderRecord;
  client: EntityDisplay;
  artist: EntityDisplay;
  service: EntityDisplay;
  subService: EntityDisplay;
  region: LocationDisplay;
  district: LocationDisplay;
  onDetails: () => void;
  onPrimary: (action: PrimaryOrderAction["action"]) => void;
}) {
  const status = getOrderUiStatus(row);
  const primaryAction = getPrimaryOrderAction(row);

  return (
    <article className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-slate-700/70 dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-3">
        <BookingCell
          id={row.id}
          createdAt={row.created_at}
        />
        <OrderStatusBadge status={status} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DateTimeCell date={row.date} time={row.time ?? row.start_time} timeTo={row.time_to ?? row.end_time} />
        <div className="space-y-3">
          <LabeledEntity label="Mijoz" entity={client} />
          <LabeledEntity label="Artist" entity={artist} />
        </div>
        <div>
          <EntityName
            primary={service.primary}
            secondary={subService.primary || (row.sub_service_id ? subService.fallback : undefined)}
            fallback={service.fallback}
          />
          <div className="mt-1">
            <MoneyText value={row.total_price} />
          </div>
        </div>
        <LocationCell
          region={region.name}
          district={district.name}
          address={typeof row.address === "string" ? row.address : null}
          comment={typeof row.comment === "string" ? row.comment : null}
          regionFallback={region.fallback}
          districtFallback={district.fallback}
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {primaryAction ? (
          <button
            type="button"
            onClick={() => onPrimary(primaryAction.action)}
            className="grid size-10 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
            aria-label={primaryAction.label}
            title={primaryAction.label}
          >
            <CheckCircle2 className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDetails}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:text-slate-300"
        >
          Ko&apos;rish
        </button>
      </div>
    </article>
  );
}

function LabeledEntity({ label, entity }: { label: string; entity: EntityDisplay }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <EntityName primary={entity.primary} secondary={entity.secondary} fallback={entity.fallback} />
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-[22px] border border-slate-100 bg-white shadow-xl shadow-slate-950/[0.04] dark:border-slate-700/70 dark:bg-[#111827]"
        >
          <div className="flex h-full items-center gap-4 px-5">
            <div className="h-12 w-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 w-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
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
    time: "",
    time_to: "",
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
    if (!values.time) nextErrors.time = "Majburiy maydon";
    if (!values.time_to) nextErrors.time_to = "Majburiy maydon";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      date: values.date,
      time: values.time,
      time_to: values.time_to,
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
            value={values.time}
            error={errors.time}
            onChange={(time) => setValues((current) => ({ ...current, time }))}
          />
          <FormField
            label="Tugash"
            type="time"
            required
            value={values.time_to}
            error={errors.time_to}
            onChange={(time_to) => setValues((current) => ({ ...current, time_to }))}
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
          <InfoCard label="Holat" value={<OrderStatusBadge status={getOrderUiStatus(order)} />} />
          <InfoCard label="Sana" value={formatBookingDate(order.date)} />
          <InfoCard
            label="Vaqt"
            value={formatBookingTimeRange(order.time ?? order.start_time, order.time_to ?? order.end_time).primary}
          />
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
    return "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:border-sky-400/50 dark:hover:bg-sky-500/20 dark:hover:text-sky-200";
  }
  if (tone === "complete") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-200";
  }
  if (tone === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:border-rose-400/50 dark:hover:bg-rose-500/20 dark:hover:text-rose-200";
  }
  return "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-200";
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
  if (isLocationIdKey(fieldKey)) {
    return <LocationName fieldKey={fieldKey} value={value} fallback={toDisplay(value)} />;
  }
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

function createEntityMap<T extends object>(
  items: T[],
  getIds: (item: T) => Array<number | string | null | undefined>,
) {
  const map = new Map<number, T>();
  for (const item of items) {
    for (const id of getIds(item)) {
      const key = numberKey(id);
      if (key !== undefined) map.set(key, item);
    }
  }
  return map;
}

function getClientDisplay(row: OrderRecord, clientMap: Map<number, User>): EntityDisplay {
  const client = asRecord(row.client) ?? getFromMap(clientMap, row.client_id);
  return getPersonDisplay(client, row.client_id, "Client");
}

function getArtistDisplay(row: OrderRecord, artistMap: Map<number, ArtistProfile>): EntityDisplay {
  const expandedArtist = asRecord(row.artist);
  const artist = expandedArtist ?? getFromMap(artistMap, row.artist_id);

  if (artist && !expandedArtist) {
    const primary = getArtistName(artist);
    const secondary = getSecondaryText(primary, artist.phone, artist.email, artist.extra_phone);
    return {
      primary,
      secondary,
      fallback: fallbackWithId("Artist", row.artist_id),
    };
  }

  return getPersonDisplay(artist, row.artist_id, "Artist");
}

function getServiceDisplay(
  expanded: unknown,
  id: unknown,
  serviceMap: Map<number, Service>,
): EntityDisplay {
  const service = asRecord(expanded) ?? getFromMap(serviceMap, id);
  const primary = service ? getName(service) : undefined;
  return {
    primary,
    secondary: service ? stringValue(service.slug) : undefined,
    fallback: fallbackWithId("Service", id),
  };
}

function getLocationName<T extends Region | District>(
  expanded: unknown,
  id: unknown,
  map: Map<number, T>,
): LocationDisplay {
  const item = asRecord(expanded) ?? getFromMap(map, id);
  return {
    name: item ? getName(item) : undefined,
    fallback: id === null || id === undefined || id === "" ? undefined : `#${id}`,
  };
}

function getPersonDisplay(entity: DisplayEntity | undefined, id: unknown, prefix: string): EntityDisplay {
  if (!entity) return { fallback: fallbackWithId(prefix, id) };

  const firstName = stringValue(entity.first_name);
  const lastName = stringValue(entity.last_name);
  const fromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  const primary = stringValue(entity.full_name) ?? (fromParts || stringValue(entity.phone));

  return {
    primary,
    secondary: getSecondaryText(primary, entity.phone, entity.email),
    fallback: fallbackWithId(prefix, id),
  };
}

function getName(entity: DisplayEntity) {
  return (
    stringValue(entity.name_uz) ??
    stringValue(entity.name_ru) ??
    stringValue(entity.name_en) ??
    stringValue(entity.name) ??
    stringValue(entity.title) ??
    stringValue(entity.full_name)
  );
}

function getPrimaryOrderAction(row: OrderRecord): PrimaryOrderAction | undefined {
  const status = getOrderUiStatus(row);
  if (status.key === "pending_review") return { label: "Tasdiqlash", action: "confirm" };
  if (status.key === "confirmed" || status.key === "in_progress") {
    return { label: "Yakunlash", action: "complete" };
  }
  return undefined;
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : undefined;
}

function getFromMap<T>(map: Map<number, T>, id: unknown) {
  const key = numberKey(id);
  return key === undefined ? undefined : map.get(key);
}

function numberKey(value: unknown) {
  const key = typeof value === "number" ? value : Number(value);
  return Number.isFinite(key) ? key : undefined;
}

function fallbackWithId(prefix: string, id: unknown) {
  return id === null || id === undefined || id === "" ? `${prefix} not set` : `${prefix} #${id}`;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getSecondaryText(primary: string | undefined, ...values: unknown[]) {
  const normalizedPrimary = normalizeComparable(primary);
  return values
    .map(stringValue)
    .find((value) => value && normalizeComparable(value) !== normalizedPrimary);
}

function normalizeComparable(value: string | undefined) {
  return value?.replace(/\s+/g, "").toLowerCase();
}

function createFiltersFromSearchParams(searchParams: Pick<URLSearchParams, "get"> | null): OrderFilters {
  return {
    status: searchParams?.get("status") ?? "",
    payment_status: searchParams?.get("payment_status") ?? "",
    artist_id: searchParams?.get("artist_id") ?? "",
    date_from: searchParams?.get("date_from") ?? "",
    date_to: searchParams?.get("date_to") ?? "",
    page: Number(searchParams?.get("page") ?? 1),
    limit: Number(searchParams?.get("limit") ?? limit),
  };
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
