"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Select } from "antd";
import type { ColumnConfig, LineConfig, PieConfig } from "@ant-design/charts";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  MessageSquare,
  PackageCheck,
  RefreshCcw,
  Star,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  dashboardApi,
  type DashboardPeriod,
  type DashboardStats,
  type DashboardStatsFilters,
} from "@/lib/api/admin-content";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cn, toDisplay } from "@/lib/utils";
import { useTheme } from "@/lib/theme/theme-provider";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/translations";

const AntColumn = dynamic(
  () => import("@ant-design/charts").then((mod) => mod.Column),
  { ssr: false, loading: () => <ChartSkeleton /> },
) as ComponentType<ColumnConfig>;

const AntLine = dynamic(
  () => import("@ant-design/charts").then((mod) => mod.Line),
  { ssr: false, loading: () => <ChartSkeleton /> },
) as ComponentType<LineConfig>;

const AntPie = dynamic(
  () => import("@ant-design/charts").then((mod) => mod.Pie),
  { ssr: false, loading: () => <ChartSkeleton /> },
) as ComponentType<PieConfig>;

const defaultFilters: DashboardStatsFilters = { period: "month" };
const { RangePicker } = DatePicker;

export default function AdminHome() {
  const { locale } = useI18n();
  const labels = useMemo(() => getDashboardLabels(locale), [locale]);
  const periodOptions = useMemo(() => getDashboardPeriodOptions(labels), [labels]);
  const [filters, setFilters] = useState<DashboardStatsFilters>(defaultFilters);
  const [customOpen, setCustomOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (nextFilters: DashboardStatsFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardApi.stats(nextFilters);
      setStats(result);
    } catch {
      setError(labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [labels.loadFailed]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void fetchStats(filters);
    });

    return () => {
      active = false;
    };
  }, [fetchStats, filters]);

  const counters = stats?.counters;
  const charts = stats?.charts;
  const topArtists = useMemo(() => arrayOrEmpty(stats?.top_artists), [stats]);
  const topCategories = useMemo(() => arrayOrEmpty(stats?.top_categories), [stats]);
  const orderChartRows = useMemo(
    () =>
      arrayOrEmpty(charts?.orders_per_day).map((row) => ({
        label: formatDateLabel(row.date),
        value: numberValue(row.count),
        display: formatNumber(numberValue(row.count), locale),
      })),
    [charts, locale],
  );
  const revenueChartRows = useMemo(
    () =>
      arrayOrEmpty(charts?.revenue_per_day).map((row) => ({
        label: formatDateLabel(row.date),
        value: numberValue(row.amount),
        display: formatCurrency(numberValue(row.amount), locale),
      })),
    [charts, locale],
  );
  const statusChartRows = useMemo(
    () =>
      arrayOrEmpty(charts?.orders_by_status).map((row) => {
        const value = numberValue(row.count);
        return {
          label: dashboardStatusLabel(row.status_label ?? row.status, labels),
          value,
          display: formatNumber(value, locale),
        };
      }),
    [charts, labels, locale],
  );
  const categoryChartRows = useMemo(
    () =>
      topCategories.slice(0, 8).map((category, index) => {
        const value = numberValue(category.orders_count);
        return {
          label: category.name || `${labels.categoryFallback} #${category.id ?? index + 1}`,
          value,
          display: `${formatNumber(value, locale)} ${labels.ordersUnit}`,
        };
      }),
    [topCategories, labels, locale],
  );

  const handlePeriodSelect = (period: DashboardPeriod) => {
    if (period === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    setFilters({ period });
  };

  const handleRangeChange = (dates: unknown) => {
    const [from, to] = Array.isArray(dates) ? dates : [];
    const fromValue = pickerDateToApi(from);
    const toValue = pickerDateToApi(to);

    if (!fromValue || !toValue) return;
    setFilters({ period: "custom", from: fromValue, to: toValue });
  };

  return (
    <section className="space-y-6 pb-8">
      <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
              Artistbor
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              {labels.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              {labels.description}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:max-w-[620px] xl:items-end">
            {stats?.period ? (
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                <CalendarDays className="size-4 text-amber-500" />
                {toDisplay(stats.period.from)} - {toDisplay(stats.period.to)}
              </p>
            ) : null}

            <div className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-2 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row xl:w-auto">
              <Select
                value={customOpen ? "custom" : filters.period}
                onChange={(value) => handlePeriodSelect(value as DashboardPeriod)}
                options={[
                  ...periodOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                  })),
                  { label: labels.customRange, value: "custom" },
                ]}
                className="!h-11 w-full sm:!w-44"
                aria-label={labels.periodAria}
              />
              {customOpen ? (
                <RangePicker
                  format="DD.MM.YYYY"
                  onChange={handleRangeChange}
                  className="!h-11 w-full !rounded-xl sm:!w-64"
                  placeholder={[labels.rangeStart, labels.rangeEnd]}
                  aria-label={labels.customRange}
                />
              ) : null}
              <Button
                type="default"
                onClick={() => void fetchStats(filters)}
                disabled={loading}
                icon={<RefreshCcw className={cn("size-4", loading && stats ? "animate-spin" : "")} />}
                className="!h-11 !rounded-xl !border-slate-200 !px-4 !font-black dark:!border-white/10"
                aria-label={labels.refreshAria}
              >
                {labels.refresh}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {loading && !stats ? <LoadingState label={labels.loading} /> : null}

      {error && !stats ? (
        <div className="space-y-4">
          <ErrorState message={error} />
          <button
            type="button"
            onClick={() => void fetchStats(filters)}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-500 hover:text-slate-950 dark:bg-white dark:text-slate-950"
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      {stats ? (
        <>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label={labels.totalOrders}
              value={formatNumber(numberValue(counters?.total_orders), locale)}
              icon={PackageCheck}
              tone="sky"
              href="/admin/orders"
            />
            <MetricCard
              label={labels.totalRevenue}
              value={formatCurrency(numberValue(counters?.total_revenue), locale)}
              icon={TrendingUp}
              tone="emerald"
              href="/admin/orders"
            />
            <MetricCard
              label={labels.pendingApplications}
              value={formatNumber(numberValue(counters?.pending_applications), locale)}
              icon={ClipboardList}
              tone="amber"
              href="/admin/applications?status=pending"
            />
            <CompactMetric
              label={labels.pendingOrders}
              value={formatNumber(numberValue(counters?.pending_orders), locale)}
              icon={Clock3}
              tone="amber"
              href="/admin/orders?status=pending"
            />
            <CompactMetric
              label={labels.paymentPending}
              value={formatNumber(numberValue(counters?.payment_pending), locale)}
              icon={CreditCard}
              tone="rose"
              href="/admin/orders?payment_status=10"
            />
            <CompactMetric
              label={labels.completed}
              value={formatNumber(numberValue(counters?.completed_orders), locale)}
              icon={CheckCircle2}
              tone="emerald"
              href="/admin/orders?status=completed"
            />
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <Panel
              title={labels.ordersByDay}
              description={labels.ordersByDayDescription}
              icon={BarChart3}
            >
              <OrdersColumnChart
                rows={orderChartRows}
                totalDisplay={formatNumber(sumChartValues(orderChartRows), locale)}
                labels={labels}
                locale={locale}
              />
            </Panel>

            <Panel
              title={labels.orderStatuses}
              description={labels.orderStatusesDescription}
              icon={Activity}
            >
              <OrderStatusDonut rows={statusChartRows} labels={labels} locale={locale} />
            </Panel>

            <Panel
              title={labels.revenueByDay}
              description={labels.revenueByDayDescription}
              icon={TrendingUp}
            >
              <RevenueLineChart
                rows={revenueChartRows}
                totalDisplay={formatCurrency(sumChartValues(revenueChartRows), locale)}
                labels={labels}
                locale={locale}
              />
            </Panel>

            <Panel
              title={labels.operationQueue}
              description={labels.operationQueueDescription}
              icon={Clock3}
            >
              <QueueList counters={counters} labels={labels} locale={locale} />
            </Panel>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
            <Panel title={labels.topArtists} description={labels.topArtistsDescription} icon={Star}>
              <TopArtists artists={topArtists} labels={labels} locale={locale} />
            </Panel>
            <Panel title={labels.topCategories} description={labels.topCategoriesDescription} icon={Users}>
              <TopCategoriesBar rows={categoryChartRows} labels={labels} locale={locale} />
            </Panel>
          </div>

        </>
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "amber" | "emerald" | "rose" | "sky" | "violet";
  href: string;
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 ring-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 ring-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
    sky: "bg-sky-50 text-sky-700 ring-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300",
    violet:
      "bg-violet-50 text-violet-700 ring-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300",
  }[tone];

  return (
    <Link
      href={href}
      className={dashboardMetricCardClass}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-xl font-black text-slate-950 dark:text-white">
          {value}
        </p>
      </div>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl ring-1 transition group-hover:scale-105", toneClass)}>
        <Icon className="size-4" />
      </span>
    </Link>
  );
}

function CompactMetric({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "amber" | "emerald" | "rose" | "sky" | "violet";
  href: string;
}) {
  const toneClass = {
    amber: "text-amber-600 dark:text-amber-300",
    emerald: "text-emerald-600 dark:text-emerald-300",
    rose: "text-rose-600 dark:text-rose-300",
    sky: "text-sky-600 dark:text-sky-300",
    violet: "text-violet-600 dark:text-violet-300",
  }[tone];

  return (
    <Link
      href={href}
      className={dashboardMetricCardClass}
    >
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{value}</p>
      </div>
      <Icon className={cn("size-5 shrink-0 transition group-hover:scale-110", toneClass)} />
    </Link>
  );
}

const dashboardMetricCardClass =
  "group flex min-h-[112px] items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-slate-950 dark:hover:border-amber-400";

function Panel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-300/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Icon className="size-3.5" />
        </span>
      </div>
      {children}
    </section>
  );
}

