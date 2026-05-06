"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  MessageSquare,
  PackageCheck,
  Paintbrush,
  RefreshCcw,
  Star,
  TrendingUp,
  UserPlus,
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
import { cn, getValue, toDisplay } from "@/lib/utils";
import type { UnknownRecord } from "@/types/api";

const periodOptions: {
  label: string;
  hint: string;
  value: Exclude<DashboardPeriod, "custom">;
}[] = [
  { label: "Bugun", hint: "Joriy kun", value: "today" },
  { label: "Bu hafta", hint: "7 kun", value: "week" },
  { label: "Bu oy", hint: "30 kun", value: "month" },
];

const defaultFilters: DashboardStatsFilters = { period: "month" };

export default function AdminHome() {
  const [filters, setFilters] = useState<DashboardStatsFilters>(defaultFilters);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({ from: "", to: "" });
  const [customError, setCustomError] = useState("");
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
      setError("Statistika yuklanmadi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }, []);

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
  const recentOrders = useMemo(() => arrayOrEmpty(stats?.recent_orders), [stats]);
  const recentApplications = useMemo(() => arrayOrEmpty(stats?.recent_applications), [stats]);
  const orderChartRows = useMemo(
    () =>
      arrayOrEmpty(charts?.orders_per_day).map((row) => ({
        label: formatDateLabel(row.date),
        value: numberValue(row.count),
        display: formatNumber(numberValue(row.count)),
      })),
    [charts],
  );
  const revenueChartRows = useMemo(
    () =>
      arrayOrEmpty(charts?.revenue_per_day).map((row) => ({
        label: formatDateLabel(row.date),
        value: numberValue(row.amount),
        display: formatCurrency(numberValue(row.amount)),
      })),
    [charts],
  );

  const handlePeriodSelect = (period: DashboardPeriod) => {
    setCustomError("");
    if (period === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    setFilters({ period });
  };

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customDraft.from || !customDraft.to) {
      setCustomError("Sana oralig'i uchun boshlanish va tugash sanasini tanlang.");
      return;
    }
    setCustomError("");
    setFilters({ period: "custom", from: customDraft.from, to: customDraft.to });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            Artistbor
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            Boshqaruv paneli
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Buyurtmalar, daromad, arizalar, izohlar va platforma faolligini
            jonli statistik ma&apos;lumotlar orqali kuzating.
          </p>
          {stats?.period ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <CalendarDays className="size-4 text-amber-500" />
              {toDisplay(stats.period.from)} - {toDisplay(stats.period.to)}
            </p>
          ) : null}
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-slate-950 xl:max-w-2xl">
          <div className="mb-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-300/30 dark:bg-amber-500/10 dark:text-amber-300">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  Statistika davri
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Qaysi oralig&apos;dagi ma&apos;lumotlar chiqishini tanlang
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchStats(filters)}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
              aria-label="Statistikani yangilash"
            >
              <RefreshCcw className={cn("size-4", loading && stats ? "animate-spin" : "")} />
              Yangilash
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePeriodSelect(option.value)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-left transition",
                  filters.period === option.value
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white",
                )}
              >
                <span className="block text-sm font-black">{option.label}</span>
                <span className="mt-0.5 block text-xs font-semibold opacity-70">
                  {option.hint}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handlePeriodSelect("custom")}
              className={cn(
                "rounded-xl px-3 py-2.5 text-left transition",
                filters.period === "custom" || customOpen
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white",
              )}
            >
              <span className="block text-sm font-black">Sana oralig&apos;i</span>
              <span className="mt-0.5 block text-xs font-semibold opacity-70">
                Qo&apos;lda tanlash
              </span>
            </button>
          </div>

          {customOpen ? (
            <form onSubmit={handleCustomSubmit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="date"
                value={customDraft.from}
                onChange={(event) => setCustomDraft((current) => ({ ...current, from: event.target.value }))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                aria-label="Boshlanish sanasi"
              />
              <input
                type="date"
                value={customDraft.to}
                onChange={(event) => setCustomDraft((current) => ({ ...current, to: event.target.value }))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                aria-label="Tugash sanasi"
              />
              <button
                type="submit"
                className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-amber-500 hover:text-slate-950 dark:bg-white dark:text-slate-950"
              >
                Qo&apos;llash
              </button>
              {customError ? (
                <p className="text-xs font-bold text-rose-500 sm:col-span-3">{customError}</p>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      {loading && !stats ? <LoadingState label="Statistika yuklanmoqda..." /> : null}

      {error && !stats ? (
        <div className="space-y-4">
          <ErrorState message={error} />
          <button
            type="button"
            onClick={() => void fetchStats(filters)}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-500 hover:text-slate-950 dark:bg-white dark:text-slate-950"
          >
            Qayta yuklash
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Jami buyurtmalar"
              value={formatNumber(numberValue(counters?.total_orders))}
              icon={PackageCheck}
              tone="sky"
            />
            <MetricCard
              label="Jami daromad"
              value={formatCurrency(numberValue(counters?.total_revenue))}
              icon={TrendingUp}
              tone="emerald"
            />
            <MetricCard
              label="Kutilayotgan arizalar"
              value={formatNumber(numberValue(counters?.pending_applications))}
              icon={ClipboardList}
              tone="amber"
            />
            <MetricCard
              label="Faol ijodkorlar"
              value={formatNumber(numberValue(counters?.active_artists))}
              icon={Paintbrush}
              tone="violet"
            />
            <MetricCard
              label="Kutilayotgan buyurtmalar"
              value={formatNumber(numberValue(counters?.pending_orders))}
              icon={Clock3}
              tone="amber"
            />
            <MetricCard
              label="To'lov kutilmoqda"
              value={formatNumber(numberValue(counters?.payment_pending))}
              icon={CreditCard}
              tone="rose"
            />
            <MetricCard
              label="Yakunlangan"
              value={formatNumber(numberValue(counters?.completed_orders))}
              icon={CheckCircle2}
              tone="emerald"
            />
            <MetricCard
              label="Bugungi yangi foydalanuvchilar"
              value={formatNumber(numberValue(counters?.new_users_today))}
              icon={UserPlus}
              tone="sky"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <Panel
              title="Buyurtmalar kunlar bo'yicha"
              description="Tanlangan davrdagi buyurtmalar soni."
              icon={BarChart3}
            >
              <ColumnChart
                rows={orderChartRows}
                totalDisplay={formatNumber(sumChartValues(orderChartRows))}
              />
            </Panel>

            <Panel
              title="Buyurtma holatlari"
              description="Holatlar bo'yicha buyurtmalar ulushi."
              icon={Activity}
            >
              <StatusDistribution rows={arrayOrEmpty(charts?.orders_by_status)} />
            </Panel>

            <Panel
              title="Daromad kunlar bo'yicha"
              description="Kunlik daromad dinamikasi."
              icon={TrendingUp}
            >
              <LineAreaChart
                rows={revenueChartRows}
                totalDisplay={formatCurrency(sumChartValues(revenueChartRows))}
              />
            </Panel>

            <Panel
              title="Operatsion navbat"
              description="Hozir e'tibor talab qiladigan ko'rsatkichlar."
              icon={Clock3}
            >
              <QueueList counters={counters} />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Yetakchi ijodkorlar" description="Buyurtma va daromad bo'yicha yetakchilar." icon={Star}>
              <TopArtists artists={topArtists} />
            </Panel>
            <Panel title="Yetakchi kategoriyalar" description="Buyurtmalar soni bo'yicha." icon={Users}>
              <TopCategories categories={topCategories} />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <RecentList
              title="So'nggi buyurtmalar"
              href="/admin/orders"
              items={recentOrders}
              type="order"
            />
            <RecentList
              title="So'nggi arizalar"
              href="/admin/applications"
              items={recentApplications}
              type="application"
            />
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
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "amber" | "emerald" | "rose" | "sky" | "violet";
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
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl ring-1", toneClass)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 break-words text-xl font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </article>
  );
}

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

function ColumnChart({ rows, totalDisplay }: { rows: ChartRow[]; totalDisplay: string }) {
  if (!rows.length) return <EmptyState title="Grafik ma'lumotlari topilmadi" />;

  const max = Math.max(1, ...rows.map((row) => row.value));
  const hasData = rows.some((row) => row.value > 0);
  const width = 720;
  const height = 230;
  const padding = { top: 14, right: 24, bottom: 36, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const slot = plotWidth / rows.length;
  const barWidth = Math.max(7, Math.min(22, slot * 0.58));
  const labelIndexes = getChartLabelIndexes(rows.length);

  return (
    <div className="space-y-3">
      <ChartSummary rows={rows} totalDisplay={totalDisplay} />
      <div className="relative h-56 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
        <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Buyurtmalar grafigi">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + plotHeight * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-white/10"
                  strokeDasharray={ratio === 0 ? undefined : "4 6"}
                />
                <text
                  x={padding.left - 14}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-black"
                >
                  {hasData ? formatNumber(Math.ceil(max * ratio)) : "0"}
                </text>
              </g>
            );
          })}

          {rows.map((row, index) => {
            const barHeight = hasData ? (row.value / max) * plotHeight : 0;
            const x = padding.left + index * slot + (slot - barWidth) / 2;
            const y = padding.top + plotHeight - barHeight;
            return (
              <g key={`${row.label}-${index}`}>
                {barHeight > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={6}
                    className="fill-amber-400"
                  />
                ) : null}
                <title>{`${row.label}: ${row.display}`}</title>
              </g>
            );
          })}

          {labelIndexes.map((index) => {
            const row = rows[index];
            if (!row) return null;
            const x = padding.left + index * slot + slot / 2;
            return (
              <text
                key={`${row.label}-${index}`}
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-black dark:fill-slate-400"
              >
                {row.label}
              </text>
            );
          })}
        </svg>
        {!hasData ? <EmptyChartOverlay /> : null}
      </div>
    </div>
  );
}

function LineAreaChart({ rows, totalDisplay }: { rows: ChartRow[]; totalDisplay: string }) {
  if (!rows.length) return <EmptyState title="Grafik ma'lumotlari topilmadi" />;

  const max = Math.max(1, ...rows.map((row) => row.value));
  const hasData = rows.some((row) => row.value > 0);
  const width = 720;
  const height = 230;
  const padding = { top: 14, right: 24, bottom: 36, left: 66 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const baseline = padding.top + plotHeight;
  const points = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (rows.length - 1)) * plotWidth;
    const y = baseline - (row.value / max) * plotHeight;
    return { ...row, x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1]?.x ?? padding.left} ${baseline} L ${points[0]?.x ?? padding.left} ${baseline} Z`
      : "";
  const labelIndexes = getChartLabelIndexes(rows.length);

  return (
    <div className="space-y-3">
      <ChartSummary rows={rows} totalDisplay={totalDisplay} />
      <div className="relative h-56 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
        <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daromad grafigi">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + plotHeight * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-white/10"
                  strokeDasharray={ratio === 0 ? undefined : "4 6"}
                />
                <text
                  x={padding.left - 14}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-black"
                >
                  {hasData ? formatCompactCurrency(max * ratio) : "0"}
                </text>
              </g>
            );
          })}

          {areaPath ? (
            <path d={areaPath} className="fill-amber-400/15 dark:fill-amber-400/10" />
          ) : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-amber-400"
              strokeWidth="4"
            />
          ) : null}
          {hasData
            ? points.map((point, index) => (
                <circle
                  key={`${point.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  className="fill-slate-950 stroke-amber-400 dark:fill-slate-950"
                  strokeWidth="3"
                >
                  <title>{`${point.label}: ${point.display}`}</title>
                </circle>
              ))
            : null}

          {labelIndexes.map((index) => {
            const row = rows[index];
            const point = points[index];
            if (!row || !point) return null;
            return (
              <text
                key={`${row.label}-${index}`}
                x={point.x}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-black dark:fill-slate-400"
              >
                {row.label}
              </text>
            );
          })}
        </svg>
        {!hasData ? <EmptyChartOverlay /> : null}
      </div>
    </div>
  );
}

