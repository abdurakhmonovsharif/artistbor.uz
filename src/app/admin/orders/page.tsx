"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Drawer, Input, Modal, Tabs } from "antd";
import {
  AtSign,
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
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
import { ContractFileActions } from "@/components/admin/contracts/contract-file-actions";
import { AdminDrawer, adminDrawerClassNames, adminDrawerStyles, adminDrawerSubtitleStyles } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusTabRail } from "@/components/admin/status-tab-rail";
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
import { EmptyState, ErrorState, InlineLoadingState, LoadingState } from "@/components/ui/states";
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
  type RescheduleOrderPayload,
  servicesApi,
  type OrderFilters,
  type UpdateOrderPayload,
} from "@/lib/api/admin-content";
import { getArtistName } from "@/lib/artist-display";
import { positiveInteger } from "@/lib/admin-action-validation";
import { formatBookingDate, formatBookingTimeRange, formatUnixDateTime, isExpired } from "@/lib/order-format";
import { getOrderUiStatus } from "@/lib/order-status";
import { getDashboardNotification, getDashboardStatus } from "@/lib/i18n/dashboard-copy";
import { useI18n } from "@/lib/i18n/i18n-provider";
import {
  formatMoneyWithCurrency,
  formatSignedMoneyInput,
  MONEY_CURRENCY_LABEL,
  positiveMoneyAmount,
} from "@/lib/money-format";
import {
  buildVerifyPaymentPayload,
  canSubmitVerifyPayment,
  isPartialPaymentApiError,
} from "@/lib/order-payment-verification";
import { formatPhone } from "@/lib/phone-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLatestRequest } from "@/lib/use-latest-request";
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
  OrderContract,
  UnknownRecord,
  User,
} from "@/types/api";

type DialogState =
  | { type: "details"; order: OrderRecord; detailLoading: boolean }
  | { type: "contact"; order: OrderRecord }
  | { type: "edit"; order: OrderRecord }
  | { type: "confirm"; order: OrderRecord }
  | { type: "reschedule"; order: OrderRecord }
  | { type: "complete"; order: OrderRecord }
  | { type: "cancel"; order: OrderRecord }
  | { type: "verify-payment"; order: OrderRecord; payment: OrderPaymentRecord }
  | { type: "confirm-partial-payment"; order: OrderRecord; payment: OrderPaymentRecord }
  | { type: "reject-payment"; order: OrderRecord; payment: OrderPaymentRecord }
  | null;

type ConfirmOrderFormPayload = {
  total_price: number;
  deadline_minutes: number;
};

const limit = 20;
type OrderStatusTabKey =
  | "all"
  | "pending"
  | "payment_pending"
  | "payment_verification"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled";

type OrderStatusTab = {
  key: OrderStatusTabKey;
  value: string;
};

const orderStatusTabValues: OrderStatusTab[] = [
  { key: "all", value: "" },
  { key: "pending", value: "10" },
  { key: "payment_pending", value: "20" },
  { key: "payment_verification", value: "25" },
  { key: "confirmed", value: "30" },
  { key: "rejected", value: "35" },
  { key: "completed", value: "50" },
  { key: "cancelled", value: "40" },
];

const initialStatusCounts: Record<OrderStatusTabKey, number> = {
  all: 0,
  pending: 0,
  payment_pending: 0,
  payment_verification: 0,
  confirmed: 0,
  rejected: 0,
  completed: 0,
  cancelled: 0,
};

const CONFIRMED_ORDER_STATUS_CODE = 30;