type ChartRow = { label: string; value: number; display: string };
type DashboardLabels = ReturnType<typeof getDashboardLabels>;

function OrdersColumnChart({
  rows,
  totalDisplay,
  labels,
  locale,
}: {
  rows: ChartRow[];
  totalDisplay: string;
  labels: DashboardLabels;
  locale: Locale;
}) {
  const chartTokens = useDashboardChartTokens();

  if (!rows.length) return <EmptyState title={labels.chartDataEmpty} />;

  const hasData = rows.some((row) => row.value > 0);
  const bandPadding = rows.length <= 1 ? 0.86 : rows.length <= 7 ? 0.72 : 0.44;
  const config: ColumnConfig = {
    data: rows,
    xField: "label",
    yField: "value",
    height: 240,
    autoFit: true,
    legend: false,
    theme: getDashboardChartTheme(chartTokens),
    scale: {
      x: { padding: bandPadding },
    },
    style: {
      fill: chartTokens.primary,
      fillOpacity: chartTokens.barOpacity,
      radiusTopLeft: 7,
      radiusTopRight: 7,
    },
    axis: {
      x: getChartAxis(chartTokens, { labelAutoHide: true, labelAutoRotate: false }),
      y: getChartAxis(chartTokens, {
        labelFormatter: (value: string | number) => formatNumber(numberValue(value), locale),
      }),
    },
    tooltip: {
      title: (datum: ChartRow) => datum.label,
      items: [
        {
          field: "value",
          name: labels.orders,
          valueFormatter: (value: string | number) => formatNumber(numberValue(value), locale),
        },
      ],
    },
  };

  return (
    <div className="space-y-3">
      <ChartSummary rows={rows} totalDisplay={totalDisplay} labels={labels} locale={locale} />
      <ChartBox empty={!hasData}>
        <AntColumn {...config} />
      </ChartBox>
    </div>
  );
}

