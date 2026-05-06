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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dashboard statistikasi yuklanmadi");
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
      setCustomError("Custom period uchun boshlanish va tugash sanasini tanlang.");
      return;
    }
    setCustomError("");
    setFilters({ period: "custom", from: customDraft.from, to: customDraft.to });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            Artistbor
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            Boshqaruv paneli
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Buyurtmalar, daromad, arizalar, izohlar va platforma faolligini real
            API statistikasi orqali kuzating.
          </p>
          {stats?.period ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <CalendarDays className="size-4 text-amber-500" />
              {toDisplay(stats.period.from)} - {toDisplay(stats.period.to)}
            </p>
          ) : null}
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950 xl:max-w-2xl">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-300/30 dark:bg-amber-500/10 dark:text-amber-300">
                <CalendarDays className="size-5" />
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
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
                  "rounded-xl px-4 py-3 text-left transition",
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
                "rounded-xl px-4 py-3 text-left transition",
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

      {loading && !stats ? <LoadingState label="Dashboard statistikasi yuklanmoqda..." /> : null}

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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              label="Faol artistlar"
              value={formatNumber(numberValue(counters?.active_artists))}
              icon={Paintbrush}
              tone="violet"
            />
            <MetricCard
              label="Kutilayotgan orderlar"
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
              label="Bugungi yangi users"
              value={formatNumber(numberValue(counters?.new_users_today))}
              icon={UserPlus}
              tone="sky"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <Panel
              title="Buyurtmalar kunlar bo'yicha"
              description="Tanlangan period ichidagi orderlar soni."
              icon={BarChart3}
            >
              <BarList
                rows={arrayOrEmpty(charts?.orders_per_day).map((row) => ({
                  label: formatDateLabel(row.date),
                  value: numberValue(row.count),
                  display: formatNumber(numberValue(row.count)),
                }))}
              />
            </Panel>

            <Panel
              title="Order statuslari"
              description="Statuslar kesimidagi orderlar ulushi."
              icon={Activity}
            >
              <StatusDistribution rows={arrayOrEmpty(charts?.orders_by_status)} />
            </Panel>

            <Panel
              title="Daromad kunlar bo'yicha"
              description="Kunlik revenue dinamikasi."
              icon={TrendingUp}
            >
              <BarList
                rows={arrayOrEmpty(charts?.revenue_per_day).map((row) => ({
                  label: formatDateLabel(row.date),
                  value: numberValue(row.amount),
                  display: formatCurrency(numberValue(row.amount)),
                }))}
              />
            </Panel>

            <Panel
              title="Operatsion navbat"
              description="Hozir e'tibor talab qiladigan counterlar."
              icon={Clock3}
            >
              <QueueList counters={counters} />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Top artistlar" description="Order va revenue bo'yicha yetakchilar." icon={Star}>
              <TopArtists artists={topArtists} />
            </Panel>
            <Panel title="Top kategoriyalar" description="Buyurtmalar soni bo'yicha." icon={Users}>
              <TopCategories categories={topCategories} />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
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
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl ring-1", toneClass)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-5 break-words text-2xl font-black text-slate-950 dark:text-white">
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
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-300/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Icon className="size-5" />
        </span>
      </div>
      {children}
    </section>
  );
}

function BarList({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  if (!rows.length) return <EmptyState title="Chart ma'lumotlari topilmadi" />;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)_92px] items-center gap-3">
          <span className="truncate text-xs font-black text-slate-500 dark:text-slate-400">
            {row.label}
          </span>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
          <span className="truncate text-right text-xs font-black text-slate-700 dark:text-slate-200">
            {row.display}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusDistribution({
  rows,
}: {
  rows: NonNullable<NonNullable<DashboardStats["charts"]>["orders_by_status"]>;
}) {
  const max = Math.max(1, ...rows.map((row) => numberValue(row.count)));

  if (!rows.length) return <EmptyState title="Status statistikasi topilmadi" />;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const count = numberValue(row.count);
        return (
          <div key={`${row.status ?? row.status_label ?? "status"}-${count}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge value={row.status_label ?? row.status} />
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
      label: "Kutilayotgan orderlar",
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
      label: "Bekor qilingan orderlar",
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
  if (!artists.length) return <EmptyState title="Top artistlar topilmadi" />;

  return (
    <div className="space-y-3">
      {artists.map((artist, index) => {
        const avatarUrl = safeHttpUrl(artist.avatar_url);
        const name = artist.full_name || `Artist #${artist.id ?? index + 1}`;
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
                {formatNumber(numberValue(artist.orders_count))} order · {formatCurrency(numberValue(artist.revenue))}
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
  if (!categories.length) return <EmptyState title="Top kategoriyalar topilmadi" />;

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
                {formatNumber(count)} order
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
            Backend qaytargan oxirgi yozuvlar.
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
        <StatusBadge value={status} />
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

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
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