function ChartSummary({ rows, totalDisplay }: { rows: ChartRow[]; totalDisplay: string }) {
  const peak = rows.reduce<ChartRow | undefined>(
    (current, row) => (!current || row.value > current.value ? row : current),
    undefined,
  );

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Jami</p>
        <p className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-white">{totalDisplay}</p>
      </div>
      <div className="rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Eng yuqori</p>
        <p className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-white">
          {peak?.display ?? "—"}
        </p>
      </div>
      <div className="rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Nuqtalar</p>
        <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">{formatNumber(rows.length)}</p>
      </div>
    </div>
  );
}

function EmptyChartOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300">
        Tanlangan davrda ma&apos;lumot yo&apos;q
      </div>
    </div>
  );
}

function StatusDistribution({
  rows,
}: {
  rows: NonNullable<NonNullable<DashboardStats["charts"]>["orders_by_status"]>;
}) {
  const max = Math.max(1, ...rows.map((row) => numberValue(row.count)));

  if (!rows.length) return <EmptyState title="Holatlar statistikasi topilmadi" />;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const count = numberValue(row.count);
        const label = dashboardStatusLabel(row.status_label ?? row.status);
        return (
          <div key={`${row.status ?? row.status_label ?? "status"}-${count}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge value={label} />
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                {formatNumber(count)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-sky-400"
                style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QueueList({ counters }: { counters: DashboardStats["counters"] }) {
  const items = [
    {
      label: "Kutilayotgan buyurtmalar",
      value: numberValue(counters?.pending_orders),
      icon: Clock3,
      tone: "text-amber-600 dark:text-amber-300",
    },
    {
      label: "To'lov kutilmoqda",
      value: numberValue(counters?.payment_pending),
      icon: CreditCard,
      tone: "text-rose-600 dark:text-rose-300",
    },
    {
      label: "Kutilayotgan izohlar",
      value: numberValue(counters?.pending_comments),
      icon: MessageSquare,
      tone: "text-sky-600 dark:text-sky-300",
    },
    {
      label: "Bekor qilingan buyurtmalar",
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
              {formatNumber(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopArtists({
  artists,
}: {
  artists: NonNullable<DashboardStats["top_artists"]>;
}) {
  if (!artists.length) return <EmptyState title="Yetakchi ijodkorlar topilmadi" />;

  return (
    <div className="space-y-3">
      {artists.map((artist, index) => {
        const avatarUrl = safeHttpUrl(artist.avatar_url);
        const name = artist.full_name || `Ijodkor #${artist.id ?? index + 1}`;
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
                {formatNumber(numberValue(artist.orders_count))} buyurtma · {formatCurrency(numberValue(artist.revenue))}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Star className="size-3.5 fill-current" />
              {formatNumber(numberValue(artist.rating))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopCategories({
  categories,
}: {
  categories: NonNullable<DashboardStats["top_categories"]>;
}) {
  if (!categories.length) return <EmptyState title="Yetakchi kategoriyalar topilmadi" />;

  const max = Math.max(1, ...categories.map((category) => numberValue(category.orders_count)));

  return (
    <div className="space-y-4">
      {categories.map((category, index) => {
        const count = numberValue(category.orders_count);
        return (
          <div key={category.id ?? `${category.name}-${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                  {category.name || `Kategoriya #${category.id ?? index + 1}`}
                </p>
                <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  #{index + 1}
                </p>
              </div>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                {formatNumber(count)} buyurtma
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentList({
  title,
  href,
  items,
  type,
}: {
  title: string;
  href: string;
  items: UnknownRecord[];
  type: "order" | "application";
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Serverdan kelgan oxirgi yozuvlar.
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
        >
          Barchasi
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {!items.length ? (
        <EmptyState title={`${title} topilmadi`} />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 6).map((item, index) => (
            <RecentRow key={recentKey(item, index)} item={item} type={type} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecentRow({
  item,
  type,
}: {
  item: UnknownRecord;
  type: "order" | "application";
}) {
  const status = getValue(item, "status_label") ?? getValue(item, "status") ?? getValue(item, "status_code");
  const title = getRecentTitle(item, type);
  const meta = getRecentMeta(item, type);

  return (
    <div className="rounded-2xl border border-slate-100 px-4 py-3 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {meta}
          </p>
        </div>
        <StatusBadge value={dashboardStatusLabel(status)} />
      </div>
    </div>
  );
}

function getRecentTitle(item: UnknownRecord, type: "order" | "application") {
  const id = getValue(item, "id") ?? getValue(item, "order_id") ?? getValue(item, "application_id");
  if (type === "order") return id ? `Buyurtma #${id}` : "Buyurtma";

  const firstName = getValue(item, "user.first_name") ?? getValue(item, "first_name");
  const lastName = getValue(item, "user.last_name") ?? getValue(item, "last_name");
  const fullName = getValue(item, "full_name") ?? [firstName, lastName].filter(Boolean).join(" ");
  if (typeof fullName === "string" && fullName.trim()) return fullName;

  return id ? `Ariza #${id}` : "Ariza";
}

function getRecentMeta(item: UnknownRecord, type: "order" | "application") {
  const keys =
    type === "order"
      ? ["date", "start_time", "artist.full_name", "client.full_name", "total_price", "amount", "created_at"]
      : ["user.phone", "phone", "category.name_uz", "created_at", "updated_at"];

  const values = keys
    .map((key) => {
      const value = getValue(item, key);
      if (value === undefined || value === null || value === "") return "";
      if (key.includes("price") || key === "amount") return formatCurrency(numberValue(value));
      return toDisplay(value);
    })
    .filter(Boolean);

  return values.length ? values.join(" · ") : "Qo'shimcha ma'lumot yo'q";
}

function recentKey(item: UnknownRecord, index: number) {
  const id = getValue(item, "id") ?? getValue(item, "order_id") ?? getValue(item, "application_id");
  return `${id ?? "row"}-${index}`;
}

function dashboardStatusLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "Noma'lum";
  const normalized = String(value).trim().toLowerCase().replace(/[_-]+/g, " ");
  const labels: Record<string, string> = {
    active: "Faol",
    inactive: "Nofaol",
    pending: "Kutilmoqda",
    "pending review": "Ko'rib chiqilmoqda",
    "payment pending": "To'lov kutilmoqda",
    "awaiting payment": "To'lov kutilmoqda",
    confirmed: "Tasdiqlangan",
    approved: "Tasdiqlangan",
    accepted: "Qabul qilingan",
    "in progress": "Jarayonda",
    processing: "Jarayonda",
    completed: "Yakunlangan",
    done: "Yakunlangan",
    cancelled: "Bekor qilingan",
    canceled: "Bekor qilingan",
    rejected: "Rad etilgan",
    expired: "Muddati o'tgan",
    unknown: "Noma'lum",
  };

  return labels[normalized] ?? String(value);
}

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function sumChartValues(rows: ChartRow[]) {
  return rows.reduce((sum, row) => sum + row.value, 0);
}

function getChartLabelIndexes(length: number) {
  if (length <= 0) return [];
  if (length <= 5) return Array.from({ length }, (_, index) => index);
  return Array.from(new Set([0, Math.floor(length / 4), Math.floor(length / 2), Math.floor((length * 3) / 4), length - 1]));
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("uz-UZ").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `${formatNumber(Math.round(value / 1_000_000))} mln`;
  if (value >= 1_000) return `${formatNumber(Math.round(value / 1_000))} ming`;
  return formatNumber(Math.round(value));
}

function formatDateLabel(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
  }).format(date);
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