function RevenueLineChart({
  rows,
  totalDisplay,
  labels,
  locale,
}: {
  rows: ChartRow[];
  totalDisplay: string;
  labels: DashboardLabels;
  locale: Locale;
}) {
  const chartTokens = useDashboardChartTokens();

  if (!rows.length) return <EmptyState title={labels.chartDataEmpty} />;

  const hasData = rows.some((row) => row.value > 0);
  const config: LineConfig = {
    data: rows,
    xField: "label",
    yField: "value",
    height: 240,
    autoFit: true,
    legend: false,
    theme: getDashboardChartTheme(chartTokens),
    style: {
      stroke: chartTokens.primary,
      lineWidth: 2,
    },
    point: {
      sizeField: 3,
      shapeField: "circle",
      style: {
        fill: chartTokens.chartSurface,
        stroke: chartTokens.primary,
        lineWidth: 2,
      },
    },
    axis: {
      x: getChartAxis(chartTokens, { labelAutoHide: true, labelAutoRotate: false }),
      y: getChartAxis(chartTokens, {
        labelFormatter: (value: string | number) => formatCompactCurrency(numberValue(value), locale, labels),
      }),
    },
    tooltip: {
      title: (datum: ChartRow) => datum.label,
      items: [
        {
          field: "value",
          name: labels.revenue,
          valueFormatter: (value: string | number) => formatCurrency(numberValue(value), locale),
        },
      ],
    },
  };

  return (
    <div className="space-y-3">
      <ChartSummary rows={rows} totalDisplay={totalDisplay} labels={labels} locale={locale} />
      <ChartBox empty={!hasData}>
        <AntLine {...config} />
      </ChartBox>
    </div>
  );
}

