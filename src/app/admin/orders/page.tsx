"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Drawer, Dropdown, Input, Select, Tabs } from "antd";
import type { MenuProps } from "antd";
import {
  AtSign,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Flag,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import {
  adminActionButtonClass,
  adminDangerActionButtonClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { isLocationIdKey, LocationName } from "@/components/admin/location-name";
import {
  DateTimeCell,
  EntityName,
  MoneyText,
  StatusBadge as OrderStatusBadge,
} from "@/components/admin/order-table-cells";
import { useToast } from "@/components/ui/toast";
import {
  artistsApi,
  districtsApi,
  ordersApi,
  type ConfirmOrderPayload,
  regionsApi,
  servicesApi,
  usersApi,
  type OrderFilters,
  type RescheduleOrderPayload,
  type UpdateOrderPayload,
} from "@/lib/api/admin-content";
import { getArtistName } from "@/lib/artist-display";
import { formatBookingDate, formatBookingTimeRange, formatUnixDateTime } from "@/lib/order-format";
import { getOrderUiStatus } from "@/lib/order-status";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/translations";
import { cn, getValue, isRecord, normalizeDate, toDisplay } from "@/lib/utils";
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
  | { type: "details"; order: OrderRecord }
  | { type: "contact"; order: OrderRecord }
  | { type: "edit"; order: OrderRecord }
  | { type: "confirm"; order: OrderRecord }
  | { type: "complete"; order: OrderRecord }
  | { type: "cancel"; order: OrderRecord }
  | { type: "reschedule"; order: OrderRecord }
  | null;

const limit = 20;
const clientRole = 10;

type OrderStatusTabKey = "all" | "pending" | "confirmed" | "completed" | "cancelled";
type OrderDateRange = "all" | "today" | "week" | "month";

type OrderStatusTab = {
  key: OrderStatusTabKey;
  value: string;
};

const orderStatusTabValues: OrderStatusTab[] = [
  { key: "all", value: "" },
  { key: "pending", value: "pending" },
  { key: "confirmed", value: "confirmed" },
  { key: "completed", value: "completed" },
  { key: "cancelled", value: "cancelled" },
];

const initialStatusCounts: Record<OrderStatusTabKey, number> = {
  all: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
};

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
  const { locale } = useI18n();
  const labels = useMemo(() => getOrderLabels(locale), [locale]);
  const orderStatusTabs = useMemo(() => getOrderStatusTabs(labels), [labels]);
  const paymentStatusOptions = useMemo(() => getPaymentStatusOptions(labels), [labels]);
  const dateRangeOptions = useMemo(() => getDateRangeOptions(labels), [labels]);
  const [filters, setFilters] = useState<OrderFilters>(initialOrderFilters);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(initialOrderFilters);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<OrderDateRange>(() => inferDateRange(initialOrderFilters));
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [rows, setRows] = useState<OrderRecord[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<OrderStatusTabKey, number>>(initialStatusCounts);
  const [meta, setMeta] = useState<ListResult<OrderRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();
  const activeStatus = orderStatusTabFromValue(draftFilters.status);
  const page = Number(filters.page ?? 1);
  const pageSize = Number(filters.limit) || limit;

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
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOrders]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const results = await Promise.all(
        orderStatusTabs.map((tab) =>
          ordersApi.list({
            status: tab.value,
            page: 1,
            limit: 1,
          }),
        ),
      );

      setStatusCounts(
        orderStatusTabs.reduce<Record<OrderStatusTabKey, number>>((accumulator, tab, index) => {
          accumulator[tab.key] = getResultCount(results[index]);
          return accumulator;
        }, { ...initialStatusCounts }),
      );
    } catch {
      setStatusCounts(initialStatusCounts);
    }
  }, [orderStatusTabs]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
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
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStatusCounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStatusCounts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const next: OrderFilters = {
          ...current,
          status: normalizeOrderStatusFilter(draftFilters.status),
          payment_status: draftFilters.payment_status ?? "",
          artist_id: draftFilters.artist_id ?? "",
          date_from: draftFilters.date_from ?? "",
          date_to: draftFilters.date_to ?? "",
          page: 1,
          limit: Number(current.limit) || limit,
        };
        return sameOrderFilters(current, next) ? current : next;
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    draftFilters.artist_id,
    draftFilters.date_from,
    draftFilters.date_to,
    draftFilters.payment_status,
    draftFilters.status,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const clientMap = useMemo(() => createEntityMap(clients, (client) => [client.id]), [clients]);
  const artistMap = useMemo(
    () => createEntityMap(artistOptions, (artist) => [artist.id, artist.user_id]),
    [artistOptions],
  );
  const serviceMap = useMemo(() => createEntityMap(services, (service) => [service.id]), [services]);
  const regionMap = useMemo(() => createEntityMap(regions, (region) => [region.id]), [regions]);
  const districtMap = useMemo(() => createEntityMap(districts, (district) => [district.id]), [districts]);
  const displayedRows = useMemo(
    () => filterOrderRows(rows, search, {
      clientMap,
      artistMap,
      serviceMap,
      regionMap,
      districtMap,
      labels,
    }),
    [artistMap, clientMap, districtMap, labels, regionMap, rows, search, serviceMap],
  );

  const openDialog = async (type: "edit", row: OrderRecord) => {
    if (!row.id) {
      toast.error(labels.idNotFound);
      return;
    }
    setSubmitting(true);
    try {
      const order = await ordersApi.detail(row.id);
      setDialog({ type, order });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (row: OrderRecord) => {
    if (!row.id) {
      setDialog({ type: "details", order: row });
      return;
    }
    setSubmitting(true);
    try {
      const order = await ordersApi.detail(row.id);
      setDialog({ type: "details", order: { ...row, ...order } });
    } catch {
      setDialog({ type: "details", order: row });
    } finally {
      setSubmitting(false);
    }
  };

  const openContact = async (row: OrderRecord) => {
    if (!row.id) {
      setDialog({ type: "contact", order: row });
      return;
    }
    setSubmitting(true);
    try {
      let order: OrderRecord;
      try {
        order = await ordersApi.detail(row.id, { expand: "user" });
      } catch {
        order = await ordersApi.detail(row.id);
      }
      let artistDetail: ArtistProfile | undefined;
      const artistId = numberKey(order.artist_id ?? row.artist_id);
      if (artistId !== undefined) {
        try {
          artistDetail = await artistsApi.detail(artistId);
        } catch {
          artistDetail = undefined;
        }
      }
      setDialog({
        type: "contact",
        order: { ...row, ...order, artist_profile_contact: artistDetail },
      });
    } catch {
      setDialog({ type: "contact", order: row });
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = (status: OrderStatusTabKey) => {
    const selected = orderStatusTabs.find((tab) => tab.key === status) ?? orderStatusTabs[0];
    setDraftFilters((current) => ({ ...current, status: selected.value }));
  };

  const changeDateRange = (nextRange: OrderDateRange) => {
    setDateRange(nextRange);
    setDraftFilters((current) => ({
      ...current,
      ...getDateRangeFilters(nextRange),
    }));
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setSearchDraft("");
    setSearch("");
    setDateRange("all");
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
        let confirmOrder = dialog.order;
        try {
          const detail = await ordersApi.detail(dialog.order.id);
          confirmOrder = { ...dialog.order, ...detail };
        } catch {
          confirmOrder = dialog.order;
        }
        await ordersApi.confirm(dialog.order.id, buildConfirmOrderPayload(confirmOrder));
        toast.success(labels.confirmedToast);
      } else {
        await ordersApi.complete(dialog.order.id);
        toast.success(labels.completedToast);
      }
      setDialog(null);
      await Promise.all([fetchOrders(), fetchStatusCounts()]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.actionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const pageCount =
    meta?.pageCount ??
    (meta?.total && (meta?.perPage ?? meta?.limit)
      ? Math.ceil(meta.total / (meta.perPage ?? meta.limit ?? limit))
      : undefined);

  return (
    <section className="space-y-6">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]">
        <OrderStatusTabs tabs={orderStatusTabs} active={activeStatus} counts={statusCounts} onChange={changeStatus} />
        <div className="grid gap-3 pt-4 md:grid-cols-[minmax(180px,1.25fr)_minmax(170px,0.75fr)_minmax(150px,0.65fr)_auto] md:items-center">
          <Input
            allowClear
            prefix={<Search className="size-4 text-slate-400" />}
            placeholder={labels.searchPlaceholder}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className="h-10"
          />
          <Select
            className="h-10"
            value={draftFilters.payment_status ?? ""}
            onChange={(payment_status) =>
              setDraftFilters((current) => ({ ...current, payment_status }))
            }
            options={paymentStatusOptions}
          />
          <Select
            className="h-10"
            value={dateRange}
            onChange={changeDateRange}
            options={dateRangeOptions}
          />
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            <RotateCcw className="size-4" />
            {labels.reset}
          </button>
        </div>
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : displayedRows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {displayedRows.map((row, index) => (
              <OrderMobileCard
                key={String(row.id ?? index)}
                row={row}
                client={getClientDisplay(row, clientMap, labels)}
                artist={getArtistDisplay(row, artistMap, labels)}
                service={getServiceDisplay(row.service, row.service_id, serviceMap, labels)}
                subService={getServiceDisplay(row.subService ?? row.sub_service, row.sub_service_id, serviceMap, labels)}
                labels={labels}
                onDetails={() => void openDetail(row)}
                onContact={() => void openContact(row)}
                onActions={() => setDialog({ type: "actions", order: row })}
                onPrimary={(action) => setDialog({ type: action, order: row })}
              />
            ))}
          </div>
          <div className="hidden lg:block">
            <OrdersDataTable
              rows={displayedRows}
              clientMap={clientMap}
              artistMap={artistMap}
              serviceMap={serviceMap}
              labels={labels}
              onOpenDetail={(row) => void openDetail(row)}
              onOpenContact={(row) => void openContact(row)}
              onEdit={(row) => void openDialog("edit", row)}
              onConfirm={(row) => setDialog({ type: "confirm", order: row })}
              onComplete={(row) => setDialog({ type: "complete", order: row })}
              onReschedule={(row) => setDialog({ type: "reschedule", order: row })}
              onCancel={(row) => setDialog({ type: "cancel", order: row })}
            />
          </div>
        </>
      )}

      {pageCount ? (
        <Pagination
          meta={meta}
          page={page}
          pageSize={pageSize}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      ) : (
        <FallbackPagination
          page={page}
          rowsCount={rows.length}
          pageSize={pageSize}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      )}

      {dialog?.type === "actions" ? (
        <OrderActionsModal
          order={dialog.order}
          labels={labels}
          onClose={() => setDialog(null)}
          onEdit={() => void openDialog("edit", dialog.order)}
          onConfirm={() => setDialog({ type: "confirm", order: dialog.order })}
          onComplete={() => setDialog({ type: "complete", order: dialog.order })}
          onReschedule={() => setDialog({ type: "reschedule", order: dialog.order })}
          onCancel={() => setDialog({ type: "cancel", order: dialog.order })}
        />
      ) : null}

      <OrderDetailDrawer
        open={dialog?.type === "details"}
        order={dialog?.type === "details" ? dialog.order : null}
        client={dialog?.type === "details" ? getClientDisplay(dialog.order, clientMap, labels) : undefined}
        artist={dialog?.type === "details" ? getArtistDisplay(dialog.order, artistMap, labels) : undefined}
        service={
          dialog?.type === "details"
            ? getServiceDisplay(dialog.order.service, dialog.order.service_id, serviceMap, labels)
            : undefined
        }
        subService={
          dialog?.type === "details"
            ? getServiceDisplay(
                dialog.order.subService ?? dialog.order.sub_service,
                dialog.order.sub_service_id,
                serviceMap,
                labels,
              )
            : undefined
        }
        region={dialog?.type === "details" ? getLocationName(dialog.order.region, dialog.order.region_id, regionMap, labels.locale) : undefined}
        district={
          dialog?.type === "details" ? getLocationName(dialog.order.district, dialog.order.district_id, districtMap, labels.locale) : undefined
        }
        onClose={() => setDialog(null)}
        onEdit={() => {
          if (dialog?.type === "details") void openDialog("edit", dialog.order);
        }}
        onConfirm={() => {
          if (dialog?.type === "details") setDialog({ type: "confirm", order: dialog.order });
        }}
        onComplete={() => {
          if (dialog?.type === "details") setDialog({ type: "complete", order: dialog.order });
        }}
        onReschedule={() => {
          if (dialog?.type === "details") setDialog({ type: "reschedule", order: dialog.order });
        }}
        onCancel={() => {
          if (dialog?.type === "details") setDialog({ type: "cancel", order: dialog.order });
        }}
        labels={labels}
      />

      <OrderContactDrawer
        open={dialog?.type === "contact"}
        order={dialog?.type === "contact" ? dialog.order : null}
        client={dialog?.type === "contact" ? getClientDisplay(dialog.order, clientMap, labels) : undefined}
        artist={dialog?.type === "contact" ? getArtistDisplay(dialog.order, artistMap, labels) : undefined}
        labels={labels}
        onClose={() => setDialog(null)}
      />

      {dialog?.type === "edit" ? (
        <EditOrderDrawer
          order={dialog.order}
          loading={submitting}
          labels={labels}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.order.id) return;
            setSubmitting(true);
            try {
              await ordersApi.update(dialog.order.id, payload);
              toast.success(labels.updatedToast);
              setDialog(null);
              await Promise.all([fetchOrders(), fetchStatusCounts()]);
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.updateFailed);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "confirm" ? (
        <ConfirmDialog
          loading={submitting}
          title={labels.confirmDialogTitle}
          message={labels.confirmDialogMessage}
          confirmLabel={labels.confirmAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runSimpleAction("confirm")}
        />
      ) : null}

      {dialog?.type === "complete" ? (
        <ConfirmDialog
          loading={submitting}
          title={labels.completeDialogTitle}
          message={labels.completeDialogMessage}
          confirmLabel={labels.completeAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runSimpleAction("complete")}
        />
      ) : null}

      {dialog?.type === "cancel" ? (
        <CancelOrderModal
          loading={submitting}
          labels={labels}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (!dialog.order.id) return;
            setSubmitting(true);
            try {
              await ordersApi.cancel(dialog.order.id, reason);
              toast.success(labels.cancelledToast);
              setDialog(null);
              await Promise.all([fetchOrders(), fetchStatusCounts()]);
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.cancelFailed);
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
          labels={labels}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.order.id) return;
            setSubmitting(true);
            try {
              await ordersApi.reschedule(dialog.order.id, payload);
              toast.success(labels.rescheduledToast);
              setDialog(null);
              await Promise.all([fetchOrders(), fetchStatusCounts()]);
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.rescheduleFailed);
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

type OrderLabels = ReturnType<typeof getOrderLabels>;

function getOrderStatusTabs(labels: OrderLabels): Array<OrderStatusTab & { label: string }> {
  return orderStatusTabValues.map((tab) => ({
    ...tab,
    label: labels.statusTabs[tab.key],
  }));
}

function getPaymentStatusOptions(labels: OrderLabels) {
  return [
    { label: labels.paymentAll, value: "" },
    { label: labels.paymentPending, value: "10" },
    { label: labels.paymentPaid, value: "20" },
    { label: labels.paymentRefunded, value: "30" },
  ];
}

function getDateRangeOptions(labels: OrderLabels): Array<{ label: string; value: OrderDateRange }> {
  return [
    { label: labels.dateAll, value: "all" },
    { label: labels.today, value: "today" },
    { label: labels.week, value: "week" },
    { label: labels.month, value: "month" },
  ];
}

function localizeOrderStatus(status: ReturnType<typeof getOrderUiStatus>, labels: OrderLabels) {
  return {
    ...status,
    label: labels.statusTabs[status.key] ?? status.label,
  };
}

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

function OrderStatusTabs({
  tabs,
  active,
  counts,
  onChange,
}: {
  tabs: Array<OrderStatusTab & { label: string }>;
  active: OrderStatusTabKey;
  counts: Record<OrderStatusTabKey, number>;
  onChange: (status: OrderStatusTabKey) => void;
}) {
  return (
    <div className="border-b border-slate-200 dark:border-white/10">
      <div className="flex gap-7 overflow-x-auto overflow-y-hidden">
        {tabs.map((tab) => {
          const selected = tab.key === active;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "relative inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold transition",
                selected
                  ? "text-blue-600 dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  selected
                    ? "bg-blue-50 text-blue-600 dark:bg-amber-400/10 dark:text-amber-300"
                    : orderStatusCountClass(tab.key),
                )}
              >
                {counts[tab.key] ?? 0}
              </span>
              {selected ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600 dark:bg-amber-400" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrdersDataTable({
  rows,
  clientMap,
  artistMap,
  serviceMap,
  labels,
  onOpenDetail,
  onOpenContact,
  onEdit,
  onConfirm,
  onComplete,
  onReschedule,
  onCancel,
}: {
  rows: OrderRecord[];
  clientMap: Map<number, User>;
  artistMap: Map<number, ArtistProfile>;
  serviceMap: Map<number, Service>;
  labels: OrderLabels;
  onOpenDetail: (order: OrderRecord) => void;
  onOpenContact: (order: OrderRecord) => void;
  onEdit: (order: OrderRecord) => void;
  onConfirm: (order: OrderRecord) => void;
  onComplete: (order: OrderRecord) => void;
  onReschedule: (order: OrderRecord) => void;
  onCancel: (order: OrderRecord) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111827]">
      <div className="admin-table-scroll overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="h-11 border-b border-slate-200 bg-slate-50 text-left dark:border-white/10 dark:bg-white/[0.03]">
              <TableHead>{labels.orderColumn}</TableHead>
              <TableHead>{labels.serviceColumn}</TableHead>
              <TableHead>{labels.clientColumn}</TableHead>
              <TableHead>{labels.dateTimeColumn}</TableHead>
              <TableHead>{labels.statusColumn}</TableHead>
              <TableHead className="text-right">{labels.actionsColumn}</TableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const client = getClientDisplay(row, clientMap, labels);
              const artist = getArtistDisplay(row, artistMap, labels);
              const service = getServiceDisplay(row.service, row.service_id, serviceMap, labels);
              const subService = getServiceDisplay(row.subService ?? row.sub_service, row.sub_service_id, serviceMap, labels);

              return (
                <tr
                  key={String(row.id ?? index)}
                  className="h-14 border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-white/[0.035]"
                >
                  <TableCell>
                    <OrderIdCell id={row.id} />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <EntityName
                        primary={service.primary}
                        secondary={getServiceMeta(subService, artist, row.sub_service_id, labels)}
                        fallback={service.fallback}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <EntityName primary={client.primary} secondary={client.secondary} fallback={client.fallback} />
                  </TableCell>
                  <TableCell>
                    <DateTimeCell date={row.date} time={row.time ?? row.start_time} timeTo={row.time_to ?? row.end_time} />
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={localizeOrderStatus(getOrderUiStatus(row), labels)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenContact(row)}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
                        aria-label={labels.contactAction}
                        title={labels.contactAction}
                      >
                        <Phone className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(row)}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
                        aria-label={labels.viewAction}
                        title={labels.viewAction}
                      >
                        <Eye className="size-4" />
                      </button>
                      <OrderActionsDropdown
                        order={row}
                        labels={labels}
                        onEdit={onEdit}
                        onConfirm={onConfirm}
                        onComplete={onComplete}
                        onReschedule={onReschedule}
                        onCancel={onCancel}
                      />
                    </div>
                  </TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderActionsDropdown({
  order,
  labels,
  onEdit,
  onConfirm,
  onComplete,
  onReschedule,
  onCancel,
}: {
  order: OrderRecord;
  labels: OrderLabels;
  onEdit: (order: OrderRecord) => void;
  onConfirm: (order: OrderRecord) => void;
  onComplete: (order: OrderRecord) => void;
  onReschedule: (order: OrderRecord) => void;
  onCancel: (order: OrderRecord) => void;
}) {
  const primaryAction = getPrimaryOrderAction(order, labels);
  const items: MenuProps["items"] = [
    {
      key: "edit",
      icon: <Pencil className="size-4" />,
      label: labels.editAction,
      onClick: () => onEdit(order),
    },
    primaryAction?.action === "confirm"
      ? {
          key: "confirm",
          icon: <ShieldCheck className="size-4 text-sky-500" />,
          label: labels.confirmAction,
          onClick: () => onConfirm(order),
        }
      : null,
    primaryAction?.action === "complete"
      ? {
          key: "complete",
          icon: <Flag className="size-4 text-emerald-500" />,
          label: labels.completeAction,
          onClick: () => onComplete(order),
        }
      : null,
    {
      key: "reschedule",
      icon: <CalendarClock className="size-4" />,
      label: labels.rescheduleAction,
      onClick: () => onReschedule(order),
    },
    {
      key: "cancel",
      danger: true,
      icon: <XCircle className="size-4 text-rose-500" />,
      label: labels.cancelOrderAction,
      onClick: () => onCancel(order),
    },
  ].filter(Boolean) as MenuProps["items"];

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
      <button
        type="button"
        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
        aria-label={labels.actionsColumn}
        onClick={(event) => event.preventDefault()}
      >
        <MoreVertical className="size-4" />
      </button>
    </Dropdown>
  );
}

function PaymentStatusBadge({ order, labels }: { order: OrderRecord; labels: OrderLabels }) {
  const payment = getPaymentStatusDisplay(order, labels);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black leading-none",
        payment.tone === "paid"
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
          : payment.tone === "refunded"
            ? "border-sky-400/35 bg-sky-400/10 text-sky-700 dark:text-sky-300"
            : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {payment.label}
    </span>
  );
}

function YandexMapLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm font-black text-amber-600 underline-offset-4 transition hover:text-amber-500 hover:underline dark:text-amber-300 dark:hover:text-amber-200"
    >
      {label}
      <ExternalLink className="size-3.5" />
    </a>
  );
}

function OrderDetailDrawer({
  order,
  client,
  artist,
  service,
  subService,
  region,
  district,
  open,
  onClose,
  onEdit,
  onConfirm,
  onComplete,
  onReschedule,
  onCancel,
  labels,
}: {
  order: OrderRecord | null;
  client?: EntityDisplay;
  artist?: EntityDisplay;
  service?: EntityDisplay;
  subService?: EntityDisplay;
  region?: LocationDisplay;
  district?: LocationDisplay;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  labels: OrderLabels;
}) {
  if (!order || !client || !artist || !service || !subService || !region || !district) return null;

  const timeRange = formatBookingTimeRange(order.time ?? order.start_time, order.time_to ?? order.end_time);
  const yandexMapUrl = getYandexMapUrl(order);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 520px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5 text-rose-500" />}
      rootClassName="artistbor-application-drawer artistbor-order-drawer"
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
            {labels.orderTitle} #{toDisplay(order.id)}
          </span>
          <OrderStatusBadge status={localizeOrderStatus(getOrderUiStatus(order), labels)} />
        </div>
      }
      footer={
        <OrderDrawerActions
          order={order}
          onEdit={onEdit}
          onConfirm={onConfirm}
          onComplete={onComplete}
          onReschedule={onReschedule}
          onCancel={onCancel}
          labels={labels}
        />
      }
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 64, padding: "0 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
    >
      <div className="space-y-3.5 p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
            <WalletCards className="size-6" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
              {service.primary || service.fallback}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatBookingDate(order.date)} · {timeRange.primary}
            </p>
          </div>
        </div>

        <Tabs
          defaultActiveKey="info"
          className="artistbor-drawer-tabs"
          items={[
            {
              key: "info",
              label: labels.infoTab,
              children: (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.mainInfoTitle}</h4>
                  <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
                    <OrderInfoCell icon={<UserRound className="size-4" />} label={labels.clientColumn} value={entityText(client)} />
                    <OrderInfoCell icon={<ShieldCheck className="size-4" />} label={labels.artistLabel} value={entityText(artist)} />
                    <OrderInfoCell icon={<CalendarDays className="size-4" />} label={labels.dateLabel} value={formatBookingDate(order.date)} />
                    <OrderInfoCell icon={<CalendarClock className="size-4" />} label={labels.timeLabel} value={timeRange.primary} />
                    <OrderInfoCell icon={<CreditCard className="size-4" />} label={labels.paymentLabel} value={<PaymentStatusBadge order={order} labels={labels} />} />
                    <OrderInfoCell icon={<WalletCards className="size-4" />} label={labels.priceLabel} value={<MoneyText value={order.total_price} emptyLabel={labels.priceNotSet} currencyLabel={labels.currency} locale={labels.locale} />} />
                    <OrderInfoCell icon={<MapPin className="size-4" />} label={labels.regionLabel} value={formatLocationText(region, district)} />
                    <OrderInfoCell
                      icon={<MapPin className="size-4" />}
                      label={labels.mapLabel}
                      value={yandexMapUrl ? <YandexMapLink href={yandexMapUrl} label={labels.openYandexMap} /> : undefined}
                    />
                    <OrderInfoCell className="sm:col-span-2" icon={<MapPin className="size-4" />} label={labels.addressLabel} value={order.address} />
                    <OrderInfoCell className="sm:col-span-2" icon={<Pencil className="size-4" />} label={labels.noteLabel} value={order.comment ?? order.notes} />
                  </div>
                </div>
              ),
            },
            {
              key: "technical",
              label: labels.technicalTab,
              children: (
                <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
                  <OrderInfoCell icon={<CreditCard className="size-4" />} label={labels.orderStatusLabel} value={<OrderStatusBadge status={localizeOrderStatus(getOrderUiStatus(order), labels)} />} />
                  <OrderInfoCell icon={<CreditCard className="size-4" />} label={labels.paymentStatusLabel} value={<PaymentStatusBadge order={order} labels={labels} />} />
                  <OrderInfoCell icon={<CalendarClock className="size-4" />} label={labels.paymentDeadlineLabel} value={formatNullableUnixDate(order.payment_expires_at)} />
                  <OrderInfoCell icon={<CalendarDays className="size-4" />} label={labels.createdAtLabel} value={formatNullableUnixDate(order.created_at)} />
                  <OrderInfoCell icon={<CalendarDays className="size-4" />} label={labels.updatedAtLabel} value={formatNullableUnixDate(order.updated_at)} />
                  <OrderInfoCell icon={<WalletCards className="size-4" />} label={labels.subServiceLabel} value={subService.primary || subService.fallback} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </Drawer>
  );
}

function OrderDrawerActions({
  order,
  onEdit,
  onConfirm,
  onComplete,
  onReschedule,
  onCancel,
  labels,
}: {
  order: OrderRecord;
  onEdit: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  labels: OrderLabels;
}) {
  const primaryAction = getPrimaryOrderAction(order, labels);

  return (
    <div className="grid grid-cols-2 gap-2">
      <DrawerActionButton icon={<Pencil className="size-4" />} label={labels.editAction} onClick={onEdit} />
      {primaryAction?.action === "confirm" ? (
        <DrawerActionButton
          icon={<ShieldCheck className="size-4" />}
          label={labels.confirmAction}
          tone="confirm"
          onClick={onConfirm}
        />
      ) : null}
      {primaryAction?.action === "complete" ? (
        <DrawerActionButton
          icon={<Flag className="size-4" />}
          label={labels.completeAction}
          tone="complete"
          onClick={onComplete}
        />
      ) : null}
      <DrawerActionButton
        icon={<CalendarClock className="size-4" />}
        label={labels.rescheduleAction}
        onClick={onReschedule}
      />
      <DrawerActionButton icon={<XCircle className="size-4" />} label={labels.cancelOrderAction} tone="danger" onClick={onCancel} />
    </div>
  );
}

function DrawerActionButton({
  icon,
  label,
  tone = "default",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "confirm" | "complete" | "danger";
  onClick: () => void;
}) {
  const toneClass = {
    default:
      "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:text-slate-200 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-200",
    confirm:
      "border-sky-200 text-sky-700 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10",
    complete:
      "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10",
    danger:
      "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-3 text-xs font-black transition dark:bg-transparent",
        toneClass,
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function OrderContactDrawer({
  order,
  client,
  artist,
  open,
  onClose,
  labels,
}: {
  order: OrderRecord | null;
  client?: EntityDisplay;
  artist?: EntityDisplay;
  open: boolean;
  onClose: () => void;
  labels: OrderLabels;
}) {
  if (!order || !client || !artist) return null;

  const clientRecord = getOrderClientRecord(order);
  const artistRecord = getOrderArtistRecord(order);
  const clientPhone = getFirstStringFromRecord(
    clientRecord,
    "phone",
    "user.phone",
    "profile.phone",
  );
  const clientEmail = getFirstStringFromRecord(
    clientRecord,
    "email",
    "user.email",
    "profile.email",
  );
  const orderRootRecord = order as UnknownRecord;
  const artistPhone = getFirstStringFromRecord(
    artistRecord,
    "phone",
    "user.phone",
    "profile.phone",
    "extra_phone",
  );
  const artistAdministratorPhone =
    getFirstStringFromRecord(
      artistRecord,
      "administrator_phone",
      "artistProfile.administrator_phone",
      "artist_profile.administrator_phone",
      "admin_phone",
      "manager_phone",
      "administrator.phone",
    ) ??
    getFirstStringFromRecord(
      orderRootRecord,
      "artist_administrator_phone",
      "administrator_phone",
      "artist.administrator_phone",
      "artist.artistProfile.administrator_phone",
      "artist_profile.administrator_phone",
      "artistProfile.administrator_phone",
      "artist_profile_contact.administrator_phone",
      "artist_profile_contact.artistProfile.administrator_phone",
    );
  const artistAdministratorName =
    getFirstStringFromRecord(
      artistRecord,
      "administrator_name",
      "artistProfile.administrator_name",
      "artist_profile.administrator_name",
      "administrator.name",
    ) ??
    getFirstStringFromRecord(
      orderRootRecord,
      "artist_administrator_name",
      "administrator_name",
      "artist.administrator_name",
      "artist.artistProfile.administrator_name",
      "artist_profile.administrator_name",
      "artistProfile.administrator_name",
      "artist_profile_contact.administrator_name",
      "artist_profile_contact.artistProfile.administrator_name",
    );
  const artistEmail = getFirstStringFromRecord(
    artistRecord,
    "email",
    "user.email",
    "profile.email",
  );
  const rows = [
    {
      label: labels.clientPhone,
      value: clientPhone,
      icon: <Phone className="size-4" />,
      copyable: true,
    },
    {
      label: labels.clientEmail,
      value: clientEmail,
      icon: <AtSign className="size-4" />,
      copyable: true,
    },
    {
      label: labels.artistPhone,
      value: artistPhone,
      icon: <Phone className="size-4" />,
      copyable: true,
    },
    {
      label: labels.artistAdministratorName,
      value: artistAdministratorName,
      icon: <UserRound className="size-4" />,
    },
    {
      label: labels.artistAdministratorPhone,
      value: artistAdministratorPhone,
      icon: <Phone className="size-4" />,
      copyable: true,
    },
    {
      label: labels.artistEmail,
      value: artistEmail,
      icon: <AtSign className="size-4" />,
      copyable: true,
    },
  ];

  const handleCopy = async (value: string) => {
    if (!value || value === "—") return;
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      return;
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 420px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer artistbor-contact-drawer"
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
      title={
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-6 text-slate-950 dark:text-white">{labels.contactAction}</p>
          <p className="mt-1 truncate text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
            {labels.orderTitle} #{toDisplay(order.id)}
          </p>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-full cursor-pointer rounded-lg border border-rose-200 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
        >
          {labels.close}
        </button>
      }
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 82, padding: "12px 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
    >
      <div className="p-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#121a2a]">
          {rows.map((row) => {
            const value = row.value || "—";

            return (
              <div
                key={row.label}
                className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-3 py-2.5 last:border-b-0 dark:border-white/10"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
                  {row.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{row.label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
                    {value}
                  </p>
                </div>
                {row.copyable && value !== "—" ? (
                  <button
                    type="button"
                    onClick={() => void handleCopy(value)}
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={labels.copyValue(row.label)}
                  >
                    <Copy className="size-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}

function OrderInfoCell({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  const isMissing = value === null || value === undefined || value === "";

  return (
    <div className={cn("flex min-h-16 gap-3 bg-slate-50 p-3 dark:bg-[#121a2a]", className)}>
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
          {isMissing ? "—" : value}
        </div>
      </div>
    </div>
  );
}

function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-middle text-sm", className)}>{children}</td>;
}

function OrderIdCell({ id }: { id: unknown }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-black text-slate-950 dark:text-white">#{formatOrderId(id)}</p>
    </div>
  );
}

function OrderMobileCard({
  row,
  client,
  artist,
  service,
  subService,
  onDetails,
  onContact,
  onActions,
  onPrimary,
  labels,
}: {
  row: OrderRecord;
  client: EntityDisplay;
  artist: EntityDisplay;
  service: EntityDisplay;
  subService: EntityDisplay;
  onDetails: () => void;
  onContact: () => void;
  onActions: () => void;
  onPrimary: (action: PrimaryOrderAction["action"]) => void;
  labels: OrderLabels;
}) {
  const status = localizeOrderStatus(getOrderUiStatus(row), labels);
  const primaryAction = getPrimaryOrderAction(row, labels);

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-3">
        <OrderIdCell id={row.id} />
        <OrderStatusBadge status={status} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <EntityName
            primary={service.primary}
            secondary={getServiceMeta(subService, artist, row.sub_service_id, labels)}
            fallback={service.fallback}
          />
        </div>
        <LabeledEntity label={labels.clientColumn} entity={client} />
        <DateTimeCell date={row.date} time={row.time ?? row.start_time} timeTo={row.time_to ?? row.end_time} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {primaryAction ? (
          <button
            type="button"
            onClick={() => onPrimary(primaryAction.action)}
            className="grid size-10 cursor-pointer place-items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
            aria-label={primaryAction.label}
            title={primaryAction.label}
          >
            <CheckCircle2 className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onContact}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
        >
          <Phone className="size-3.5" />
          {labels.contactAction}
        </button>
        <button
          type="button"
          onClick={onDetails}
          className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:text-slate-300"
        >
          {labels.viewAction}
        </button>
        <button
          type="button"
          onClick={onActions}
          className="grid size-10 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05]"
          aria-label={labels.actionsColumn}
        >
          <MoreVertical className="size-4" />
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

function EditOrderDrawer({
  order,
  loading,
  labels,
  onClose,
  onSubmit,
}: {
  order: OrderRecord;
  loading: boolean;
  labels: OrderLabels;
  onClose: () => void;
  onSubmit: (payload: UpdateOrderPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    notes: typeof order.notes === "string" ? order.notes : "",
    address: typeof order.address === "string" ? order.address : "",
    lat: coordinateNumber(order.lat)?.toString() ?? "",
    lon: (coordinateNumber(order.lon) ?? coordinateNumber(order.lng) ?? coordinateNumber(order.long))?.toString() ?? "",
  });
  const formId = `order-edit-form-${order.id ?? "unknown"}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = compactPayload<UpdateOrderPayload>({
      notes: values.notes,
      address: values.address,
      lat: parseCoordinateInput(values.lat),
      lon: parseCoordinateInput(values.lon),
    });
    await onSubmit(payload);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      size="min(100vw, 480px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
      title={
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-6 text-slate-950 dark:text-white">{labels.editModalTitle}</p>
          <p className="mt-1 truncate text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
            {labels.orderTitle} #{toDisplay(order.id)}
          </p>
        </div>
      }
      footer={<FormActions labels={labels} loading={loading} onClose={onClose} form={formId} />}
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 82, padding: "12px 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
    >
      <form id={formId} onSubmit={submit} className="space-y-5 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            {labels.mainInfoTitle}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <OrderEditInfo label="ID" value={`#${formatOrderId(order.id)}`} />
            <OrderEditInfo label={labels.orderStatusLabel} value={localizeOrderStatus(getOrderUiStatus(order), labels).label} />
            <OrderEditInfo label={labels.dateLabel} value={formatBookingDate(order.date)} />
            <OrderEditInfo label={labels.timeLabel} value={formatBookingTimeRange(order.time ?? order.start_time, order.time_to ?? order.end_time).primary} />
            <OrderEditInfo label={labels.priceLabel} value={order.total_price ? `${toDisplay(order.total_price)} ${labels.currency}` : labels.priceNotSet} />
            <OrderEditInfo label={labels.paymentStatusLabel} value={getPaymentStatusDisplay(order, labels).label} />
          </div>
        </div>
        <FormField
          label={labels.noteLabel}
          type="textarea"
          rows={4}
          value={values.notes}
          onChange={(notes) => setValues((current) => ({ ...current, notes }))}
        />
        <FormField
          label={labels.addressLabel}
          type="textarea"
          rows={4}
          value={values.address}
          onChange={(address) => setValues((current) => ({ ...current, address }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={labels.latitudeLabel}
            type="number"
            value={values.lat}
            onChange={(lat) => setValues((current) => ({ ...current, lat }))}
          />
          <FormField
            label={labels.longitudeLabel}
            type="number"
            value={values.lon}
            onChange={(lon) => setValues((current) => ({ ...current, lon }))}
          />
        </div>
      </form>
    </Drawer>
  );
}

function OrderEditInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value || "—"}
      </div>
    </div>
  );
}

function CancelOrderModal({
  loading,
  labels,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  labels: OrderLabels;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setError(labels.requiredField);
      return;
    }
    await onSubmit(reason);
  };

  return (
    <Modal title={labels.cancelModalTitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <FormField
          label={labels.reasonLabel}
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
        <FormActions danger labels={labels} loading={loading} onClose={onClose} submitLabel={labels.cancelOrderAction} />
      </form>
    </Modal>
  );
}

function RescheduleOrderModal({
  order,
  loading,
  labels,
  onClose,
  onSubmit,
}: {
  order: OrderRecord;
  loading: boolean;
  labels: OrderLabels;
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
        setConflictsError(caught instanceof Error ? caught.message : labels.conflictCheckFailed);
      } finally {
        setConflictsLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [labels.conflictCheckFailed, order.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.date) nextErrors.date = labels.requiredField;
    if (!values.time) nextErrors.time = labels.requiredField;
    if (!values.time_to) nextErrors.time_to = labels.requiredField;
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
    <Modal title={labels.rescheduleModalTitle} onClose={onClose}>
      <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {labels.conflictCheck}
        </p>
        {conflictsLoading ? (
          <div className="mt-3">
            <LoadingState label={labels.conflictsLoading} />
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
            label={labels.dateLabel}
            type="date"
            required
            value={values.date}
            error={errors.date}
            onChange={(date) => setValues((current) => ({ ...current, date }))}
          />
          <FormField
            label={labels.startTime}
            type="time"
            required
            value={values.time}
            error={errors.time}
            onChange={(time) => setValues((current) => ({ ...current, time }))}
          />
          <FormField
            label={labels.endTime}
            type="time"
            required
            value={values.time_to}
            error={errors.time_to}
            onChange={(time_to) => setValues((current) => ({ ...current, time_to }))}
          />
          <FormField
            label={labels.reasonLabel}
            value={values.reason}
            onChange={(reason) => setValues((current) => ({ ...current, reason }))}
          />
        </div>
        <FormActions labels={labels} loading={loading} onClose={onClose} submitLabel={labels.rescheduleAction} />
      </form>
    </Modal>
  );
}

function OrderActionsModal({
  order,
  labels,
  onClose,
  onEdit,
  onConfirm,
  onComplete,
  onReschedule,
  onCancel,
}: {
  order: OrderRecord;
  labels: OrderLabels;
  onClose: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={labels.actionsModalTitle(order.id ?? "—")} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-3">
          <InfoCard label={labels.statusColumn} value={<OrderStatusBadge status={localizeOrderStatus(getOrderUiStatus(order), labels)} />} />
          <InfoCard label={labels.dateLabel} value={formatBookingDate(order.date)} />
          <InfoCard
            label={labels.timeLabel}
            value={formatBookingTimeRange(order.time ?? order.start_time, order.time_to ?? order.end_time).primary}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionButton label={labels.editAction} description={labels.editActionDescription} onClick={onEdit}>
            <Pencil className="size-5" />
          </ActionButton>
          <ActionButton
            tone="confirm"
            label={labels.confirmAction}
            description={labels.confirmActionDescription}
            onClick={onConfirm}
          >
            <ShieldCheck className="size-5" />
          </ActionButton>
          <ActionButton
            tone="complete"
            label={labels.completeAction}
            description={labels.completeActionDescription}
            onClick={onComplete}
          >
            <Flag className="size-5" />
          </ActionButton>
          <ActionButton label={labels.rescheduleAction} description={labels.rescheduleActionDescription} onClick={onReschedule}>
            <CalendarClock className="size-5" />
          </ActionButton>
          <ActionButton danger label={labels.cancelOrderAction} description={labels.cancelActionDescription} onClick={onCancel}>
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
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition ${actionToneClass(resolvedTone)}`}
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

function orderStatusTabFromValue(value: unknown): OrderStatusTabKey {
  const normalized = normalizeOrderStatusFilter(value);
  return orderStatusTabValues.find((tab) => tab.value === normalized)?.key ?? "all";
}

function normalizeOrderStatusFilter(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "10" || normalized === "20" || normalized === "payment_pending") return "pending";
  if (normalized === "30") return "confirmed";
  if (normalized === "50") return "completed";
  if (normalized === "40") return "cancelled";
  return orderStatusTabValues.some((tab) => tab.value === normalized) ? normalized : "";
}

function orderStatusCountClass(status: OrderStatusTabKey) {
  if (status === "pending") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  }
  if (status === "confirmed" || status === "completed") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  if (status === "cancelled") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";
  }
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
}

function getResultCount(result: ListResult<OrderRecord>) {
  return Number(result.meta?.totalCount ?? result.meta?.total ?? result.items.length) || 0;
}

function sameOrderFilters(left: OrderFilters, right: OrderFilters) {
  return (
    String(left.status ?? "") === String(right.status ?? "") &&
    String(left.payment_status ?? "") === String(right.payment_status ?? "") &&
    String(left.artist_id ?? "") === String(right.artist_id ?? "") &&
    String(left.date_from ?? "") === String(right.date_from ?? "") &&
    String(left.date_to ?? "") === String(right.date_to ?? "") &&
    Number(left.page ?? 1) === Number(right.page ?? 1) &&
    Number(left.limit ?? limit) === Number(right.limit ?? limit)
  );
}

function filterOrderRows(
  rows: OrderRecord[],
  search: string,
  maps: {
    clientMap: Map<number, User>;
    artistMap: Map<number, ArtistProfile>;
    serviceMap: Map<number, Service>;
    regionMap: Map<number, Region>;
    districtMap: Map<number, District>;
    labels: OrderLabels;
  },
) {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const client = getClientDisplay(row, maps.clientMap, maps.labels);
    const artist = getArtistDisplay(row, maps.artistMap, maps.labels);
    const service = getServiceDisplay(row.service, row.service_id, maps.serviceMap, maps.labels);
    const subService = getServiceDisplay(row.subService ?? row.sub_service, row.sub_service_id, maps.serviceMap, maps.labels);
    const region = getLocationName(row.region, row.region_id, maps.regionMap, maps.labels.locale);
    const district = getLocationName(row.district, row.district_id, maps.districtMap, maps.labels.locale);

    const haystack = [
      row.id,
      formatOrderId(row.id),
      row.date,
      row.time,
      row.time_to,
      row.start_time,
      row.end_time,
      row.address,
      row.comment,
      client.primary,
      client.secondary,
      artist.primary,
      artist.secondary,
      service.primary,
      subService.primary,
      region.name,
      district.name,
      localizeOrderStatus(getOrderUiStatus(row), maps.labels).label,
      getPaymentStatusDisplay(row, maps.labels).label,
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");

    return haystack.includes(query);
  });
}

function getDateRangeFilters(range: OrderDateRange): Pick<OrderFilters, "date_from" | "date_to"> {
  if (range === "all") return { date_from: "", date_to: "" };

  const to = new Date();
  to.setHours(0, 0, 0, 0);

  const from = new Date(to);
  if (range === "week") from.setDate(from.getDate() - 6);
  if (range === "month") from.setDate(from.getDate() - 29);

  return {
    date_from: formatApiDate(from),
    date_to: formatApiDate(to),
  };
}

function buildConfirmOrderPayload(order: OrderRecord): ConfirmOrderPayload {
  return compactPayload({
    date: stringValue(order.date),
    time: stringValue(order.time) ?? stringValue(order.start_time),
    time_to: stringValue(order.time_to) ?? stringValue(order.end_time),
    artist_id: numberKey(order.artist_id),
    service_id: numberKey(order.service_id),
    sub_service_id: numberKey(order.sub_service_id),
    region_id: numberKey(order.region_id),
    district_id: numberKey(order.district_id),
    lat: coordinateNumber(order.lat),
    lon: coordinateNumber(order.lon) ?? coordinateNumber(order.lng) ?? coordinateNumber(order.long),
    address: stringValue(order.address),
    comment: stringValue(order.comment) ?? stringValue(order.notes),
    total_price: order.total_price === null || order.total_price === undefined || order.total_price === "" ? undefined : order.total_price,
  });
}

function compactPayload<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== ""),
  ) as Partial<T>;
}

function inferDateRange(filters: OrderFilters): OrderDateRange {
  const from = String(filters.date_from ?? "");
  const to = String(filters.date_to ?? "");
  if (!from && !to) return "all";

  const ranges: OrderDateRange[] = ["today", "week", "month"];
  return ranges.find((rangeKey) => {
    const range = getDateRangeFilters(rangeKey);
    return range.date_from === from && range.date_to === to;
  }) ?? "all";
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getServiceMeta(subService: EntityDisplay, artist: EntityDisplay, subServiceId: unknown, labels: OrderLabels) {
  const values = [
    subService.primary || (subServiceId ? subService.fallback : undefined),
    artist.primary ? `${labels.artistLabel}: ${artist.primary}` : artist.fallback,
  ].filter(Boolean);

  return values.join(" · ");
}

function formatOrderId(value: unknown) {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(id)) return "----";
  return String(id).padStart(4, "0");
}

function getPaymentStatusDisplay(order: OrderRecord, labels: OrderLabels) {
  const status = numberKey(order.payment_status);
  const label = stringValue(order.payment_status_label);

  if (status === 20) return { label: labels.paymentPaid, tone: "paid" as const };
  if (status === 30) return { label: labels.paymentRefunded, tone: "refunded" as const };
  if (status === 10) return { label: labels.paymentPending, tone: "pending" as const };
  return { label: label ?? labels.paymentPending, tone: "pending" as const };
}

function getYandexMapUrl(order: OrderRecord) {
  const lat = coordinateNumber(order.lat);
  const lon = coordinateNumber(order.lon) ?? coordinateNumber(order.lng) ?? coordinateNumber(order.long);
  if (lat === undefined || lon === undefined) return undefined;

  const point = `${lon},${lat}`;
  const params = new URLSearchParams({
    ll: point,
    pt: `${point},pm2rdm`,
    z: "16",
  });

  return `https://yandex.uz/maps/?${params.toString()}`;
}

function formatNullableUnixDate(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return formatUnixDateTime(value);
}

function entityText(entity: EntityDisplay) {
  return [entity.primary || entity.fallback, entity.secondary].filter(Boolean).join(" · ");
}

function formatLocationText(region: LocationDisplay, district: LocationDisplay) {
  return [region.name ?? region.fallback, district.name ?? district.fallback].filter(Boolean).join(" · ") || "—";
}

function getStringFromRecord(record: UnknownRecord | undefined, key: string) {
  return record ? stringValue(getValue(record, key)) : undefined;
}

function getFirstStringFromRecord(record: UnknownRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = getStringFromRecord(record, key);
    if (value) return value;
  }
  return undefined;
}

function getOrderClientRecord(order: OrderRecord) {
  return (
    asRecord(order.client) ??
    asRecord(order.user) ??
    asRecord(order.client_user) ??
    asRecord(order.customer)
  );
}

function getOrderArtistRecord(order: OrderRecord) {
  return mergeRecords(
    asRecord(order.artist),
    asRecord(order.artist_profile),
    asRecord(order.artistProfile),
    asRecord(order.artist_profile_contact),
  );
}

function mergeRecords(...records: Array<UnknownRecord | undefined>) {
  const existing = records.filter(Boolean) as UnknownRecord[];
  return existing.length ? Object.assign({}, ...existing) : undefined;
}

function coordinateNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(number) ? number : undefined;
}

function parseCoordinateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
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

function getClientDisplay(row: OrderRecord, clientMap: Map<number, User>, labels: OrderLabels): EntityDisplay {
  const client = asRecord(row.client) ?? getFromMap(clientMap, row.client_id);
  return getPersonDisplay(client, row.client_id, labels.clientColumn);
}

function getArtistDisplay(row: OrderRecord, artistMap: Map<number, ArtistProfile>, labels: OrderLabels): EntityDisplay {
  const expandedArtist = asRecord(row.artist);
  const artist = expandedArtist ?? getFromMap(artistMap, row.artist_id);

  if (artist && !expandedArtist) {
    const primary = getArtistName(artist);
    const secondary = getSecondaryText(primary, artist.phone, artist.email, artist.extra_phone);
    return {
      primary,
      secondary,
      fallback: fallbackWithId(labels.artistLabel, row.artist_id),
    };
  }

  return getPersonDisplay(artist, row.artist_id, labels.artistLabel);
}

function getServiceDisplay(
  expanded: unknown,
  id: unknown,
  serviceMap: Map<number, Service>,
  labels: OrderLabels,
): EntityDisplay {
  const service = asRecord(expanded) ?? getFromMap(serviceMap, id);
  const primary = service ? getName(service, labels.locale) : undefined;
  return {
    primary,
    secondary: service ? stringValue(service.slug) : undefined,
    fallback: fallbackWithId(labels.serviceColumn, id),
  };
}

function getLocationName<T extends Region | District>(
  expanded: unknown,
  id: unknown,
  map: Map<number, T>,
  locale: Locale = "uz",
): LocationDisplay {
  const item = asRecord(expanded) ?? getFromMap(map, id);
  return {
    name: item ? getName(item, locale) : undefined,
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

function getName(entity: DisplayEntity, locale: Locale = "uz") {
  if (locale === "ru") {
    return (
      stringValue(entity.name_ru) ??
      stringValue(entity.name_uz) ??
      stringValue(entity.name_en) ??
      stringValue(entity.name) ??
      stringValue(entity.title) ??
      stringValue(entity.full_name)
    );
  }

  return (
    stringValue(entity.name_uz) ??
    stringValue(entity.name_ru) ??
    stringValue(entity.name_en) ??
    stringValue(entity.name) ??
    stringValue(entity.title) ??
    stringValue(entity.full_name)
  );
}

function getPrimaryOrderAction(row: OrderRecord, labels: OrderLabels): PrimaryOrderAction | undefined {
  const status = getOrderUiStatus(row);
  if (status.key === "pending") return { label: labels.confirmAction, action: "confirm" };
  if (status.key === "confirmed") return { label: labels.completeAction, action: "complete" };
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
    status: normalizeOrderStatusFilter(searchParams?.get("status")),
    payment_status: searchParams?.get("payment_status") ?? "",
    artist_id: searchParams?.get("artist_id") ?? "",
    date_from: searchParams?.get("date_from") ?? "",
    date_to: searchParams?.get("date_to") ?? "",
    page: Number(searchParams?.get("page") ?? 1),
    limit: Number(searchParams?.get("limit") ?? limit),
  };
}

function getOrderLabels(locale: Locale) {
  if (locale === "ru") {
    return {
      locale,
      actionFailed: "Не удалось выполнить действие",
      actionsColumn: "Действия",
      actionsModalTitle: (id: unknown) => `Заказ #${id} действия`,
      addressLabel: "Адрес",
      artistEmail: "Email артиста",
      artistAdministratorName: "Администратор артиста",
      artistAdministratorPhone: "Телефон администратора артиста",
      artistLabel: "Артист",
      artistPhone: "Телефон артиста",
      cancelAction: "Отмена",
      cancelActionDescription: "Отменить заказ с указанием причины.",
      cancelFailed: "Не удалось отменить заказ",
      cancelModalTitle: "Отмена заказа",
      cancelOrderAction: "Отменить",
      cancelledToast: "Заказ отменен",
      clientColumn: "Клиент",
      clientEmail: "Email клиента",
      clientPhone: "Телефон клиента",
      close: "Закрыть",
      completeAction: "Завершить",
      completeActionDescription: "Подтвержденный → Завершенный. Используется после выполнения заказа.",
      completeDialogMessage: "Подтвердить перевод заказа в статус выполненного?",
      completeDialogTitle: "Завершение заказа",
      completedToast: "Заказ завершен",
      contactAction: "Контакты",
      confirmAction: "Подтвердить",
      confirmActionDescription: "Ожидает → Подтвержден. Артист получает разрешение начать работу.",
      confirmDialogMessage: "Подтвердить заказ?",
      confirmDialogTitle: "Подтверждение заказа",
      confirmedToast: "Заказ подтвержден",
      conflictCheck: "Проверка конфликтов",
      conflictCheckFailed: "Не удалось выполнить проверку конфликтов",
      conflictsLoading: "Проверка конфликтов...",
      copyValue: (label: string) => `Скопировать значение: ${label}`,
      createdAtLabel: "Создан",
      currency: "сум",
      dateAll: "Дата: Все",
      dateLabel: "Дата",
      dateTimeColumn: "Дата / время",
      description: "Отслеживание, подтверждение, завершение и перенос заказов.",
      detailLoadFailed: "Не удалось загрузить детали заказа",
      editAction: "Редактировать",
      editActionDescription: "Обновить адрес или заметки.",
      editModalTitle: "Редактирование заказа",
      endTime: "Окончание",
      eyebrow: "Заказы",
      idNotFound: "ID заказа не найден",
      infoTab: "Информация",
      latitudeLabel: "Широта",
      loadFailed: "Не удалось загрузить заказы",
      longitudeLabel: "Долгота",
      mainInfoTitle: "Основная информация",
      mapLabel: "Карта",
      month: "30 дней",
      noteLabel: "Комментарий",
      openYandexMap: "Открыть в Яндекс Картах",
      orderColumn: "Заказ",
      orderStatusLabel: "Статус заказа",
      orderTitle: "Заказ",
      paymentAll: "Оплата: Все",
      paymentDeadlineLabel: "Срок оплаты",
      paymentLabel: "Оплата",
      paymentPaid: "Оплачено",
      paymentPending: "Ожидает оплаты",
      paymentRefunded: "Возвращено",
      paymentStatusLabel: "Статус оплаты",
      priceLabel: "Цена",
      priceNotSet: "Цена не указана",
      processing: "Выполняется...",
      reasonLabel: "Причина",
      regionLabel: "Регион",
      requiredField: "Обязательное поле",
      rescheduleAction: "Изменить время",
      rescheduleActionDescription: "Изменить дату или время заказа.",
      rescheduleFailed: "Не удалось перенести заказ",
      rescheduleModalTitle: "Перенос заказа",
      rescheduledToast: "Заказ перенесен",
      reset: "Сбросить",
      saveAction: "Сохранить",
      searchPlaceholder: "Поиск...",
      serviceColumn: "Услуга",
      startTime: "Начало",
      statusColumn: "Статус",
      statusTabs: {
        all: "Все",
        pending: "Ожидает",
        confirmed: "Подтвержден",
        completed: "Завершен",
        cancelled: "Отменен",
        unknown: "Неизвестно",
      },
      subServiceLabel: "Подуслуга",
      technicalTab: "Техническое",
      timeLabel: "Время",
      title: "Заказы",
      today: "Сегодня",
      updatedAtLabel: "Обновлен",
      updatedToast: "Заказ обновлен",
      updateFailed: "Не удалось обновить",
      viewAction: "Просмотр",
      week: "7 дней",
    };
  }

  return {
    locale,
    actionFailed: "Amal bajarilmadi",
    actionsColumn: "Amallar",
    actionsModalTitle: (id: unknown) => `Buyurtma #${id} amallari`,
    addressLabel: "Manzil",
    artistEmail: "Sanatkor email",
    artistAdministratorName: "Sanatkor administratori",
    artistAdministratorPhone: "Sanatkor administratori telefoni",
    artistLabel: "Sanatkor",
    artistPhone: "Sanatkor telefoni",
    cancelAction: "Bekor qilish",
    cancelActionDescription: "Buyurtmani sabab bilan bekor qilish.",
    cancelFailed: "Bekor qilish bajarilmadi",
    cancelModalTitle: "Buyurtmani bekor qilish",
    cancelOrderAction: "Bekor qilish",
    cancelledToast: "Buyurtma bekor qilindi",
    clientColumn: "Mijoz",
    clientEmail: "Mijoz email",
    clientPhone: "Mijoz telefoni",
    close: "Yopish",
    completeAction: "Yakunlash",
    completeActionDescription: "Tasdiqlangan → Yakunlangan. Ish bajarilganidan keyin bosiladi.",
    completeDialogMessage: "Buyurtmani bajarildi deb belgilashni tasdiqlaysizmi?",
    completeDialogTitle: "Buyurtmani yakunlash",
    completedToast: "Buyurtma bajarildi",
    contactAction: "Aloqa",
    confirmAction: "Tasdiqlash",
    confirmActionDescription: "Kutilmoqda → Tasdiqlangan. Sanatkor ishni boshlashi uchun ruxsat beriladi.",
    confirmDialogMessage: "Buyurtmani tasdiqlashni tasdiqlaysizmi?",
    confirmDialogTitle: "Buyurtmani tasdiqlash",
    confirmedToast: "Buyurtma tasdiqlandi",
    conflictCheck: "Konflikt tekshiruvi",
    conflictCheckFailed: "Konflikt tekshiruvi bajarilmadi",
    conflictsLoading: "Konfliktlar tekshirilmoqda...",
    copyValue: (label: string) => `${label} qiymatini nusxalash`,
    createdAtLabel: "Yaratilgan",
    currency: "so'm",
    dateAll: "Sana: Barchasi",
    dateLabel: "Sana",
    dateTimeColumn: "Sana / vaqt",
    description: "Buyurtmalar holatini kuzatish, tasdiqlash, yakunlash va qayta rejalash.",
    detailLoadFailed: "Buyurtma tafsilotlari yuklanmadi",
    editAction: "Tahrirlash",
    editActionDescription: "Manzil yoki izohlarni yangilash.",
    editModalTitle: "Buyurtmani tahrirlash",
    endTime: "Tugash",
    eyebrow: "Buyurtmalar",
    idNotFound: "Order ID topilmadi",
    infoTab: "Ma'lumot",
    latitudeLabel: "Latitude",
    loadFailed: "Buyurtmalar yuklanmadi",
    longitudeLabel: "Longitude",
    mainInfoTitle: "Asosiy ma'lumotlar",
    mapLabel: "Xarita",
    month: "30 kun",
    noteLabel: "Izoh",
    openYandexMap: "Yandex xaritada ochish",
    orderColumn: "Buyurtma",
    orderStatusLabel: "Buyurtma holati",
    orderTitle: "Buyurtma",
    paymentAll: "To'lov: Barchasi",
    paymentDeadlineLabel: "To'lov muddati",
    paymentLabel: "To'lov",
    paymentPaid: "To'langan",
    paymentPending: "To'lov kutilmoqda",
    paymentRefunded: "Qaytarilgan",
    paymentStatusLabel: "To'lov holati",
    priceLabel: "Narx",
    priceNotSet: "Narx belgilanmagan",
    processing: "Bajarilmoqda...",
    reasonLabel: "Sabab",
    regionLabel: "Hudud",
    requiredField: "Majburiy maydon",
    rescheduleAction: "Vaqtni o'zgartirish",
    rescheduleActionDescription: "Buyurtma sanasi yoki vaqtini almashtirish.",
    rescheduleFailed: "Qayta belgilash bajarilmadi",
    rescheduleModalTitle: "Buyurtmani qayta belgilash",
    rescheduledToast: "Buyurtma qayta belgilandi",
    reset: "Tozalash",
    saveAction: "Saqlash",
    searchPlaceholder: "Qidirish...",
    serviceColumn: "Xizmat",
    startTime: "Boshlanish",
    statusColumn: "Holat",
    statusTabs: {
      all: "Barchasi",
      pending: "Kutilmoqda",
      confirmed: "Tasdiqlangan",
      completed: "Yakunlangan",
      cancelled: "Bekor qilingan",
      unknown: "Noma'lum",
    },
    subServiceLabel: "Sub xizmat",
    technicalTab: "Texnik",
    timeLabel: "Vaqt",
    title: "Buyurtmalar",
    today: "Bugun",
    updatedAtLabel: "Yangilangan",
    updatedToast: "Buyurtma yangilandi",
    updateFailed: "Yangilash bajarilmadi",
    viewAction: "Ko'rish",
    week: "7 kun",
  };
}

function FormActions({
  labels,
  loading,
  onClose,
  danger,
  form,
  submitLabel,
}: {
  labels: OrderLabels;
  loading: boolean;
  onClose: () => void;
  danger?: boolean;
  form?: string;
  submitLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onClose}
        className={adminActionButtonClass}
      >
        <X className="size-4" />
        {labels.cancelAction}
      </button>
      <button
        type="submit"
        form={form}
        disabled={loading}
        className={danger ? adminDangerActionButtonClass : adminPrimaryActionButtonClass}
      >
        {danger ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
        {loading ? labels.processing : (submitLabel ?? labels.saveAction)}
      </button>
    </div>
  );
}
