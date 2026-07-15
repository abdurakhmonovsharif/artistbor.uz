"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Drawer, Input, Modal, Tabs } from "antd";
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
import { AdminDrawer, adminDrawerClassNames, adminDrawerStyles, adminDrawerSubtitleStyles } from "@/components/admin/admin-drawer";
import {
  DateFilterSelect,
  getDateFilterPatch,
  inferDateFilterMode,
  type DateFilterValue,
} from "@/components/admin/date-filter-select";
import {
  adminActionButtonClass,
  adminDangerActionButtonClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
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
  type RejectOrderPaymentPayload,
  servicesApi,
  usersApi,
  type VerifyOrderPaymentPayload,
  type OrderFilters,
  type UpdateOrderPayload,
} from "@/lib/api/admin-content";
import { getArtistName } from "@/lib/artist-display";
import { formatBookingDate, formatBookingTimeRange, formatUnixDateTime, isExpired } from "@/lib/order-format";
import { getOrderUiStatus } from "@/lib/order-status";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { MONEY_CURRENCY_LABEL } from "@/lib/money-format";
import { formatPhone } from "@/lib/phone-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Locale } from "@/lib/i18n/translations";
import { cn, getValue, isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type {
  ArtistProfile,
  District,
  ListResult,
  OrderRecord,
  Region,
  Service,
  OrderPaymentRecord,
  UnknownRecord,
  User,
} from "@/types/api";

type DialogState =
  | { type: "details"; order: OrderRecord }
  | { type: "contact"; order: OrderRecord }
  | { type: "edit"; order: OrderRecord }
  | { type: "confirm"; order: OrderRecord }
  | { type: "complete"; order: OrderRecord }
  | { type: "cancel"; order: OrderRecord }
  | { type: "verify-payment"; order: OrderRecord; payment: OrderPaymentRecord }
  | { type: "reject-payment"; order: OrderRecord; payment: OrderPaymentRecord }
  | null;

const limit = 20;
const clientRole = 10;

type OrderStatusTabKey = "all" | "pending" | "payment_pending" | "confirmed" | "completed" | "cancelled";

type OrderStatusTab = {
  key: OrderStatusTabKey;
  value: string;
};

const orderStatusTabValues: OrderStatusTab[] = [
  { key: "all", value: "" },
  { key: "pending", value: "10" },
  { key: "payment_pending", value: "20" },
  { key: "confirmed", value: "30" },
  { key: "completed", value: "50" },
  { key: "cancelled", value: "40" },
];

const initialStatusCounts: Record<OrderStatusTabKey, number> = {
  all: 0,
  pending: 0,
  payment_pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
};

const initialFilters: OrderFilters = {
  status: "",
  artist_id: "",
  date_from: "",
  date_to: "",
  sort: "-created_at",
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
  const [filters, setFilters] = useState<OrderFilters>(initialOrderFilters);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(initialOrderFilters);
  const [searchDraft, setSearchDraft] = useState("");
  const search = useDebouncedValue(searchDraft.trim(), 300);
  const [dateRange, setDateRange] = useState(() => inferDateFilterMode(initialOrderFilters));
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
  const [dialogError, setDialogError] = useState("");
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
          artist_id: draftFilters.artist_id ?? "",
          date_from: draftFilters.date_from ?? "",
          date_to: draftFilters.date_to ?? "",
          sort: draftFilters.sort ?? "-created_at",
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
    draftFilters.sort,
    draftFilters.status,
  ]);

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
      const order = await ordersApi.detail(row.id, {
        expand: "client,artist,service,subService,region,district,invoice,orderPayments,history",
      });
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

  const changeDateRange = (value: DateFilterValue) => {
    setDateRange(value.mode);
    setDraftFilters((current) => ({
      ...current,
      ...getDateFilterPatch(value),
    }));
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setSearchDraft("");
    setDateRange(inferDateFilterMode(initialFilters));
    setFilters(initialFilters);
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, limit: nextLimit }));
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const runSimpleAction = async (type: "confirm" | "complete", deadlineMinutes?: number) => {
    if (!dialog || dialog.type !== type || !dialog.order.id) return;
    setDialogError("");
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
        if (isOrderScheduleExpired(confirmOrder)) {
          setDialogError(labels.orderExpiredConfirmBlocked);
          return;
        }
        await ordersApi.confirm(dialog.order.id, {
          ...buildConfirmOrderPayload(confirmOrder),
          deadline_minutes: deadlineMinutes,
        });
        toast.success(labels.confirmedToast);
      } else {
        await ordersApi.complete(dialog.order.id);
        toast.success(labels.completedToast);
      }
      setDialog(null);
      await Promise.all([fetchOrders(), fetchStatusCounts()]);
    } catch (caught) {
      const message = resolveOrderActionErrorMessage(caught, labels, type);
      if (type === "confirm") {
        setDialogError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentAction = (type: "verify-payment" | "reject-payment", order: OrderRecord) => {
    const payment = findPendingOrderPayment(order);
    if (!payment?.id) {
      toast.error(labels.pendingPaymentNotFound);
      return;
    }
    setDialog({ type, order, payment });
  };

  const runPaymentAction = async (type: "verify-payment" | "reject-payment", reason?: string) => {
    if (!dialog || dialog.type !== type || !dialog.order.id || !dialog.payment.id) return;
    setSubmitting(true);
    try {
      if (type === "verify-payment") {
        const payload: VerifyOrderPaymentPayload = { payment_id: dialog.payment.id };
        await ordersApi.verifyPayment(dialog.order.id, payload);
        toast.success(labels.paymentVerifiedToast);
      } else {
        const payload: RejectOrderPaymentPayload = {
          payment_id: dialog.payment.id,
          reason: stringValue(reason),
        };
        await ordersApi.rejectPayment(dialog.order.id, payload);
        toast.success(labels.paymentRejectedToast);
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

      <OrderStatusTabs tabs={orderStatusTabs} active={activeStatus} counts={statusCounts} onChange={changeStatus} />

      <div className="artistbor-table-filter-shell overflow-x-auto">
        <div className="artistbor-table-filter-panel grid gap-3 md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center">
          <Input
            allowClear
            prefix={<Search className="size-4 text-slate-400" />}
            placeholder={labels.searchPlaceholder}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className={cn(
              "artistbor-table-filter-control artistbor-filter-search h-10",
              searchDraft && "artistbor-filter-search-active",
            )}
          />
          <DateFilterSelect
            value={{
              mode: dateRange,
              date_from: draftFilters.date_from ?? "",
              date_to: draftFilters.date_to ?? "",
            }}
            labels={{
              label: labels.dateLabel,
              newest: labels.newest,
              oldest: labels.oldest,
              custom: labels.custom,
              from: labels.dateFrom,
              to: labels.dateTo,
            }}
            selectClassName="!w-[180px]"
            inputClassName="!rounded-xl"
            onChange={changeDateRange}
          />
          <button
            type="button"
            onClick={resetFilters}
            className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 px-4 md:col-start-4"
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
        onCancel={() => {
          if (dialog?.type === "details") setDialog({ type: "cancel", order: dialog.order });
        }}
        onVerifyPayment={() => {
          if (dialog?.type === "details") openPaymentAction("verify-payment", dialog.order);
        }}
        onRejectPayment={() => {
          if (dialog?.type === "details") openPaymentAction("reject-payment", dialog.order);
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
          services={services}
          regions={regions}
          districts={districts}
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
        <ConfirmOrderModal
          actionError={dialogError}
          loading={submitting}
          labels={labels}
          onClose={() => {
            setDialogError("");
            setDialog(null);
          }}
          onSubmit={(deadlineMinutes) => runSimpleAction("confirm", deadlineMinutes)}
          onChange={() => setDialogError("")}
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

      {dialog?.type === "verify-payment" ? (
        <ConfirmDialog
          loading={submitting}
          title={labels.verifyPaymentDialogTitle}
          message={labels.verifyPaymentDialogMessage}
          confirmLabel={labels.verifyPaymentAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runPaymentAction("verify-payment")}
        />
      ) : null}

      {dialog?.type === "reject-payment" ? (
        <RejectPaymentModal
          loading={submitting}
          labels={labels}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => runPaymentAction("reject-payment", reason)}
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
    <div className="border-b border-[#e6ebf2] dark:border-white/10">
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
                  ? "text-[#f97316] dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  selected
                    ? "bg-[#fff7ed] text-[#f97316] ring-1 ring-[#fed7aa] dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20"
                    : orderStatusCountClass(tab.key),
                )}
              >
                {counts[tab.key] ?? 0}
              </span>
              {selected ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#f97316] dark:bg-amber-400" />
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
}: {
  rows: OrderRecord[];
  clientMap: Map<number, User>;
  artistMap: Map<number, ArtistProfile>;
  serviceMap: Map<number, Service>;
  labels: OrderLabels;
  onOpenDetail: (order: OrderRecord) => void;
  onOpenContact: (order: OrderRecord) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#e6ebf2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0">
          <thead>
            <tr className="h-11 bg-[#f8fafc] text-left dark:bg-white/[0.03]">
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
                    className="h-16 transition hover:bg-[#fffaf3] dark:hover:bg-amber-500/[0.04]"
                  >
                  <TableCell>
                    <OrderIdCell
                      id={row.id}
                      createdAt={firstOrderTimestamp(row, ["created_at", "createdAt"])}
                      labels={labels}
                    />
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
                    <OrderStatusCell order={row} labels={labels} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenContact(row)}
                        className="grid size-8 cursor-pointer place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                        aria-label={labels.contactAction}
                        title={labels.contactAction}
                      >
                        <Phone className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(row)}
                        className="grid size-8 cursor-pointer place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                        aria-label={labels.viewAction}
                        title={labels.viewAction}
                      >
                        <Eye className="size-4" />
                      </button>
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

function PaymentStatusBadge({ order, labels }: { order: OrderRecord; labels: OrderLabels }) {
  const payment = getPaymentStatusDisplay(order, labels);

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]",
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

function OrderPaymentsPanel({
  order,
  labels,
  onVerifyPayment,
  onRejectPayment,
}: {
  order: OrderRecord;
  labels: OrderLabels;
  onVerifyPayment: () => void;
  onRejectPayment: () => void;
}) {
  const payments = getOrderPayments(order);
  const pendingPayment = findPendingOrderPayment(order);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#121a2a]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.paymentsTitle}</h4>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{labels.paymentsDescription}</p>
        </div>
        <PaymentStatusBadge order={order} labels={labels} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <PaymentMetaItem label={labels.advanceAmountLabel}>
          <MoneyText value={order.advance_amount} emptyLabel={labels.priceNotSet} locale={labels.locale} />
        </PaymentMetaItem>
        <PaymentMetaItem label={labels.paymentDeadlineLabel}>
          {formatPaymentDeadline(order)}
        </PaymentMetaItem>
      </div>

      {payments.length ? (
        <div className="mt-3 space-y-2">
          {payments.map((payment, index) => (
            <div
              key={String(payment.id ?? index)}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.035]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    {payment.type ? toDisplay(payment.type) : labels.paymentReceiptLabel}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                    <MoneyText value={payment.paid_amount ?? payment.amount} emptyLabel={labels.priceNotSet} locale={labels.locale} />
                  </p>
                </div>
                <PaymentRecordStatusBadge payment={payment} labels={labels} />
              </div>

              <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <span>{labels.createdAtLabel}: {formatNullableUnixDate(payment.created_at)}</span>
                <span>{labels.verifiedAtLabel}: {formatNullableUnixDate(payment.verified_at)}</span>
              </div>

              {payment.notes ? (
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10">
                  {payment.notes}
                </p>
              ) : null}

              {payment.receipt_file_url ? (
                <a
                  href={payment.receipt_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-blue-500/10"
                >
                  {labels.openReceiptAction}
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500 dark:border-white/15 dark:bg-white/[0.035] dark:text-slate-400">
          {labels.noPaymentReceipts}
        </div>
      )}

      {pendingPayment ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onVerifyPayment}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15"
          >
            <CreditCard className="size-4" />
            {labels.verifyPaymentAction}
          </button>
          <button
            type="button"
            onClick={onRejectPayment}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
          >
            <XCircle className="size-4" />
            {labels.rejectPaymentAction}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PaymentMetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200 dark:bg-white/[0.035] dark:ring-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{children}</div>
    </div>
  );
}

function PaymentRecordStatusBadge({ payment, labels }: { payment: OrderPaymentRecord; labels: OrderLabels }) {
  const normalized = normalizePaymentRecordStatus(payment.status);
  const toneClass = {
    pending: "border-amber-300/40 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    verified: "border-emerald-300/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
    rejected: "border-rose-300/40 bg-rose-400/10 text-rose-700 dark:text-rose-300",
  }[normalized];

  return (
    <span className={cn("inline-flex h-6 max-w-full shrink-0 items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]", toneClass)}>
      {labels.paymentRecordStatuses[normalized]}
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
  onCancel,
  onVerifyPayment,
  onRejectPayment,
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
  onCancel: () => void;
  onVerifyPayment: () => void;
  onRejectPayment: () => void;
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
      classNames={adminDrawerClassNames}
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
          onCancel={onCancel}
          onVerifyPayment={onVerifyPayment}
          onRejectPayment={onRejectPayment}
          labels={labels}
        />
      }
      styles={adminDrawerStyles}
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
                    <OrderInfoCell icon={<WalletCards className="size-4" />} label={labels.priceLabel} value={<MoneyText value={order.total_price} emptyLabel={labels.priceNotSet} locale={labels.locale} />} />
                    <OrderInfoCell icon={<CreditCard className="size-4" />} label={labels.advanceAmountLabel} value={<MoneyText value={order.advance_amount} emptyLabel={labels.priceNotSet} locale={labels.locale} />} />
                    <OrderInfoCell icon={<CalendarClock className="size-4" />} label={labels.paymentDeadlineLabel} value={formatPaymentDeadline(order)} />
                    <OrderInfoCell icon={<MapPin className="size-4" />} label={labels.regionLabel} value={formatLocationText(region, district)} />
                    <OrderInfoCell
                      icon={<MapPin className="size-4" />}
                      label={labels.mapLabel}
                      value={yandexMapUrl ? <YandexMapLink href={yandexMapUrl} label={labels.openYandexMap} /> : undefined}
                    />
                    <OrderInfoCell className="sm:col-span-2" icon={<MapPin className="size-4" />} label={labels.addressLabel} value={order.address} />
                    <OrderInfoCell className="sm:col-span-2" icon={<Pencil className="size-4" />} label={labels.noteLabel} value={order.comment ?? order.notes} />
                  </div>
                  <OrderPaymentsPanel
                    order={order}
                    labels={labels}
                    onVerifyPayment={onVerifyPayment}
                    onRejectPayment={onRejectPayment}
                  />
                </div>
              ),
            },
            {
              key: "technical",
              label: labels.historyTitle,
              children: (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.historyTitle}</h4>
                  <OrderLifecycleHistory order={order} labels={labels} />
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
  onCancel,
  onVerifyPayment,
  onRejectPayment,
  labels,
}: {
  order: OrderRecord;
  onEdit: () => void;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onVerifyPayment: () => void;
  onRejectPayment: () => void;
  labels: OrderLabels;
}) {
  const primaryAction = getPrimaryOrderAction(order, labels);
  const pendingPayment = findPendingOrderPayment(order);

  return (
    <div className="grid grid-cols-2 gap-2">
      <DrawerActionButton icon={<XCircle className="size-4" />} label={labels.cancelOrderAction} tone="danger" onClick={onCancel} />
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
      {pendingPayment ? (
        <>
          <DrawerActionButton
            icon={<CreditCard className="size-4" />}
            label={labels.verifyPaymentAction}
            tone="payment"
            onClick={onVerifyPayment}
          />
          <DrawerActionButton
            icon={<XCircle className="size-4" />}
            label={labels.rejectPaymentAction}
            tone="danger"
            onClick={onRejectPayment}
          />
        </>
      ) : null}
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
  tone?: "default" | "confirm" | "complete" | "danger" | "payment";
  onClick: () => void;
}) {
  const toneClass = {
    default:
      "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:text-slate-200 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-200",
    confirm:
      "border-sky-200 text-sky-700 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10",
    complete:
      "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10",
    payment:
      "border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10",
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
      value: formatPhone(clientPhone) || clientPhone,
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
      value: formatPhone(artistPhone) || artistPhone,
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
      value: formatPhone(artistAdministratorPhone) || artistAdministratorPhone,
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
      classNames={adminDrawerClassNames}
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
      styles={adminDrawerSubtitleStyles}
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

function OrderLifecycleHistory({
  order,
  labels,
}: {
  order: OrderRecord;
  labels: OrderLabels;
}) {
  const events = [
    {
      key: "created",
      icon: <CalendarDays className="size-4" />,
      label: labels.lifecycleCreated,
      value: firstOrderTimestamp(order, ["created_at", "createdAt"]),
    },
    {
      key: "confirmed",
      icon: <CheckCircle2 className="size-4" />,
      label: labels.lifecycleConfirmed,
      value: firstOrderTimestamp(order, ["confirmed_at", "confirmedAt", "approved_at", "approvedAt", "accepted_at", "acceptedAt"]),
    },
    {
      key: "paid",
      icon: <CreditCard className="size-4" />,
      label: labels.lifecyclePaid,
      value: firstOrderTimestamp(order, ["paid_at", "paidAt", "payment_paid_at", "paymentPaidAt", "payment.paid_at", "payment.paidAt"]),
    },
    {
      key: "completed",
      icon: <Flag className="size-4" />,
      label: labels.lifecycleCompleted,
      value: firstOrderTimestamp(order, ["completed_at", "completedAt", "finished_at", "finishedAt", "done_at", "doneAt"]),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#121a2a]">
      {events.map((event, index) => (
        <div
          key={event.key}
          className="flex gap-3 border-b border-slate-100 p-3 last:border-b-0 dark:border-white/10"
        >
          <div className="relative flex flex-col items-center">
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-[#453821] dark:text-amber-400 dark:ring-amber-400/20">
              {event.icon}
            </span>
            {index < events.length - 1 ? (
              <span className="mt-2 h-full min-h-5 w-px bg-slate-200 dark:bg-white/10" />
            ) : null}
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{event.label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
              {formatNullableUnixDate(event.value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[#e6ebf2] px-3.5 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-[#edf2f7] px-3.5 py-[9px] align-middle text-[13px] font-medium leading-[18px] text-[#334155] dark:border-white/10 dark:text-slate-100", className)}>{children}</td>;
}

function OrderIdCell({ id, createdAt, labels }: { id: unknown; createdAt: unknown; labels: OrderLabels }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">#{formatOrderId(id)}</p>
      <p className="mt-1 whitespace-nowrap text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
        {labels.createdAtLabel}: {formatNullableUnixDate(createdAt)}
      </p>
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
  onPrimary: (action: PrimaryOrderAction["action"]) => void;
  labels: OrderLabels;
}) {
  const primaryAction = getPrimaryOrderAction(row, labels);

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-3">
        <OrderIdCell
          id={row.id}
          createdAt={firstOrderTimestamp(row, ["created_at", "createdAt"])}
          labels={labels}
        />
        <OrderStatusCell order={row} labels={labels} align="end" />
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
      </div>
    </article>
  );
}

function OrderStatusCell({
  order,
  labels,
  align = "start",
}: {
  order: OrderRecord;
  labels: OrderLabels;
  align?: "start" | "end";
}) {
  const baseStatus = getOrderUiStatus(order);
  const localizedStatus = localizeOrderStatus(baseStatus, labels);
  const hasPaymentDeadline = hasOrderPaymentDeadline(order);
  const expired = baseStatus.key === "payment_pending" && hasPaymentDeadline && isExpired(order.payment_deadline ?? order.payment_expires_at);
  const status = expired ? { ...localizedStatus, label: labels.paymentExpired, tone: "red" as const } : localizedStatus;

  return (
    <div className={cn("inline-flex min-w-0 flex-col gap-1.5", align === "end" ? "items-end text-right" : "items-start text-left")}>
      <OrderStatusBadge status={status} />
      {baseStatus.key === "payment_pending" && hasPaymentDeadline ? (
        <p
          className={cn(
            "whitespace-nowrap text-xs font-medium leading-4",
            expired ? "text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-slate-400",
          )}
        >
          {labels.paymentDeadlineLabel}: {formatPaymentDeadline(order)}
        </p>
      ) : null}
    </div>
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
          className="h-24 animate-pulse rounded-[18px] border border-slate-100 bg-white shadow-xl shadow-slate-950/[0.04] dark:border-slate-700/70 dark:bg-[#111827]"
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
  services,
  regions,
  districts,
  onClose,
  onSubmit,
}: {
  order: OrderRecord;
  loading: boolean;
  labels: OrderLabels;
  services: Service[];
  regions: Region[];
  districts: District[];
  onClose: () => void;
  onSubmit: (payload: UpdateOrderPayload) => Promise<void>;
}) {
  const initialServiceId = numberKey(order.service_id);
  const initialRegionId = numberKey(order.region_id);
  const [values, setValues] = useState({
    date: stringValue(order.date) ?? "",
    time: stringValue(order.time) ?? stringValue(order.start_time) ?? "",
    time_to: stringValue(order.time_to) ?? stringValue(order.end_time) ?? "",
    service_id: toInputValue(initialServiceId),
    sub_service_id: toInputValue(numberKey(order.sub_service_id)),
    region_id: toInputValue(initialRegionId),
    district_id: toInputValue(numberKey(order.district_id)),
    group_size: toInputValue(numberKey(order.group_size)),
    total_price: formatNumberInput(order.total_price),
    comment: stringValue(order.comment) ?? stringValue(order.notes) ?? "",
    lat: coordinateNumber(order.lat)?.toString() ?? "",
    lon: (coordinateNumber(order.lon) ?? coordinateNumber(order.lng) ?? coordinateNumber(order.long))?.toString() ?? "",
  });
  const selectedServiceId = numberKey(values.service_id);
  const selectedRegionId = numberKey(values.region_id);
  const serviceOptions = createOrderSelectOptions(
    services.filter((service) => service.parent_id === null || service.parent_id === undefined),
    labels.locale,
  );
  const subServiceOptions = createOrderSelectOptions(
    services.filter((service) => {
      const parentId = numberKey(service.parent_id);
      if (selectedServiceId !== undefined) return parentId === selectedServiceId;
      return parentId !== undefined;
    }),
    labels.locale,
  );
  const regionOptions = createOrderSelectOptions(regions, labels.locale);
  const districtOptions = createOrderSelectOptions(
    districts.filter((district) => {
      if (selectedRegionId === undefined) return true;
      return numberKey(district.region_id) === selectedRegionId;
    }),
    labels.locale,
  );
  const formId = `order-edit-form-${order.id ?? "unknown"}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = compactOrderUpdatePayload({
      date: values.date,
      time: values.time,
      time_to: values.time_to,
      service_id: parseNumberInput(values.service_id),
      sub_service_id: parseNullableNumberInput(values.sub_service_id, order.sub_service_id),
      region_id: parseNumberInput(values.region_id),
      district_id: parseNumberInput(values.district_id),
      group_size: parseNumberInput(values.group_size),
      comment: values.comment,
      total_price: parseNumberInput(values.total_price),
      lat: parseCoordinateInput(values.lat),
      lon: parseCoordinateInput(values.lon),
    });
    await onSubmit(payload);
  };

  return (
    <AdminDrawer
      title={labels.editModalTitle}
      onClose={onClose}
      footer={<FormActions labels={labels} loading={loading} onClose={onClose} form={formId} />}
      className="artistbor-order-drawer"
    >
      <form id={formId} onSubmit={submit} className="space-y-5 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            compact
            label={labels.dateLabel}
            type="date"
            value={values.date}
            onChange={(date) => setValues((current) => ({ ...current, date }))}
          />
          <FormField
            compact
            label={labels.startTime}
            type="time"
            value={values.time}
            onChange={(time) => setValues((current) => ({ ...current, time }))}
          />
          <FormField
            compact
            label={labels.endTime}
            type="time"
            value={values.time_to}
            onChange={(time_to) => setValues((current) => ({ ...current, time_to }))}
          />
          <FormField
            compact
            label={labels.serviceColumn}
            type="select"
            value={values.service_id}
            options={serviceOptions}
            onChange={(service_id) => setValues((current) => ({ ...current, service_id, sub_service_id: "" }))}
          />
          <FormField
            compact
            label={labels.serviceColumn}
            type="select"
            value={values.sub_service_id}
            options={subServiceOptions}
            onChange={(sub_service_id) => setValues((current) => ({ ...current, sub_service_id }))}
          />
          <FormField
            compact
            label={labels.regionLabel}
            type="select"
            value={values.region_id}
            options={regionOptions}
            onChange={(region_id) => setValues((current) => ({ ...current, region_id, district_id: "" }))}
          />
          <FormField
            compact
            label={labels.districtLabel}
            type="select"
            value={values.district_id}
            options={districtOptions}
            onChange={(district_id) => setValues((current) => ({ ...current, district_id }))}
          />
          <FormField
            compact
            label={labels.groupSizeLabel}
            type="number"
            value={values.group_size}
            onChange={(group_size) => setValues((current) => ({ ...current, group_size }))}
          />
          <FormField
            compact
            label={labels.latitudeLabel}
            type="number"
            value={values.lat}
            onChange={(lat) => setValues((current) => ({ ...current, lat }))}
          />
          <FormField
            compact
            label={labels.longitudeLabel}
            type="number"
            value={values.lon}
            onChange={(lon) => setValues((current) => ({ ...current, lon }))}
          />
          <FormField
            compact
            className="md:col-span-2"
            label={labels.noteLabel}
            type="textarea"
            rows={4}
            value={values.comment}
            onChange={(comment) => setValues((current) => ({ ...current, comment }))}
          />
          <FormField
            compact
            className="md:col-span-2"
            label={labels.priceLabel}
            placeholder="1 500 000"
            suffix={MONEY_CURRENCY_LABEL}
            value={values.total_price}
            onChange={(total_price) => setValues((current) => ({ ...current, total_price: formatNumberInput(total_price) }))}
          />
        </div>
      </form>
    </AdminDrawer>
  );
}

function ConfirmOrderModal({
  actionError,
  loading,
  labels,
  onClose,
  onChange,
  onSubmit,
}: {
  actionError?: string;
  loading: boolean;
  labels: OrderLabels;
  onClose: () => void;
  onChange?: () => void;
  onSubmit: (deadlineMinutes?: number) => Promise<void>;
}) {
  const [deadlineMinutes, setDeadlineMinutes] = useState("30");
  const [error, setError] = useState("");
  const formId = "order-confirm-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!deadlineMinutes.trim()) {
      await onSubmit(30);
      return;
    }
    const parsed = parseNumberInput(deadlineMinutes);
    if (!parsed || parsed <= 0) {
      setError(labels.requiredField);
      return;
    }
    await onSubmit(Math.trunc(parsed));
  };

  return (
    <Modal
      centered
      open
      rootClassName="artistbor-confirm-modal"
      width={480}
      title={labels.confirmDialogTitle}
      onCancel={onClose}
      closeIcon={<X className="size-4" />}
      footer={
        <div className="flex justify-end">
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--success w-1/2 text-sm font-black"
          >
            <ShieldCheck className="size-4" />
            {loading ? labels.processing : labels.confirmAction}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {labels.confirmDialogMessage}
        </p>
        {actionError ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold leading-5 text-rose-200">
            {actionError}
          </div>
        ) : null}
        <FormField
          label={labels.deadlineMinutesLabel}
          type="text"
          inputMode="numeric"
          placeholder={labels.deadlineMinutesPlaceholder}
          value={deadlineMinutes}
          error={error}
          onChange={(value) => {
            setDeadlineMinutes(value);
            setError("");
            onChange?.();
          }}
        />
      </form>
    </Modal>
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
  const formId = "order-cancel-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setError(labels.requiredField);
      return;
    }
    await onSubmit(reason);
  };

  return (
    <Modal
      centered
      open
      rootClassName="artistbor-confirm-modal"
      width={480}
      title={labels.cancelModalTitle}
      onCancel={onClose}
      closeIcon={<X className="size-4" />}
      footer={
        <div className="flex justify-end">
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--danger w-1/2 text-sm font-black"
          >
            <XCircle className="size-4" />
            {loading ? labels.processing : labels.cancelOrderAction}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <FormField
          label={labels.reasonLabel}
          type="textarea"
          rows={7}
          required
          value={reason}
          error={error}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />
      </form>
    </Modal>
  );
}

function RejectPaymentModal({
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
  const formId = "order-payment-reject-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError(labels.requiredField);
      return;
    }
    await onSubmit(reason.trim());
  };

  return (
    <Modal
      centered
      open
      rootClassName="artistbor-confirm-modal"
      width={480}
      title={labels.rejectPaymentDialogTitle}
      onCancel={onClose}
      closeIcon={<X className="size-4" />}
      footer={
        <div className="flex justify-end">
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--danger w-1/2 text-sm font-black"
          >
            <XCircle className="size-4" />
            {loading ? labels.processing : labels.rejectPaymentAction}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <FormField
          label={labels.reasonLabel}
          type="textarea"
          rows={6}
          required
          value={reason}
          error={error}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />
      </form>
    </Modal>
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
  if (isStatusField(fieldKey)) return <StatusBadge value={value} fieldKey={fieldKey} />;
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
  if (normalized === "10" || normalized === "pending") return "10";
  if (normalized === "20" || normalized === "payment_pending") return "20";
  if (normalized === "30" || normalized === "confirmed") return "30";
  if (normalized === "50" || normalized === "completed") return "50";
  if (normalized === "40" || normalized === "cancelled") return "40";
  return orderStatusTabValues.some((tab) => tab.value === normalized) ? normalized : "";
}

function orderStatusCountClass(status: OrderStatusTabKey) {
  if (status === "pending") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  }
  if (status === "payment_pending") {
    return "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300";
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
    String(left.artist_id ?? "") === String(right.artist_id ?? "") &&
    String(left.date_from ?? "") === String(right.date_from ?? "") &&
    String(left.date_to ?? "") === String(right.date_to ?? "") &&
    String(left.sort ?? "") === String(right.sort ?? "") &&
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

function isOrderScheduleExpired(order: OrderRecord, nowMs = Date.now()) {
  const scheduledMs = getOrderScheduleStartMs(order);
  return typeof scheduledMs === "number" && nowMs > scheduledMs;
}

function getOrderScheduleStartMs(order: OrderRecord) {
  const date = stringValue(order.date);
  if (!date) return undefined;

  const time = stringValue(order.time) ?? stringValue(order.start_time) ?? "00:00";
  const normalizedTime = normalizeOrderTimeForDate(time);
  const parsed = new Date(`${date}T${normalizedTime}`);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function normalizeOrderTimeForDate(time: string) {
  const [hours = "00", minutes = "00", seconds = "00"] = time.trim().split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
}

function resolveOrderActionErrorMessage(caught: unknown, labels: OrderLabels, type: "confirm" | "complete") {
  const message = caught instanceof Error ? caught.message : "";
  if (type === "confirm" && isValidationFailedMessage(message)) return labels.orderExpiredConfirmBlocked;
  return message || labels.actionFailed;
}

function isValidationFailedMessage(message: string) {
  return message.trim().toLowerCase().includes("validation failed");
}

function getOrderPayments(order: OrderRecord): OrderPaymentRecord[] {
  const direct = order.orderPayments;
  if (Array.isArray(direct)) return direct;

  const snakeCase = order.order_payments;
  if (Array.isArray(snakeCase)) return snakeCase;

  return [];
}

function findPendingOrderPayment(order: OrderRecord) {
  return getOrderPayments(order).find((payment) => normalizePaymentRecordStatus(payment.status) === "pending");
}

function normalizePaymentRecordStatus(status: unknown): "pending" | "verified" | "rejected" {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("verified") || normalized.includes("approved") || normalized.includes("tasdiq")) return "verified";
  if (normalized.includes("rejected") || normalized.includes("reject") || normalized.includes("rad")) return "rejected";
  return "pending";
}

function compactPayload<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== ""),
  ) as Partial<T>;
}

function compactOrderUpdatePayload(value: UpdateOrderPayload) {
  return Object.fromEntries(
    Object.entries(value).filter(([key, fieldValue]) => {
      if (fieldValue === undefined) return false;
      if (fieldValue === null) return key === "sub_service_id";
      if (fieldValue === "") return key === "address" || key === "comment";
      return true;
    }),
  ) as UpdateOrderPayload;
}

function createOrderSelectOptions<T extends DisplayEntity & { id?: number | string }>(items: T[], locale: Locale) {
  return items
    .filter((item) => item.id !== undefined && item.id !== null)
    .map((item) => ({
      label: getName(item, locale) ?? `#${item.id}`,
      value: Number(item.id),
    }));
}

function toInputValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function formatNumberInput(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function parseNumberInput(value: string) {
  const trimmed = value.trim().replace(/\s/g, "");
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNullableNumberInput(value: string, previousValue: unknown) {
  const parsed = parseNumberInput(value);
  if (parsed !== undefined) return parsed;
  return numberKey(previousValue) !== undefined ? null : undefined;
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

function formatPaymentDeadline(order: OrderRecord) {
  return stringValue(order.payment_deadline_formatted) ?? formatNullableUnixDate(order.payment_deadline ?? order.payment_expires_at);
}

function hasOrderPaymentDeadline(order: OrderRecord) {
  return hasMeaningfulDeadlineValue(order.payment_deadline) || hasMeaningfulDeadlineValue(order.payment_expires_at);
}

function hasMeaningfulDeadlineValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
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

function firstOrderTimestamp(order: OrderRecord, keys: string[]) {
  for (const key of keys) {
    const value = getValue(order, key);
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return undefined;
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
  const artist = getOrderArtistRecord(row) ?? getFromMap(artistMap, row.artist_id);
  if (!artist) return { fallback: fallbackWithId(labels.artistLabel, row.artist_id) };

  const user = asRecord(getValue(artist, "user")) ?? asRecord(getValue(artist, "artist.user"));
  const nameSource = user ?? artist;
  const firstName = stringValue(nameSource.first_name);
  const lastName = stringValue(nameSource.last_name);
  const fromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  const explicitName = stringValue(nameSource.full_name) ?? (fromParts || undefined);
  const primary = explicitName ?? getArtistName(artist as ArtistProfile);

  return {
    primary,
    secondary: getSecondaryText(
      primary,
      formatPhone(nameSource.phone),
      formatPhone(artist.phone),
      nameSource.email,
      artist.email,
      formatPhone(artist.extra_phone),
    ),
    fallback: fallbackWithId(labels.artistLabel, row.artist_id),
  };
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
  const primary = stringValue(entity.full_name) ?? (fromParts || formatPhone(entity.phone) || stringValue(entity.phone));

  return {
    primary,
    secondary: getSecondaryText(primary, formatPhone(entity.phone), entity.email),
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
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
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
    artist_id: searchParams?.get("artist_id") ?? "",
    date_from: searchParams?.get("date_from") ?? "",
    date_to: searchParams?.get("date_to") ?? "",
    sort: searchParams?.get("sort") ?? "-created_at",
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
      advanceAmountLabel: "Аванс",
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
      completeDialogMessage: "Подтвердить отметку заказа как завершенного?",
      completeDialogTitle: "Завершение заказа",
      completedToast: "Заказ завершен",
      contactAction: "Контакты",
      confirmAction: "Подтвердить",
      confirmActionDescription: "Ожидает → Ожидает оплаты. Клиенту открывается авансовая оплата.",
      confirmDialogMessage: "Перевести заказ в ожидание оплаты?",
      confirmDialogTitle: "Подтверждение заказа",
      confirmedToast: "Заказ переведен в ожидание оплаты",
      conflictCheck: "Проверка конфликтов",
      conflictCheckFailed: "Не удалось выполнить проверку конфликтов",
      conflictsLoading: "Проверка конфликтов...",
      copyValue: (label: string) => `Скопировать значение: ${label}`,
      createdAtLabel: "Создан",
      custom: "Настроить",
      dateAll: "Дата: Все",
      dateFrom: "Дата с",
      dateLabel: "Дата",
      dateTo: "Дата до",
      dateTimeColumn: "Дата / время",
      deadlineMinutesLabel: "Срок оплаты в минутах",
      deadlineMinutesPlaceholder: "По умолчанию 30 минут",
      description: "Отслеживание, подтверждение, завершение и перенос заказов.",
      detailLoadFailed: "Не удалось загрузить детали заказа",
      districtLabel: "Район",
      editAction: "Редактировать",
      editActionDescription: "Обновить адрес или заметки.",
      editModalTitle: "Редактирование заказа",
      endTime: "Окончание",
      eyebrow: "Заказы",
      idNotFound: "ID заказа не найден",
      infoTab: "Информация",
      historyTitle: "История",
      latitudeLabel: "Широта",
      lifecycleCompleted: "Завершен",
      lifecycleConfirmed: "Подтвержден",
      lifecycleCreated: "Создан",
      lifecyclePaid: "Оплата получена",
      loadFailed: "Не удалось загрузить заказы",
      longitudeLabel: "Долгота",
      mainInfoTitle: "Основная информация",
      mapLabel: "Карта",
      groupSizeLabel: "Количество гостей",
      month: "30 дней",
      newest: "Новые",
      noteLabel: "Комментарий",
      oldest: "Старые",
      noPaymentReceipts: "Чеки пока не загружены",
      openReceiptAction: "Открыть чек",
      openYandexMap: "Открыть в Яндекс Картах",
      orderColumn: "Заказ",
      orderExpiredConfirmBlocked: "Срок заказа истек. Измените дату или время, затем подтвердите заказ.",
      orderStatusLabel: "Статус заказа",
      orderTitle: "Заказ",
      paymentAll: "Оплата: Все",
      paymentDeadlineLabel: "Срок оплаты",
      paymentExpired: "Срок истек",
      paymentLabel: "Оплата",
      paymentPaid: "Оплачено",
      paymentPending: "Ожидает оплаты",
      paymentRefunded: "Возвращено",
      paymentReceiptLabel: "Чек",
      paymentRecordStatuses: {
        pending: "На проверке",
        verified: "Подтвержден",
        rejected: "Отклонен",
      },
      paymentsDescription: "Аванс, срок оплаты и чеки клиента.",
      paymentsTitle: "Платежи",
      paymentStatusLabel: "Статус оплаты",
      paymentRejectedToast: "Платеж отклонен",
      paymentVerifiedToast: "Платеж подтвержден",
      pendingPaymentNotFound: "Ожидающий проверки чек не найден",
      priceLabel: "Цена",
      priceNotSet: "Цена не указана",
      processing: "Выполняется...",
      reasonLabel: "Причина",
      rejectPaymentAction: "Отклонить платеж",
      rejectPaymentDialogTitle: "Отклонить платеж",
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
        payment_pending: "Ожидает оплаты",
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
      verifiedAtLabel: "Проверен",
      verifyPaymentAction: "Подтвердить платеж",
      verifyPaymentDialogMessage: "Подтвердить чек клиента и перевести заказ в подтвержденные?",
      verifyPaymentDialogTitle: "Подтверждение платежа",
      viewAction: "Просмотр",
      week: "7 дней",
    };
  }

  return {
    locale,
    actionFailed: "Amal bajarilmadi",
    actionsColumn: "Amallar",
    actionsModalTitle: (id: unknown) => `Buyurtma #${id} amallari`,
    advanceAmountLabel: "Avans",
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
    completeDialogMessage: "Buyurtma yakunlandi deb belgilashni tasdiqlaysizmi?",
    completeDialogTitle: "Buyurtmani yakunlash",
    completedToast: "Buyurtma bajarildi",
    contactAction: "Aloqa",
    confirmAction: "Tasdiqlash",
    confirmActionDescription: "Kutilmoqda → To'lov kutilmoqda. Mijozga avans to'lovi ochiladi.",
    confirmDialogMessage: "Buyurtmani to'lov kutilmoqda holatiga o'tkazasizmi?",
    confirmDialogTitle: "Buyurtmani tasdiqlash",
    confirmedToast: "Buyurtma to'lov kutilmoqda holatiga o'tkazildi",
    conflictCheck: "Konflikt tekshiruvi",
    conflictCheckFailed: "Konflikt tekshiruvi bajarilmadi",
    conflictsLoading: "Konfliktlar tekshirilmoqda...",
    copyValue: (label: string) => `${label} qiymatini nusxalash`,
    createdAtLabel: "Yaratilgan",
    custom: "Sozlash",
    dateAll: "Sana: Barchasi",
    dateFrom: "Sanadan",
    dateLabel: "Sana",
    dateTo: "Sanagacha",
    dateTimeColumn: "Sana / vaqt",
    deadlineMinutesLabel: "To'lov muddati, daqiqada",
    deadlineMinutesPlaceholder: "Standart 30 daqiqa",
    description: "Buyurtmalar holatini kuzatish, tasdiqlash, yakunlash va qayta rejalash.",
    detailLoadFailed: "Buyurtma tafsilotlari yuklanmadi",
    districtLabel: "Tuman",
    editAction: "Tahrirlash",
    editActionDescription: "Manzil yoki izohlarni yangilash.",
    editModalTitle: "Buyurtmani tahrirlash",
    endTime: "Tugash",
    eyebrow: "Buyurtmalar",
    idNotFound: "Buyurtma ID topilmadi",
    infoTab: "Ma'lumot",
    historyTitle: "Tarix",
    latitudeLabel: "Kenglik",
    lifecycleCompleted: "Yakunlandi",
    lifecycleConfirmed: "Tasdiqlandi",
    lifecycleCreated: "Yaratildi",
    lifecyclePaid: "To'lov to'landi",
    loadFailed: "Buyurtmalar yuklanmadi",
    longitudeLabel: "Uzunlik",
    mainInfoTitle: "Asosiy ma'lumotlar",
    mapLabel: "Xarita",
    groupSizeLabel: "Mehmonlar soni",
    month: "30 kun",
    newest: "Yangilari",
    noteLabel: "Izoh",
    oldest: "Eng eskilari",
    noPaymentReceipts: "Hali chek yuklanmagan",
    openReceiptAction: "Chekni ochish",
    openYandexMap: "Yandex xaritada ochish",
    orderColumn: "Buyurtma",
    orderExpiredConfirmBlocked: "Buyurtma muddati o'tgan. Sanani yoki vaqtni o'zgartirib, keyin tasdiqlang.",
    orderStatusLabel: "Buyurtma holati",
    orderTitle: "Buyurtma",
    paymentAll: "To'lov: Barchasi",
    paymentDeadlineLabel: "To'lov muddati",
    paymentExpired: "Muddati o'tgan",
    paymentLabel: "To'lov",
    paymentPaid: "To'langan",
    paymentPending: "To'lov kutilmoqda",
    paymentRefunded: "Qaytarilgan",
    paymentReceiptLabel: "Chek",
    paymentRecordStatuses: {
      pending: "Tekshiruvda",
      verified: "Tasdiqlangan",
      rejected: "Rad etilgan",
    },
    paymentsDescription: "Avans, to'lov muddati va mijoz yuklagan cheklar.",
    paymentsTitle: "To'lovlar",
    paymentStatusLabel: "To'lov holati",
    paymentRejectedToast: "To'lov rad etildi",
    paymentVerifiedToast: "To'lov tasdiqlandi",
    pendingPaymentNotFound: "Tekshiruvdagi chek topilmadi",
    priceLabel: "Narx",
    priceNotSet: "Narx belgilanmagan",
    processing: "Bajarilmoqda...",
    reasonLabel: "Sabab",
    rejectPaymentAction: "To'lovni rad etish",
    rejectPaymentDialogTitle: "To'lovni rad etish",
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
      payment_pending: "To'lov kutilmoqda",
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
    verifiedAtLabel: "Tekshirildi",
    verifyPaymentAction: "To'lovni tasdiqlash",
    verifyPaymentDialogMessage: "Mijoz chekini tasdiqlab, buyurtmani tasdiqlangan holatiga o'tkazasizmi?",
    verifyPaymentDialogTitle: "To'lovni tasdiqlash",
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
        {labels.close}
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