function OrderStatusDonut({
  rows,
  labels,
  locale,
}: {
  rows: ChartRow[];
  labels: DashboardLabels;
  locale: Locale;
}) {
  const chartTokens = useDashboardChartTokens();

  if (!rows.length) return <EmptyState title={labels.statusDataEmpty} />;

  const hasData = rows.some((row) => row.value > 0);
  const config: PieConfig = {
    data: rows,
    angleField: "value",
    colorField: "label",
    height: 240,
    innerRadius: 0.68,
    theme: getDashboardChartTheme(chartTokens),
    scale: {
      color: { range: ["#f59e0b", "#fbbf24", "#d97706", "#fcd34d", "#b45309", "#fef3c7"] },
    },
    label: false,
    legend: {
      color: {
        position: "bottom",
        itemLabelFill: chartTokens.label,
        itemLabelFontWeight: 700,
        layout: { justifyContent: "center" },
      },
    },
    tooltip: {
      title: (datum: ChartRow) => datum.label,
      items: [
        {
          field: "value",
          name: labels.count,
          valueFormatter: (value: string | number) => formatNumber(numberValue(value), locale),
        },
      ],
    },
  };

  return (
    <div className="space-y-4">
      <ChartBox empty={!hasData}>
        <AntPie {...config} />
      </ChartBox>
      <div className="grid gap-2">
        {rows.map((row) => (
          <div
            key={`${row.label}-${row.value}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10"
          >
            <StatusBadge value={row.label} />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">
              {row.display}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopCategoriesBar({
  rows,
  labels,
  locale,
}: {
  rows: ChartRow[];
  labels: DashboardLabels;
  locale: Locale;
}) {
  const chartTokens = useDashboardChartTokens();

  if (!rows.length) return <EmptyState title={labels.topCategoriesEmpty} />;

  const hasData = rows.some((row) => row.value > 0);
  const bandPadding = rows.length <= 1 ? 0.86 : rows.length <= 4 ? 0.72 : 0.48;
  const config: ColumnConfig = {
    data: rows,
    xField: "label",
    yField: "value",
    height: 240,
    autoFit: true,
    legend: false,
    theme: getDashboardChartTheme(chartTokens),
    scale: {
      x: { padding: bandPadding },
    },
    style: {
      fill: chartTokens.primary,
      fillOpacity: chartTokens.barOpacity,
      radiusTopLeft: 7,
      radiusTopRight: 7,
    },
    axis: {
      x: getChartAxis(chartTokens, {
        labelAutoHide: true,
        labelAutoRotate: false,
        labelFormatter: (value: string | number) => truncateLabel(String(value), 16),
      }),
      y: getChartAxis(chartTokens, {
        labelFormatter: (value: string | number) => formatNumber(numberValue(value), locale),
      }),
    },
    tooltip: {
      title: (datum: ChartRow) => datum.label,
      items: [
        {
          field: "value",
          name: labels.orders,
          valueFormatter: (value: string | number) => formatNumber(numberValue(value), locale),
        },
      ],
    },
  };

  return (
    <ChartBox empty={!hasData}>
      <AntColumn {...config} />
    </ChartBox>
  );
}

function ChartBox({ children, empty }: { children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="relative min-h-[250px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-[#0b1020]">
      {children}
      {empty ? <EmptyChartOverlay /> : null}
    </div>
  );
}

function ChartSkeleton() {
  const { locale } = useI18n();
  const labels = getDashboardLabels(locale);

  return (
    <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/10 dark:bg-white/[0.03]">
      {labels.chartLoading}
    </div>
  );
}

function ChartSummary({
  rows,
  totalDisplay,
  labels,
  locale,
}: {
  rows: ChartRow[];
  totalDisplay: string;
  labels: DashboardLabels;
  locale: Locale;
}) {
  const peak = rows.reduce<ChartRow | undefined>(
    (current, row) => (!current || row.value > current.value ? row : current),
    undefined,
  );

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{labels.summaryTotal}</p>
        <p className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-white">{totalDisplay}</p>
      </div>
      <div className="rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{labels.summaryPeak}</p>
        <p className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-white">
          {peak?.display ?? "—"}
        </p>
      </div>
      <div className="rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{labels.summaryPoints}</p>
        <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">{formatNumber(rows.length, locale)}</p>
      </div>
    </div>
  );
}

function EmptyChartOverlay() {
  const { locale } = useI18n();
  const labels = getDashboardLabels(locale);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300">
        {labels.selectedPeriodEmpty}
      </div>
    </div>
  );
}

type DashboardChartTokens = {
  primary: string;
  label: string;
  axis: string;
  grid: string;
  chartSurface: string;
  barOpacity: number;
};

function useDashboardChartTokens(): DashboardChartTokens {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return useMemo(
    () => ({
      primary: dark ? "#fbbf24" : "#f59e0b",
      label: dark ? "#cbd5e1" : "#475569",
      axis: dark ? "rgba(203, 213, 225, 0.32)" : "rgba(100, 116, 139, 0.35)",
      grid: dark ? "rgba(148, 163, 184, 0.18)" : "rgba(148, 163, 184, 0.28)",
      chartSurface: dark ? "#0b1020" : "#f8fafc",
      barOpacity: dark ? 0.92 : 0.96,
    }),
    [dark],
  );
}

function getDashboardChartTheme(tokens: DashboardChartTokens) {
  return {
    view: {
      viewFill: "transparent",
    },
    axis: {
      labelFill: tokens.label,
      labelFillOpacity: 1,
      lineStroke: tokens.axis,
      lineStrokeOpacity: 1,
      tickStroke: tokens.axis,
      tickStrokeOpacity: 1,
      gridStroke: tokens.grid,
      gridStrokeOpacity: 1,
    },
  };
}

function getChartAxis(tokens: DashboardChartTokens, overrides: Record<string, unknown> = {}) {
  return {
    labelFill: tokens.label,
    labelFillOpacity: 1,
    labelFontSize: 12,
    labelFontWeight: 600,
    lineStroke: tokens.axis,
    lineStrokeOpacity: 1,
    tickStroke: tokens.axis,
    tickStrokeOpacity: 1,
    gridStroke: tokens.grid,
    gridStrokeOpacity: 1,
    ...overrides,
  };
}

function QueueList({
  counters,
  labels,
  locale,
}: {
  counters: DashboardStats["counters"];
  labels: DashboardLabels;
  locale: Locale;
}) {
  const items = [
    {
      label: labels.pendingOrders,
      value: numberValue(counters?.pending_orders),
      icon: Clock3,
      tone: "text-amber-600 dark:text-amber-300",
    },
    {
      label: labels.paymentPending,
      value: numberValue(counters?.payment_pending),
      icon: CreditCard,
      tone: "text-rose-600 dark:text-rose-300",
    },
    {
      label: labels.pendingComments,
      value: numberValue(counters?.pending_comments),
      icon: MessageSquare,
      tone: "text-sky-600 dark:text-sky-300",
    },
    {
      label: labels.cancelledOrders,
      value: numberValue(counters?.cancelled_orders),
      icon: XCircle,
      tone: "text-slate-500 dark:text-slate-300",
    },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 px-4 py-3 dark:border-white/10"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Icon className={cn("size-5 shrink-0", item.tone)} />
              <span className="truncate text-sm font-black text-slate-700 dark:text-slate-200">
                {item.label}
              </span>
            </div>
            <span className="text-lg font-black text-slate-950 dark:text-white">
              {formatNumber(item.value, locale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopArtists({
  artists,
  labels,
  locale,
}: {
  artists: NonNullable<DashboardStats["top_artists"]>;
  labels: DashboardLabels;
  locale: Locale;
}) {
  if (!artists.length) return <EmptyState title={labels.topArtistsEmpty} />;

  return (
    <div className="space-y-3">
      {artists.map((artist, index) => {
        const avatarUrl = safeHttpUrl(artist.avatar_url);
        const name = artist.full_name || `${labels.artistFallback} #${artist.id ?? index + 1}`;
        return (
          <div
            key={artist.id ?? `${name}-${index}`}
            className="flex items-center gap-4 rounded-2xl border border-slate-100 px-4 py-3 dark:border-white/10"
          >
            <span className="w-6 text-sm font-black text-slate-400">#{index + 1}</span>
            {avatarUrl ? (
              <span
                className="size-11 shrink-0 rounded-2xl border border-slate-200 bg-cover bg-center dark:border-white/10"
                style={{ backgroundImage: `url(${avatarUrl})` }}
                aria-label={name}
              />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-sm font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">{name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                {formatNumber(numberValue(artist.orders_count), locale)} {labels.ordersUnit} · {formatCurrency(numberValue(artist.revenue), locale)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Star className="size-3.5 fill-current" />
              {formatNumber(numberValue(artist.rating), locale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function dashboardStatusLabel(value: unknown, labels: DashboardLabels) {
  if (value === null || value === undefined || value === "") return labels.unknown;
  const normalized = String(value).trim().toLowerCase().replace(/[_-]+/g, " ");
  const statusLabels: Record<string, string> = {
    active: labels.statusActive,
    inactive: labels.statusInactive,
    pending: labels.statusPending,
    "pending review": labels.statusPendingReview,
    "payment pending": labels.paymentPending,
    "awaiting payment": labels.paymentPending,
    confirmed: labels.statusConfirmed,
    approved: labels.statusConfirmed,
    accepted: labels.statusAccepted,
    "in progress": labels.statusInProgress,
    processing: labels.statusInProgress,
    completed: labels.statusCompleted,
    done: labels.statusCompleted,
    cancelled: labels.statusCancelled,
    canceled: labels.statusCancelled,
    rejected: labels.statusRejected,
    expired: labels.statusExpired,
    unknown: labels.unknown,
  };

  return statusLabels[normalized] ?? String(value);
}

function getDashboardPeriodOptions(labels: DashboardLabels): {
  label: string;
  hint: string;
  value: Exclude<DashboardPeriod, "custom">;
}[] {
  return [
    { label: labels.today, hint: labels.todayHint, value: "today" },
    { label: labels.week, hint: labels.weekHint, value: "week" },
    { label: labels.month, hint: labels.monthHint, value: "month" },
  ];
}

function getDashboardLabels(locale: Locale) {
  if (locale === "ru") {
    return {
      artistFallback: "Артист",
      cancelledOrders: "Отмененные заказы",
      categoryFallback: "Категория",
      chartDataEmpty: "Данные для графика не найдены",
      chartLoading: "Загрузка графика",
      completed: "Завершенные заказы",
      count: "Количество",
      customRange: "Диапазон дат",
      description: "Следите за состоянием платформы через ключевые метрики и диаграммы.",
      loadFailed: "Не удалось загрузить статистику. Попробуйте еще раз.",
      loading: "Загрузка статистики...",
      millionShort: "млн",
      month: "Этот месяц",
      monthHint: "30 дней",
      operationQueue: "Операционная очередь",
      operationQueueDescription: "Показатели, требующие внимания сейчас.",
      orderStatuses: "Статусы заказов",
      orderStatusesDescription: "Доля заказов по статусам.",
      orders: "Заказы",
      ordersByDay: "Заказы по дням",
      ordersByDayDescription: "Количество заказов за выбранный период.",
      ordersUnit: "заказов",
      paymentPending: "Ожидает оплаты",
      pendingApplications: "Ожидающие заявки",
      pendingComments: "Ожидающие комментарии",
      pendingOrders: "Ожидающие заказы",
      periodAria: "Период статистики",
      rangeEnd: "Конец",
      rangeStart: "Начало",
      refresh: "Обновить",
      refreshAria: "Обновить статистику",
      retry: "Повторить загрузку",
      revenue: "Доход",
      revenueByDay: "Доход по дням",
      revenueByDayDescription: "Динамика ежедневного дохода.",
      selectedPeriodEmpty: "За выбранный период данных нет",
      statusAccepted: "Принято",
      statusActive: "Активный",
      statusCancelled: "Отменено",
      statusCompleted: "Завершено",
      statusConfirmed: "Подтверждено",
      statusDataEmpty: "Статистика по статусам не найдена",
      statusExpired: "Истекло",
      statusInactive: "Неактивный",
      statusInProgress: "В процессе",
      statusPending: "Ожидает",
      statusPendingReview: "На рассмотрении",
      statusRejected: "Отклонено",
      summaryPeak: "Максимум",
      summaryPoints: "Точки",
      summaryTotal: "Итого",
      thousandShort: "тыс.",
      title: "Панель управления",
      today: "Сегодня",
      todayHint: "Текущий день",
      topArtists: "Ведущие артисты",
      topArtistsDescription: "Лидеры по заказам и доходу.",
      topArtistsEmpty: "Ведущие артисты не найдены",
      topCategories: "Ведущие категории",
      topCategoriesDescription: "По количеству заказов.",
      topCategoriesEmpty: "Ведущие категории не найдены",
      totalOrders: "Всего заказов",
      totalRevenue: "Общий доход",
      unknown: "Неизвестно",
      week: "Эта неделя",
      weekHint: "7 дней",
    };
  }

  return {
    artistFallback: "Ijodkor",
    cancelledOrders: "Bekor qilingan buyurtmalar",
    categoryFallback: "Kategoriya",
    chartDataEmpty: "Grafik ma'lumotlari topilmadi",
    chartLoading: "Grafik yuklanmoqda",
    completed: "Yakunlangan buyurtmalar",
    count: "Soni",
    customRange: "Sana oralig'i",
    description: "Platforma holatini asosiy raqamlar va diagrammalar orqali kuzating.",
    loadFailed: "Statistika yuklanmadi. Qayta urinib ko'ring.",
    loading: "Statistika yuklanmoqda...",
    millionShort: "mln",
    month: "Bu oy",
    monthHint: "30 kun",
    operationQueue: "Operatsion navbat",
    operationQueueDescription: "Hozir e'tibor talab qiladigan ko'rsatkichlar.",
    orderStatuses: "Buyurtma holatlari",
    orderStatusesDescription: "Holatlar bo'yicha buyurtmalar ulushi.",
    orders: "Buyurtmalar",
    ordersByDay: "Buyurtmalar kunlar bo'yicha",
    ordersByDayDescription: "Tanlangan davrdagi buyurtmalar soni.",
    ordersUnit: "buyurtma",
    paymentPending: "To'lov kutilmoqda",
    pendingApplications: "Kutilayotgan arizalar",
    pendingComments: "Kutilayotgan izohlar",
    pendingOrders: "Kutilayotgan buyurtmalar",
    periodAria: "Statistika davri",
    rangeEnd: "Tugash",
    rangeStart: "Boshlanish",
    refresh: "Yangilash",
    refreshAria: "Statistikani yangilash",
    retry: "Qayta yuklash",
    revenue: "Daromad",
    revenueByDay: "Daromad kunlar bo'yicha",
    revenueByDayDescription: "Kunlik daromad dinamikasi.",
    selectedPeriodEmpty: "Tanlangan davrda ma'lumot yo'q",
    statusAccepted: "Qabul qilingan",
    statusActive: "Faol",
    statusCancelled: "Bekor qilingan",
    statusCompleted: "Yakunlangan",
    statusConfirmed: "Tasdiqlangan",
    statusDataEmpty: "Holatlar statistikasi topilmadi",
    statusExpired: "Muddati o'tgan",
    statusInactive: "Nofaol",
    statusInProgress: "Jarayonda",
    statusPending: "Kutilmoqda",
    statusPendingReview: "Ko'rib chiqilmoqda",
    statusRejected: "Rad etilgan",
    summaryPeak: "Eng yuqori",
    summaryPoints: "Nuqtalar",
    summaryTotal: "Jami",
    thousandShort: "ming",
    title: "Boshqaruv paneli",
    today: "Bugun",
    todayHint: "Joriy kun",
    topArtists: "Yetakchi ijodkorlar",
    topArtistsDescription: "Buyurtma va daromad bo'yicha yetakchilar.",
    topArtistsEmpty: "Yetakchi ijodkorlar topilmadi",
    topCategories: "Yetakchi kategoriyalar",
    topCategoriesDescription: "Buyurtmalar soni bo'yicha.",
    topCategoriesEmpty: "Yetakchi kategoriyalar topilmadi",
    totalOrders: "Jami buyurtmalar",
    totalRevenue: "Jami daromad",
    unknown: "Noma'lum",
    week: "Bu hafta",
    weekHint: "7 kun",
  };
}

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function sumChartValues(rows: ChartRow[]) {
  return rows.reduce((sum, row) => sum + row.value, 0);
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function intlLocale(locale: Locale) {
  return locale === "ru" ? "ru-RU" : "uz-UZ";
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number, locale: Locale, labels: DashboardLabels) {
  if (value >= 1_000_000) {
    return `${formatNumber(Math.round(value / 1_000_000), locale)} ${labels.millionShort}`;
  }
  if (value >= 1_000) {
    return `${formatNumber(Math.round(value / 1_000), locale)} ${labels.thousandShort}`;
  }
  return formatNumber(Math.round(value), locale);
}

function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function pickerDateToApi(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const formatter = (value as { format?: (format: string) => string }).format;
  if (typeof formatter !== "function") return "";
  return formatter.call(value, "YYYY-MM-DD");
}

function formatDateLabel(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function safeHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return undefined;
  }
  return undefined;
}