const initialFilters: OrderFilters = {
  q: "",
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
  const [searchDraft, setSearchDraft] = useState(String(initialOrderFilters.q ?? ""));
  const search = useDebouncedValue(searchDraft.trim(), 300);
  const [dateRange, setDateRange] = useState(() => inferDateFilterMode(initialOrderFilters));
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [rows, setRows] = useState<OrderRecord[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<OrderStatusTabKey, number>>(initialStatusCounts);
  const [statusCountsLoaded, setStatusCountsLoaded] = useState(false);
  const [meta, setMeta] = useState<ListResult<OrderRecord>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogError, setDialogError] = useState("");
  const toast = useToast();
  const formOptionsLoaded = useRef(false);
  const formOptionsRequest = useRef<Promise<void> | null>(null);
  const startListRequest = useLatestRequest(filters);
  const startStatusCountRequest = useLatestRequest();
  const activeStatus = orderStatusTabFromValue(draftFilters.status);
  const statusTabItems = useMemo(
    () => orderStatusTabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      count: statusCounts[tab.key] ?? 0,
      countClassName: orderStatusCountClass(tab.key),
    })),
    [orderStatusTabs, statusCounts],
  );
  const page = Number(filters.page ?? 1);
  const pageSize = Number(filters.limit) || limit;

  const fetchOrders = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startListRequest();
    if (!background) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await ordersApi.list({
        ...filters,
        expand: "client,artist,service,subService",
      });
      if (!isLatestRequest()) return;
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : labels.loadFailed;
      if (background) toast.error(message);
      else setError(message);
    } finally {
      if (isLatestRequest()) setLoading(false);
    }
  }, [filters, labels.loadFailed, startListRequest, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOrders]);

  const fetchStatusCounts = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startStatusCountRequest();
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

      if (!isLatestRequest()) return;
      setStatusCounts(
        orderStatusTabs.reduce<Record<OrderStatusTabKey, number>>((accumulator, tab, index) => {
          accumulator[tab.key] = getResultCount(results[index]);
          return accumulator;
        }, { ...initialStatusCounts }),
      );
      setStatusCountsLoaded(true);
    } catch (caught) {
      if (!isLatestRequest()) return;
      if (background) {
        toast.error(caught instanceof Error ? caught.message : labels.loadFailed);
      } else {
        setStatusCounts(initialStatusCounts);
        setStatusCountsLoaded(false);
      }
    }
  }, [labels.loadFailed, orderStatusTabs, startStatusCountRequest, toast]);

  const loadOrderFormOptions = useCallback(async () => {
    if (formOptionsLoaded.current) return;
    if (formOptionsRequest.current) return formOptionsRequest.current;

    const request = Promise.all([
      servicesApi.list({ page: 1, limit: 1000 }),
      regionsApi.list({ page: 1, limit: 1000 }),
      districtsApi.list({ page: 1, limit: 1000 }),
    ]).then(([servicesResult, regionsResult, districtsResult]) => {
      setServices(servicesResult.items);
      setRegions(regionsResult.items);
      setDistricts(districtsResult.items);
      formOptionsLoaded.current = true;
    }).finally(() => {
      formOptionsRequest.current = null;
    });

    formOptionsRequest.current = request;
    return request;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const result = await artistsApi.list({ page: 1, limit: 500 });
        setArtistOptions(result.items);
      } catch {
        setArtistOptions([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrderFormOptions().catch(() => undefined);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [loadOrderFormOptions]);

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
          q: search,
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
    search,
  ]);

  const clientMap = useMemo(() => new Map<number, User>(), []);
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
      const [order] = await Promise.all([
        ordersApi.detail(row.id),
        loadOrderFormOptions(),
      ]);
      setDialog({ type, order });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (row: OrderRecord) => {
    setDialog({ type: "details", order: row, detailLoading: Boolean(row.id) });
    if (!row.id) return;

    try {
      const [orderResult, contractResult] = await Promise.allSettled([
        ordersApi.detail(row.id, {
          expand: "client,artist,service,subService,region,district,invoice,orderPayments,history",
        }),
        ordersApi.contract(row.id),
      ]);
      if (orderResult.status === "rejected") throw orderResult.reason;
      const order = {
        ...orderResult.value,
        ...(contractResult.status === "fulfilled"
          ? {
              contract: contractResult.value.contract,
              public_id: contractResult.value.order_public_id ?? orderResult.value.public_id,
            }
          : {}),
      };
      setDialog((current) =>
        current?.type === "details" && current.order.id === row.id
          ? { type: "details", order: { ...row, ...order }, detailLoading: false }
          : current,
      );
    } catch (caught) {
      setDialog((current) =>
        current?.type === "details" && current.order.id === row.id
          ? { ...current, detailLoading: false }
          : current,
      );
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    }
  };

  const openContact = async (row: OrderRecord) => {
    setDialog({ type: "contact", order: row });
    if (!row.id) return;

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
      setDialog((current) =>
        current?.type === "contact" && current.order.id === row.id
          ? {
              type: "contact",
              order: { ...row, ...order, artist_profile_contact: artistDetail },
            }
          : current,
      );
    } catch {
      // Keep the contact drawer populated from the list response.
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

  const applyLocalStatusTransition = (order: OrderRecord, nextStatus: number) => {
    if (!statusCountsLoaded) {
      void fetchStatusCounts({ background: true });
      return;
    }
    const previousKey = orderStatusTabFromValue(order.status ?? order.status_code);
    const nextKey = orderStatusTabFromValue(nextStatus);
    if (previousKey === nextKey) return;
    if (previousKey === "all" || nextKey === "all") {
      void fetchStatusCounts({ background: true });
      return;
    }

    startStatusCountRequest();
    setStatusCounts((current) => ({
      ...current,
      [previousKey]: Math.max(0, current[previousKey] - 1),
      [nextKey]: current[nextKey] + 1,
    }));
  };

  const runSimpleAction = async (type: "confirm" | "complete", confirmPayload?: ConfirmOrderFormPayload) => {
    if (!dialog || dialog.type !== type || !dialog.order.id) return;
    if (type === "confirm" && !confirmPayload) return;
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
          ...confirmPayload,
        });
        toast.success(labels.confirmedToast);
      } else {
        await ordersApi.complete(dialog.order.id);
        toast.success(labels.completedToast);
      }
      applyLocalStatusTransition(dialog.order, type === "confirm" ? 20 : 50);
      setDialog(null);
      void fetchOrders({ background: true });
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

  const runRescheduleAction = async (payload: RescheduleOrderPayload) => {
    if (!dialog || dialog.type !== "reschedule" || !dialog.order.id) return;
    setDialogError("");
    setSubmitting(true);
    try {
      await ordersApi.reschedule(dialog.order.id, payload);
      toast.success(labels.rescheduledToast);
      setDialog(null);
      void fetchOrders({ background: true });
    } catch (caught) {
      setDialogError(resolveRescheduleErrorMessage(caught, labels));
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

  const runVerifyPayment = async (allowPartial = false) => {
    if (
      !dialog ||
      (dialog.type !== "verify-payment" && dialog.type !== "confirm-partial-payment")
    ) return;
    if (!canSubmitVerifyPayment(dialog.type, allowPartial)) return;

    const { order, payment } = dialog;
    const orderId = order.id;
    const paymentId = payment.id;
    if (!orderId || !paymentId) return;

    setSubmitting(true);
    try {
      await ordersApi.verifyPayment(
        orderId,
        buildVerifyPaymentPayload(paymentId, allowPartial),
      );
      toast.success(labels.paymentVerifiedToast);
      applyLocalStatusTransition(order, 30);
      setDialog(null);
      void fetchOrders({ background: true });
    } catch (caught) {
      if (!allowPartial && isPartialPaymentApiError(caught)) {
        setDialog({ type: "confirm-partial-payment", order, payment });
        return;
      }

      toast.error(caught instanceof Error ? caught.message : labels.actionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const runRejectPayment = async (reason?: string) => {
    if (!dialog || dialog.type !== "reject-payment") return;

    const { order, payment } = dialog;
    const orderId = order.id;
    const paymentId = payment.id;
    if (!orderId || !paymentId) return;

    setSubmitting(true);
    try {
      const payload: RejectOrderPaymentPayload = {
        payment_id: paymentId,
        reason: stringValue(reason),
      };
      await ordersApi.rejectPayment(orderId, payload);
      toast.success(labels.paymentRejectedToast);
      setDialog(null);
      void fetchOrders({ background: true });
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
    <section className="artistbor-admin-page artistbor-responsive-data-page w-full space-y-4">
      <AdminPageHeader eyebrow={labels.eyebrow} title={labels.title} description={labels.description} />

      <StatusTabRail
        items={statusTabItems}
        activeKey={activeStatus}
        ariaLabel={labels.statusTabsLabel}
        previousLabel={labels.statusTabsPrevious}
        nextLabel={labels.statusTabsNext}
        controlsId="orders-results"
        onChange={changeStatus}
      />

      <div className="artistbor-table-filter-shell artistbor-responsive-filter-shell">
        <div className="artistbor-table-filter-panel artistbor-responsive-filter-panel">
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
            className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 px-4"
          >
            <RotateCcw className="size-4" />
            {labels.reset}
          </button>
        </div>
      </div>

      <div
        id="orders-results"
        role="tabpanel"
        aria-labelledby={`orders-results-${activeStatus}-tab`}
        className="space-y-4"
      >
        {loading ? (
          <OrdersSkeleton />
        ) : error ? (
          <ErrorState message={error} />
        ) : displayedRows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="artistbor-orders-cards gap-3">
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
            <div className="artistbor-orders-table">
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
      </div>

      <OrderDetailDrawer
        open={dialog?.type === "details"}
        order={dialog?.type === "details" ? dialog.order : null}
        detailLoading={dialog?.type === "details" ? dialog.detailLoading : false}
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
        onReschedule={() => {
          if (dialog?.type === "details") {
            setDialogError("");
            setDialog({ type: "reschedule", order: dialog.order });
          }
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
              void fetchOrders({ background: true });
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : labels.updateFailed);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "reschedule" ? (
        <RescheduleOrderModal
          actionError={dialogError}
          loading={submitting}
          order={dialog.order}
          labels={labels}
          onClose={() => {
            setDialogError("");
            setDialog(null);
          }}
          onChange={() => setDialogError("")}
          onSubmit={runRescheduleAction}
        />
      ) : null}

      {dialog?.type === "confirm" ? (
        <ConfirmOrderModal
          actionError={dialogError}
          loading={submitting}
          order={dialog.order}
          labels={labels}
          onClose={() => {
            setDialogError("");
            setDialog(null);
          }}
          onSubmit={(payload) => runSimpleAction("confirm", payload)}
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
              applyLocalStatusTransition(dialog.order, 40);
              setDialog(null);
              void fetchOrders({ background: true });
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
          onConfirm={() => runVerifyPayment()}
        />
      ) : null}

      {dialog?.type === "confirm-partial-payment" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          title={labels.partialPaymentDialogTitle}
          message={partialPaymentDialogMessage(dialog.payment, labels)}
          confirmLabel={labels.partialPaymentConfirmAction}
          onCancel={() => setDialog(null)}
          onConfirm={() => runVerifyPayment(true)}
        />
      ) : null}

      {dialog?.type === "reject-payment" ? (
        <RejectPaymentModal
          loading={submitting}
          labels={labels}
          onClose={() => setDialog(null)}
          onSubmit={runRejectPayment}
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
    <div className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]">
      <div
        role="region"
        tabIndex={0}
        aria-label={labels.ordersTableRegionLabel}
        className="admin-table-scroll artistbor-orders-data-table overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-artistbor-accent"
      >
        <table className="w-full border-separate border-spacing-0">
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
                      publicId={row.public_id}
                      createdAt={firstOrderTimestamp(row, ["created_at", "createdAt"])}
                      compactMeta={client.primary}
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
            ? "border-artistbor-border-strong bg-artistbor-surface-subtle text-artistbor-secondary"
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
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-artistbor-border bg-artistbor-surface px-3 text-xs font-black text-artistbor-secondary transition-colors duration-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 transition-colors duration-200 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
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

function YandexMapPreview({
  latitude,
  longitude,
  labels,
}: {
  latitude: string;
  longitude: string;
  labels: OrderLabels;
}) {
  const coordinates = getValidMapCoordinates(latitude, longitude);

  if (!coordinates) {
    return (
      <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/15 dark:bg-white/[0.025]">
        <div>
          <MapPin className="mx-auto size-6 text-slate-400" />
          <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">{labels.mapCoordinatesRequired}</p>
        </div>
      </div>
    );
  }

  const mapUrl = getYandexMapUrlFromCoordinates(coordinates);
  const staticMapUrl = getYandexStaticMapUrl(coordinates);

  return (
    <section aria-label={labels.mapPreviewTitle} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <MapPin className="size-4 shrink-0 text-amber-500" />
            {labels.mapPreviewTitle}
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
            {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
          </p>
        </div>
        <YandexMapLink href={mapUrl} label={labels.openYandexMap} />
      </div>
      <div className="relative h-52 bg-slate-100 sm:h-60 dark:bg-slate-900">
        <Image
          fill
          alt={`${labels.mapPreviewTitle}: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`}
          className="pointer-events-none select-none object-cover"
          draggable={false}
          sizes="(max-width: 768px) 100vw, 520px"
          src={staticMapUrl}
          unoptimized
        />
      </div>
      <p className="border-t border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
        {labels.mapPreviewReadonly}
      </p>
    </section>
  );
}

function OrderDetailDrawer({
  order,
  detailLoading,
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
  onReschedule,
  onComplete,
  onCancel,
  onVerifyPayment,
  onRejectPayment,
  labels,
}: {
  order: OrderRecord | null;
  detailLoading: boolean;
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
  onReschedule: () => void;
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
            {labels.orderTitle} {order.public_id ?? "—"}
          </span>
          <OrderStatusBadge status={localizeOrderStatus(getOrderUiStatus(order), labels)} />
        </div>
      }
      footer={
        <OrderDrawerActions
          order={order}
          onEdit={onEdit}
          onConfirm={onConfirm}
          onReschedule={onReschedule}
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
        {detailLoading ? <InlineLoadingState /> : null}
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
              key: "contract",
              label: labels.contractTitle,
              children: <OrderContractPanel contract={order.contract} labels={labels} />,
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
  onReschedule,
  onComplete,
  onCancel,
  onVerifyPayment,
  onRejectPayment,
  labels,
}: {
  order: OrderRecord;
  onEdit: () => void;
  onConfirm: () => void;
  onReschedule: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onVerifyPayment: () => void;
  onRejectPayment: () => void;
  labels: OrderLabels;
}) {
  const primaryAction = getPrimaryOrderAction(order, labels);
  const pendingPayment = findPendingOrderPayment(order);
  const canReschedule = hasConfirmedOrderStatus(order);

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
      {canReschedule ? (
        <DrawerActionButton
          icon={<CalendarClock className="size-4" />}
          label={labels.rescheduleAction}
          tone="reschedule"
          onClick={onReschedule}
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
  tone?: "default" | "confirm" | "reschedule" | "complete" | "danger" | "payment";
  onClick: () => void;
}) {
  const toneClass = {
    default:
      "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:text-slate-200 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-200",
    confirm:
      "border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10",
    reschedule:
      "border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10",
    complete:
      "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10",
    payment:
      "border-artistbor-border-strong text-artistbor-secondary hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/10 dark:hover:text-amber-300",
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
            {labels.orderTitle} {order.public_id ?? "—"}
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

function OrderContractPanel({ contract, labels }: { contract?: OrderContract | null; labels: OrderLabels }) {
  if (!contract) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/15 dark:bg-white/[0.025]">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <FileText className="size-4 text-amber-500" />
          {labels.contractTitle}
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{labels.contractMissing}</p>
      </section>
    );
  }

  const id = contract.contract_id ?? contract.id;
  const hasFile = contract.has_file !== false && (Boolean(contract.file_url) || contract.status !== "draft");
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
            <FileText className="size-4 text-amber-500" />
            {contract.contract_number || labels.contractTitle}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {getDashboardStatus("contract", contract.status ?? contract.status_label, labels.locale).label}
          </p>
        </div>
        <ContractFileActions contractId={id} contractNumber={contract.contract_number} disabled={!hasFile} labels={labels.contractFileActions} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ContractSignature label={labels.artistLabel} signed={contract.signatures?.artist?.signed} signedAt={contract.signatures?.artist?.signed_at} labels={labels} />
        <ContractSignature label={labels.clientColumn} signed={contract.signatures?.client?.signed} signedAt={contract.signatures?.client?.signed_at} labels={labels} />
      </div>
    </section>
  );
}

function ContractSignature({ label, signed, signedAt, labels }: { label: string; signed?: boolean; signedAt?: number | null; labels: OrderLabels }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/[0.04]">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
        {signed ? labels.contractSigned : labels.contractWaiting}
        {signed && signedAt ? ` · ${formatNullableUnixDate(signedAt)}` : ""}
      </p>
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
  const historyEvents = orderHistoryEvents(order, labels);
  const hasCompletionHistory = historyEvents.some((event) => event.key.startsWith("system_completed"));
  const events: Array<{ key: string; icon: React.ReactNode; label: string; value: unknown }> = [
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
      value: firstOrderTimestamp(order, ["confirmed_at", "confirmedAt", "approved_at", "approvedAt", "accepted_at", "acceptedAt"]) ?? orderConfirmationHistoryTimestamp(order),
    },
    ...(historyEvents.length
      ? historyEvents
      : [{
          key: "paid",
          icon: <CreditCard className="size-4" />,
          label: labels.lifecyclePaid,
          value: firstOrderTimestamp(order, ["paid_at", "paidAt", "payment_paid_at", "paymentPaidAt", "payment.paid_at", "payment.paidAt"]),
        }]),
    ...(!hasCompletionHistory ? [{
      key: "completed",
      icon: order.auto_completed ? <Bot className="size-4" /> : <Flag className="size-4" />,
      label: order.auto_completed ? `${labels.systemActor} · ${labels.autoCompleted}` : labels.lifecycleCompleted,
      value: firstOrderTimestamp(order, ["completed_at", "completedAt", "finished_at", "finishedAt", "done_at", "doneAt"]),
    }] : []),
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

function orderHistoryEvents(order: OrderRecord, labels: OrderLabels) {
  const rawHistory = ["history", "order_history", "status_history", "events"]
    .map((key) => order[key])
    .find(Array.isArray);
  if (!Array.isArray(rawHistory)) return [];

  return rawHistory
    .map((entry, index) => {
      if (!isRecord(entry)) return undefined;
      const normalized = resolveOrderPaymentHistoryEvent(entry);
      const knownByEvent: Record<string, { label: string; icon: React.ReactNode }> = {
        payment_submitted: { label: labels.lifecyclePaymentSubmitted, icon: <CreditCard className="size-4" /> },
        payment_verified: { label: labels.lifecyclePaymentVerified, icon: <CheckCircle2 className="size-4" /> },
        payment_rejected: { label: labels.lifecyclePaymentRejected, icon: <XCircle className="size-4" /> },
        system_completed: { label: `${labels.systemActor} · ${labels.autoCompleted}`, icon: <Bot className="size-4" /> },
      };
      const actorRole = firstNonEmptyString(entry, ["actor_role", "actorRole"])?.toLowerCase();
      const action = firstNonEmptyString(entry, ["action", "event", "event_name", "type"])?.toLowerCase();
      const historyKey = actorRole === "system" && action === "completed" ? "system_completed" : normalized;
      const known = historyKey ? knownByEvent[historyKey] : undefined;
      if (!known) return undefined;

      return {
        key: `${historyKey}-${index}`,
        icon: known.icon,
        label: known.label,
        value: firstOrderTimestamp(entry, ["created_at", "createdAt", "timestamp", "occurred_at", "occurredAt", "date"]),
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));
}

function resolveOrderPaymentHistoryEvent(entry: UnknownRecord) {
  const eventName = firstNonEmptyString(entry, ["event", "event_name", "action", "type", "code", "name", "status"]);
  const normalized = eventName?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "payment_submitted" || normalized === "payment_verified" || normalized === "payment_rejected") {
    return normalized;
  }

  const note = firstNonEmptyString(entry, ["note", "message", "description"])?.toLowerCase() ?? "";
  if (/(payment|платеж|to.?lov).*(verified|confirmed|подтвержд|tasdiq)/i.test(note)) return "payment_verified";
  if (/(payment|платеж|to.?lov).*(rejected|declined|отклон|rad et)/i.test(note)) return "payment_rejected";

  const oldValues = isRecord(entry.old_values) ? entry.old_values : undefined;
  const newValues = isRecord(entry.new_values) ? entry.new_values : undefined;
  const oldPaymentStatus = oldValues?.payment_status;
  const newPaymentStatus = newValues?.payment_status;
  if (newPaymentStatus !== undefined && String(newPaymentStatus) === "20" && String(oldPaymentStatus ?? "") !== "20") {
    return "payment_verified";
  }

  return undefined;
}

function orderConfirmationHistoryTimestamp(order: OrderRecord) {
  const rawHistory = ["history", "order_history", "status_history", "events"]
    .map((key) => order[key])
    .find(Array.isArray);
  if (!Array.isArray(rawHistory)) return undefined;

  const confirmation = rawHistory.find((entry) => {
    if (!isRecord(entry)) return false;
    const action = firstNonEmptyString(entry, ["action", "event", "event_name", "type", "code"])?.toLowerCase();
    const newValues = isRecord(entry.new_values) ? entry.new_values : undefined;
    return action === "confirmed" && String(newValues?.status ?? "") === "20";
  });
  return isRecord(confirmation)
    ? firstOrderTimestamp(confirmation, ["created_at", "createdAt", "timestamp", "occurred_at", "occurredAt", "date"])
    : undefined;
}

function firstNonEmptyString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[#e6ebf2] px-3 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-[#edf2f7] px-3 py-[9px] align-middle text-[13px] font-medium leading-[18px] text-[#334155] dark:border-white/10 dark:text-slate-100", className)}>{children}</td>;
}

function OrderIdCell({
  publicId,
  createdAt,
  compactMeta,
  labels,
}: {
  publicId?: string;
  createdAt: unknown;
  compactMeta?: string;
  labels: OrderLabels;
}) {
  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">{publicId || "—"}</p>
      <p className="mt-1 whitespace-nowrap text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
        {labels.createdAtLabel}: {formatNullableUnixDate(createdAt)}
      </p>
      {compactMeta ? (
        <p className="artistbor-compact-only mt-1 max-w-[220px] truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
          {compactMeta}
        </p>
      ) : null}
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
          publicId={row.public_id}
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
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-artistbor-border px-3 text-xs font-black text-artistbor-secondary transition-colors duration-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
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
      {order.auto_completed ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-artistbor-surface-subtle px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-artistbor-secondary ring-1 ring-artistbor-border-strong">
          <Bot className="size-3" />
          {labels.autoCompleted}
        </span>
      ) : null}
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
  const latitudeError = getCoordinateFieldError(values.lat, -90, 90, labels.latitudeInvalid);
  const longitudeError = getCoordinateFieldError(values.lon, -180, 180, labels.longitudeInvalid);
  const previewLatitude = useDebouncedValue(values.lat, 350);
  const previewLongitude = useDebouncedValue(values.lon, 350);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (latitudeError || longitudeError) return;
    const payload = compactOrderUpdatePayload({
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
            label={labels.serviceColumn}
            type="select"
            value={values.service_id}
            options={serviceOptions}
            onChange={(service_id) => setValues((current) => ({ ...current, service_id, sub_service_id: "" }))}
          />
          <FormField
            compact
            label={labels.subServiceLabel}
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
            label={labels.priceLabel}
            placeholder="1 500 000"
            suffix={MONEY_CURRENCY_LABEL}
            value={values.total_price}
            onChange={(total_price) => setValues((current) => ({ ...current, total_price: formatNumberInput(total_price) }))}
          />
          <div className="space-y-4 md:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                compact
                error={latitudeError}
                inputMode="decimal"
                label={labels.latitudeLabel}
                value={values.lat}
                onChange={(lat) => setValues((current) => ({ ...current, lat }))}
              />
              <FormField
                compact
                error={longitudeError}
                inputMode="decimal"
                label={labels.longitudeLabel}
                value={values.lon}
                onChange={(lon) => setValues((current) => ({ ...current, lon }))}
              />
            </div>
            <YandexMapPreview latitude={previewLatitude} longitude={previewLongitude} labels={labels} />
          </div>
          <FormField
            compact
            className="md:col-span-2"
            label={labels.noteLabel}
            placeholder={labels.notePlaceholder}
            type="textarea"
            rows={4}
            value={values.comment}
            onChange={(comment) => setValues((current) => ({ ...current, comment }))}
          />
        </div>
      </form>
    </AdminDrawer>
  );
}

type RescheduleOrderFormValues = {
  date: string;
  time: string;
  time_to: string;
  reason: string;
};

function RescheduleOrderModal({
  actionError,
  loading,
  order,
  labels,
  onClose,
  onChange,
  onSubmit,
}: {
  actionError?: string;
  loading: boolean;
  order: OrderRecord;
  labels: OrderLabels;
  onClose: () => void;
  onChange?: () => void;
  onSubmit: (payload: RescheduleOrderPayload) => Promise<void>;
}) {
  const [values, setValues] = useState<RescheduleOrderFormValues>(() => initialRescheduleOrderValues(order));
  const [errors, setErrors] = useState<Partial<Record<keyof RescheduleOrderFormValues, string>>>({});
  const formId = "order-reschedule-form";

  const changeValue = (key: keyof RescheduleOrderFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    onChange?.();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof RescheduleOrderFormValues, string>> = {};
    if (!values.date.trim()) nextErrors.date = labels.requiredField;
    if (!values.time.trim()) nextErrors.time = labels.requiredField;
    if (!values.time_to.trim()) nextErrors.time_to = labels.requiredField;
    if (values.time && values.time_to && !isTimeRangeIncreasing(values.time, values.time_to)) {
      nextErrors.time_to = labels.rescheduleEndTimeAfterStart;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const reason = values.reason.trim();
    await onSubmit({
      date: values.date,
      time: values.time,
      time_to: values.time_to,
      ...(reason ? { reason } : {}),
    });
  };

  return (
    <Modal
      centered
      open
      rootClassName="artistbor-confirm-modal"
      width={560}
      title={labels.rescheduleModalTitle}
      onCancel={onClose}
      closeIcon={<X className="size-4" />}
      footer={
        <div className="flex justify-end">
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--success w-full text-sm font-black sm:w-1/2"
          >
            <CalendarClock className="size-4" />
            {loading ? labels.processing : labels.rescheduleAction}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5" aria-busy={loading}>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {labels.rescheduleActionDescription}
        </p>
        {actionError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold leading-5 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            {actionError}
          </div>
        ) : null}
        <FormField
          compact
          required
          label={labels.dateLabel}
          type="date"
          value={values.date}
          error={errors.date}
          disabled={loading}
          onChange={(date) => changeValue("date", date)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            compact
            required
            label={labels.startTime}
            type="time"
            value={values.time}
            error={errors.time}
            disabled={loading}
            onChange={(time) => changeValue("time", time)}
          />
          <FormField
            compact
            required
            label={labels.endTime}
            type="time"
            value={values.time_to}
            error={errors.time_to}
            disabled={loading}
            onChange={(timeTo) => changeValue("time_to", timeTo)}
          />
        </div>
        <FormField
          compact
          label={labels.reasonLabel}
          type="textarea"
          rows={4}
          value={values.reason}
          disabled={loading}
          onChange={(reason) => changeValue("reason", reason)}
        />
      </form>
    </Modal>
  );
}

function ConfirmOrderModal({
  actionError,
  loading,
  order,
  labels,
  onClose,
  onChange,
  onSubmit,
}: {
  actionError?: string;
  loading: boolean;
  order: OrderRecord;
  labels: OrderLabels;
  onClose: () => void;
  onChange?: () => void;
  onSubmit: (payload: ConfirmOrderFormPayload) => Promise<void>;
}) {
  const [totalPrice, setTotalPrice] = useState(() => formatSignedMoneyInput(order.total_price));
  const [deadlineMinutes, setDeadlineMinutes] = useState("30");
  const [totalPriceError, setTotalPriceError] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const formId = "order-confirm-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedTotalPrice = positiveMoneyAmount(totalPrice);
    const parsedDeadline = positiveInteger(deadlineMinutes.trim() || 30);
    const nextTotalPriceError = parsedTotalPrice === null ? labels.totalPriceRequired : "";
    const nextDeadlineError = parsedDeadline === null ? labels.requiredField : "";
    setTotalPriceError(nextTotalPriceError);
    setDeadlineError(nextDeadlineError);
    if (nextTotalPriceError || nextDeadlineError || parsedTotalPrice === null || parsedDeadline === null) return;

    await onSubmit({
      total_price: parsedTotalPrice,
      deadline_minutes: parsedDeadline,
    });
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
          required
          label={labels.priceLabel}
          inputMode="numeric"
          placeholder="1 500 000"
          suffix={MONEY_CURRENCY_LABEL}
          value={totalPrice}
          error={totalPriceError}
          onChange={(value) => {
            setTotalPrice(formatSignedMoneyInput(value));
            setTotalPriceError("");
            onChange?.();
          }}
        />
        <FormField
          label={labels.deadlineMinutesLabel}
          type="text"
          inputMode="numeric"
          placeholder={labels.deadlineMinutesPlaceholder}
          value={deadlineMinutes}
          error={deadlineError}
          onChange={(value) => {
            setDeadlineMinutes(value);
            setDeadlineError("");
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
  if (isStatusField(fieldKey)) {
    const statusFieldKey = fieldKey === "status" || fieldKey === "status_code"
      ? "order_status"
      : fieldKey;
    return <StatusBadge value={value} fieldKey={statusFieldKey} />;
  }
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
  if (normalized === "25" || normalized === "payment_verification") return "25";
  if (normalized === "30" || normalized === "confirmed") return "30";
  if (normalized === "35" || normalized === "rejected") return "35";
  if (normalized === "50" || normalized === "completed") return "50";
  if (normalized === "40" || normalized === "cancelled") return "40";
  return orderStatusTabValues.some((tab) => tab.value === normalized) ? normalized : "";
}

function orderStatusCountClass(status: OrderStatusTabKey) {
  if (status === "pending") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  }
  if (status === "payment_pending" || status === "payment_verification") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  }
  if (status === "confirmed" || status === "completed") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  if (status === "cancelled" || status === "rejected") {
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
    String(left.q ?? "") === String(right.q ?? "") &&
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
      row.public_id,
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

function initialRescheduleOrderValues(order: OrderRecord): RescheduleOrderFormValues {
  return {
    date: (stringValue(order.date) ?? "").slice(0, 10),
    time: normalizeRescheduleTimeValue(order.time ?? order.start_time),
    time_to: normalizeRescheduleTimeValue(order.time_to ?? order.end_time),
    reason: "",
  };
}

function normalizeRescheduleTimeValue(value: unknown) {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

function isTimeRangeIncreasing(start: string, end: string) {
  const startMinutes = timeValueToMinutes(start);
  const endMinutes = timeValueToMinutes(end);
  return startMinutes !== undefined && endMinutes !== undefined && endMinutes > startMinutes;
}

function timeValueToMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

function hasConfirmedOrderStatus(order: OrderRecord) {
  return order.status === CONFIRMED_ORDER_STATUS_CODE;
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
  const code = isRecord(caught) ? String(caught.code ?? "").toUpperCase() : "";
  if (type === "confirm" && (code === "INVALID_PRICE" || message.toUpperCase().includes("INVALID_PRICE"))) {
    return labels.totalPriceRequired;
  }
  if (type === "confirm" && (code === "VALIDATION_FAILED" || isValidationFailedMessage(message))) {
    return labels.orderExpiredConfirmBlocked;
  }
  return message || labels.actionFailed;
}

function resolveRescheduleErrorMessage(caught: unknown, labels: OrderLabels) {
  const message = caught instanceof Error ? caught.message : "";
  const errorDetails = isRecord(caught) ? toDisplay(caught.errors) : "";
  const errorCode = isRecord(caught) ? toDisplay(caught.code) : "";
  const searchable = `${errorCode} ${message} ${errorDetails}`.toUpperCase();
  if (searchable.includes("ORDER_NOT_CONFIRMED")) return labels.rescheduleOrderNotConfirmed;
  if (searchable.includes("TIME_TO_REQUIRED")) return labels.rescheduleTimeToRequired;
  if (searchable.includes("TIME_CONFLICT")) return labels.rescheduleTimeConflict;
  return message || labels.rescheduleFailed;
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

function partialPaymentDialogMessage(payment: OrderPaymentRecord, labels: OrderLabels) {
  const paidAmount = formatMoneyWithCurrency(payment.paid_amount, labels.locale) || undefined;
  const expectedAmount = formatMoneyWithCurrency(payment.amount, labels.locale) || labels.priceNotSet;
  return labels.partialPaymentDialogMessage(paidAmount, expectedAmount);
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

type MapCoordinates = {
  latitude: number;
  longitude: number;
};

function getYandexMapUrl(order: OrderRecord) {
  const lat = coordinateNumber(order.lat);
  const lon = coordinateNumber(order.lon) ?? coordinateNumber(order.lng) ?? coordinateNumber(order.long);
  const coordinates = getValidMapCoordinates(lat, lon);
  return coordinates ? getYandexMapUrlFromCoordinates(coordinates) : undefined;
}

function getValidMapCoordinates(latitudeValue: unknown, longitudeValue: unknown): MapCoordinates | undefined {
  const latitude = coordinateInputNumber(latitudeValue);
  const longitude = coordinateInputNumber(longitudeValue);
  if (latitude === undefined || longitude === undefined) return undefined;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;
  return { latitude, longitude };
}

function coordinateInputNumber(value: unknown) {
  if (typeof value === "string") return parseCoordinateInput(value);
  return coordinateNumber(value);
}

function getCoordinateFieldError(value: string, min: number, max: number, message: string) {
  if (!value.trim()) return undefined;
  const coordinate = coordinateInputNumber(value);
  return coordinate === undefined || coordinate < min || coordinate > max ? message : undefined;
}

function getYandexMapQuery(coordinates: MapCoordinates) {
  const point = `${coordinates.longitude},${coordinates.latitude}`;
  const params = new URLSearchParams({
    ll: point,
    pt: `${point},pm2rdm`,
    z: "16",
  });
  return params.toString();
}

function getYandexMapUrlFromCoordinates(coordinates: MapCoordinates) {
  return `https://yandex.uz/maps/?${getYandexMapQuery(coordinates)}`;
}

function getYandexStaticMapUrl(coordinates: MapCoordinates) {
  const point = `${coordinates.longitude},${coordinates.latitude}`;
  const params = new URLSearchParams({
    ll: point,
    z: "16",
    size: "650,330",
    l: "map",
    pt: `${point},pm2rdm`,
  });
  return `https://static-maps.yandex.ru/1.x/?${params.toString()}`;
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
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
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
    q: searchParams?.get("q")?.trim() ?? "",
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
  const notification = (key: Parameters<typeof getDashboardNotification>[0]) =>
    getDashboardNotification(key, locale);
  const orderStatus = (value: number) => getDashboardStatus("order", value, locale).label;
  const paymentStatus = (value: number) => getDashboardStatus("payment", value, locale).label;
  const paymentRecordStatus = (value: string) => getDashboardStatus("payment_record", value, locale).label;

  if (locale === "ru") {
    return {
      locale,
      actionFailed: "Не удалось выполнить действие",
      autoCompleted: "Завершено автоматически",
      systemActor: "Система",
      contractTitle: "Договор",
      contractMissing: "Для этого заказа договор еще не создан.",
      contractSigned: "Подписано",
      contractWaiting: "Ожидает подписи",
      contractFileActions: { view: "Открыть PDF", download: "Скачать PDF", failed: "Не удалось загрузить PDF" },
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
      cancelledToast: notification("orderCancelled"),
      clientColumn: "Клиент",
      clientEmail: "Email клиента",
      clientPhone: "Телефон клиента",
      close: "Закрыть",
      completeAction: "Завершить",
      completeActionDescription: "Подтвержденный → Завершенный. Используется после выполнения заказа.",
      completeDialogMessage: "Подтвердить отметку заказа как завершенного?",
      completeDialogTitle: "Завершение заказа",
      completedToast: notification("orderCompleted"),
      contactAction: "Контакты",
      confirmAction: "Подтвердить",
      confirmActionDescription: "Ожидает → Ожидает оплаты. Клиенту открывается авансовая оплата.",
      confirmDialogMessage: "Перевести заказ в ожидание оплаты?",
      confirmDialogTitle: "Подтверждение заказа",
      confirmedToast: notification("orderPaymentPending"),
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
      latitudeInvalid: "Широта должна быть числом от -90 до 90.",
      lifecycleCompleted: "Заказ завершен",
      lifecycleConfirmed: "Заказ подтвержден",
      lifecycleCreated: "Заказ создан",
      lifecyclePaid: "Оплата получена",
      lifecyclePaymentSubmitted: "Платеж отправлен",
      lifecyclePaymentVerified: "Платеж подтвержден",
      lifecyclePaymentRejected: "Платеж отклонен",
      loadFailed: "Не удалось загрузить заказы",
      longitudeLabel: "Долгота",
      longitudeInvalid: "Долгота должна быть числом от -180 до 180.",
      mainInfoTitle: "Основная информация",
      mapLabel: "Карта",
      mapCoordinatesRequired: "Укажите корректные широту и долготу, чтобы увидеть точку на карте.",
      mapPreviewReadonly: "Карта доступна только для просмотра. Положение метки меняется через поля координат.",
      mapPreviewTitle: "Предпросмотр на Яндекс Картах",
      groupSizeLabel: "Количество гостей",
      month: "30 дней",
      newest: "Новые",
      noteLabel: "Комментарий",
      notePlaceholder: "Введите комментарий...",
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
      paymentPaid: paymentStatus(20),
      paymentPending: paymentStatus(10),
      paymentRefunded: paymentStatus(30),
      paymentReceiptLabel: "Чек",
      paymentRecordStatuses: {
        pending: paymentRecordStatus("pending"),
        verified: paymentRecordStatus("verified"),
        rejected: paymentRecordStatus("rejected"),
      },
      paymentsDescription: "Аванс, срок оплаты и чеки клиента.",
      paymentsTitle: "Платежи",
      paymentStatusLabel: "Статус оплаты",
      paymentRejectedToast: notification("paymentRejected"),
      paymentVerifiedToast: notification("paymentVerified"),
      partialPaymentConfirmAction: "Всё равно подтвердить",
      partialPaymentDialogMessage: (paidAmount: string | undefined, expectedAmount: string) => paidAmount
        ? `Клиент оплатил ${paidAmount}, ожидаемая сумма — ${expectedAmount}. Всё равно подтвердить платеж?`
        : `Клиент не указал оплаченную сумму, ожидаемая сумма — ${expectedAmount}. Всё равно подтвердить платеж?`,
      partialPaymentDialogTitle: "Неполная оплата",
      pendingPaymentNotFound: "Ожидающий проверки чек не найден",
      priceLabel: "Цена",
      priceNotSet: "Цена не указана",
      totalPriceRequired: "Укажите стоимость заказа больше нуля.",
      processing: "Выполняется...",
      reasonLabel: "Причина",
      rejectPaymentAction: "Отклонить платеж",
      rejectPaymentDialogTitle: "Отклонить платеж",
      regionLabel: "Регион",
      requiredField: "Обязательное поле",
      rescheduleAction: "Изменить время",
      rescheduleActionDescription: "Изменить дату или время заказа.",
      rescheduleEndTimeAfterStart: "Время окончания должно быть позже времени начала.",
      rescheduleFailed: "Не удалось перенести заказ",
      rescheduleModalTitle: "Перенос заказа",
      rescheduleOrderNotConfirmed: "Перенести можно только подтвержденный оплаченный заказ.",
      rescheduledToast: notification("orderRescheduled"),
      rescheduleTimeConflict: "Артист занят в выбранное время. Выберите другое время.",
      rescheduleTimeToRequired: "Укажите время окончания заказа.",
      reset: "Сбросить",
      saveAction: "Сохранить",
      searchPlaceholder: "Поиск...",
      serviceColumn: "Услуга",
      startTime: "Начало",
      statusColumn: "Статус",
      statusTabsLabel: "Статусы заказов",
      statusTabsPrevious: "Предыдущие статусы",
      statusTabsNext: "Следующие статусы",
      ordersTableRegionLabel: "Таблица заказов. Для просмотра скрытых столбцов используйте горизонтальную прокрутку.",
      statusTabs: {
        all: "Все",
        pending: orderStatus(10),
        payment_pending: orderStatus(20),
        payment_verification: orderStatus(25),
        confirmed: orderStatus(30),
        rejected: orderStatus(35),
        completed: orderStatus(50),
        cancelled: orderStatus(40),
        unknown: "Неизвестно",
      },
      subServiceLabel: "Подуслуга",
      technicalTab: "Техническое",
      timeLabel: "Время",
      title: "Заказы",
      today: "Сегодня",
      updatedAtLabel: "Обновлен",
      updatedToast: notification("orderUpdated"),
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
    autoCompleted: "Avtomatik yakunlandi",
    systemActor: "Tizim",
    contractTitle: "Shartnoma",
    contractMissing: "Bu buyurtma uchun shartnoma hali yaratilmagan.",
    contractSigned: "Imzolangan",
    contractWaiting: "Imzo kutilmoqda",
    contractFileActions: { view: "PDF ko‘rish", download: "PDF yuklab olish", failed: "PDF yuklanmadi" },
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
    cancelledToast: notification("orderCancelled"),
    clientColumn: "Mijoz",
    clientEmail: "Mijoz email",
    clientPhone: "Mijoz telefoni",
    close: "Yopish",
    completeAction: "Yakunlash",
    completeActionDescription: "Tasdiqlangan → Yakunlangan. Ish bajarilganidan keyin bosiladi.",
    completeDialogMessage: "Buyurtma yakunlandi deb belgilashni tasdiqlaysizmi?",
    completeDialogTitle: "Buyurtmani yakunlash",
    completedToast: notification("orderCompleted"),
    contactAction: "Aloqa",
    confirmAction: "Tasdiqlash",
    confirmActionDescription: "Kutilmoqda → To'lov kutilmoqda. Mijozga avans to'lovi ochiladi.",
    confirmDialogMessage: "Buyurtmani to'lov kutilmoqda holatiga o'tkazasizmi?",
    confirmDialogTitle: "Buyurtmani tasdiqlash",
    confirmedToast: notification("orderPaymentPending"),
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
    latitudeInvalid: "Kenglik -90 dan 90 gacha bo'lgan son bo'lishi kerak.",
    lifecycleCompleted: "Buyurtma yakunlandi",
    lifecycleConfirmed: "Buyurtma tasdiqlandi",
    lifecycleCreated: "Buyurtma yaratildi",
    lifecyclePaid: "To'lov to'landi",
    lifecyclePaymentSubmitted: "To'lov yuborildi",
    lifecyclePaymentVerified: "To'lov tasdiqlandi",
    lifecyclePaymentRejected: "To'lov rad etildi",
    loadFailed: "Buyurtmalar yuklanmadi",
    longitudeLabel: "Uzunlik",
    longitudeInvalid: "Uzunlik -180 dan 180 gacha bo'lgan son bo'lishi kerak.",
    mainInfoTitle: "Asosiy ma'lumotlar",
    mapLabel: "Xarita",
    mapCoordinatesRequired: "Xaritada nuqtani ko'rish uchun to'g'ri kenglik va uzunlik kiriting.",
    mapPreviewReadonly: "Xarita faqat ko'rish uchun. Marker joyi koordinata maydonlari orqali o'zgaradi.",
    mapPreviewTitle: "Yandex xarita ko'rinishi",
    groupSizeLabel: "Mehmonlar soni",
    month: "30 kun",
    newest: "Yangilari",
    noteLabel: "Izoh",
    notePlaceholder: "Izoh yozing...",
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
    paymentPaid: paymentStatus(20),
    paymentPending: paymentStatus(10),
    paymentRefunded: paymentStatus(30),
    paymentReceiptLabel: "Chek",
    paymentRecordStatuses: {
      pending: paymentRecordStatus("pending"),
      verified: paymentRecordStatus("verified"),
      rejected: paymentRecordStatus("rejected"),
    },
    paymentsDescription: "Avans, to'lov muddati va mijoz yuklagan cheklar.",
    paymentsTitle: "To'lovlar",
    paymentStatusLabel: "To'lov holati",
    paymentRejectedToast: notification("paymentRejected"),
    paymentVerifiedToast: notification("paymentVerified"),
    partialPaymentConfirmAction: "Baribir tasdiqlash",
    partialPaymentDialogMessage: (paidAmount: string | undefined, expectedAmount: string) => paidAmount
      ? `Mijoz ${paidAmount} to'lagan, kutilgan summa — ${expectedAmount}. Baribir to'lovni tasdiqlaysizmi?`
      : `Mijoz to'lagan summani ko'rsatmagan, kutilgan summa — ${expectedAmount}. Baribir to'lovni tasdiqlaysizmi?`,
    partialPaymentDialogTitle: "Kam to'langan chek",
    pendingPaymentNotFound: "Tekshiruvdagi chek topilmadi",
    priceLabel: "Narx",
    priceNotSet: "Narx belgilanmagan",
    totalPriceRequired: "Buyurtma narxini noldan katta qilib kiriting.",
    processing: "Bajarilmoqda...",
    reasonLabel: "Sabab",
    rejectPaymentAction: "To'lovni rad etish",
    rejectPaymentDialogTitle: "To'lovni rad etish",
    regionLabel: "Hudud",
    requiredField: "Majburiy maydon",
    rescheduleAction: "Vaqtni o'zgartirish",
    rescheduleActionDescription: "Buyurtma sanasi yoki vaqtini almashtirish.",
    rescheduleEndTimeAfterStart: "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak.",
    rescheduleFailed: "Qayta belgilash bajarilmadi",
    rescheduleModalTitle: "Buyurtmani qayta belgilash",
    rescheduleOrderNotConfirmed: "Faqat to'lovi tasdiqlangan buyurtma vaqtini o'zgartirish mumkin.",
    rescheduledToast: notification("orderRescheduled"),
    rescheduleTimeConflict: "Tanlangan vaqtda san'atkor band. Boshqa vaqtni tanlang.",
    rescheduleTimeToRequired: "Buyurtmaning tugash vaqtini kiriting.",
    reset: "Tozalash",
    saveAction: "Saqlash",
    searchPlaceholder: "Qidirish...",
    serviceColumn: "Xizmat",
    startTime: "Boshlanish",
    statusColumn: "Holat",
    statusTabsLabel: "Buyurtma holatlari",
    statusTabsPrevious: "Oldingi holatlar",
    statusTabsNext: "Keyingi holatlar",
    ordersTableRegionLabel: "Buyurtmalar jadvali. Yashirin ustunlarni ko'rish uchun gorizontal aylantiring.",
    statusTabs: {
      all: "Barchasi",
      pending: orderStatus(10),
      payment_pending: orderStatus(20),
      payment_verification: orderStatus(25),
      confirmed: orderStatus(30),
      rejected: orderStatus(35),
      completed: orderStatus(50),
      cancelled: orderStatus(40),
      unknown: "Noma’lum",
    },
    subServiceLabel: "Sub xizmat",
    technicalTab: "Texnik",
    timeLabel: "Vaqt",
    title: "Buyurtmalar",
    today: "Bugun",
    updatedAtLabel: "Yangilangan",
    updatedToast: notification("orderUpdated"),
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
