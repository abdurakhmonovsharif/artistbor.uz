"use client";

import { CheckCircle2, Eye, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBookingDate,
  formatBookingTimeRange,
  formatUnixDateTime,
} from "@/lib/order-format";
import type { OrderUiStatus } from "@/lib/order-status";

export function StatusBadge({ status }: { status: OrderUiStatus }) {
  const toneClass: Record<OrderUiStatus["tone"], string> = {
    amber: "border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    emerald: "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
    blue: "border-blue-400/35 bg-blue-400/10 text-blue-700 dark:text-blue-300",
    violet: "border-violet-400/35 bg-violet-400/10 text-violet-700 dark:text-violet-300",
    red: "border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-300",
    slate: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
    neutral: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black leading-none",
        toneClass[status.tone],
      )}
    >
      {status.label}
    </span>
  );
}

export function EntityName({
  primary,
  secondary,
  fallback,
}: {
  primary?: string;
  secondary?: string;
  fallback: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
        {primary || fallback}
      </p>
      {secondary ? (
        <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}

export function MoneyText({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-xs font-semibold text-slate-400">Narx belgilanmagan</span>;
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return <span className="text-xs font-semibold text-slate-400">Narx belgilanmagan</span>;
  }

  return (
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
      {new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(amount)}{" so'm"}
    </span>
  );
}

export function DateTimeCell({
  date,
  time,
  timeTo,
}: {
  date: unknown;
  time: unknown;
  timeTo: unknown;
}) {
  const timeRange = formatBookingTimeRange(time, timeTo);

  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap text-sm font-black text-slate-900 dark:text-white">
        {formatBookingDate(date)}
      </p>
      <p className="mt-1 whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
        {timeRange.primary}
      </p>
      {timeRange.secondary ? (
        <p className="mt-1 text-[11px] font-semibold text-slate-400">{timeRange.secondary}</p>
      ) : null}
    </div>
  );
}

export function LocationCell({
  region,
  district,
  address,
  comment,
  regionFallback,
  districtFallback,
}: {
  region?: string;
  district?: string;
  address?: string | null;
  comment?: string | null;
  regionFallback?: string;
  districtFallback?: string;
}) {
  const note = address || comment;

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
        {region || "Location not set"}
      </p>
      {district ? (
        <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
          {district}
        </p>
      ) : districtFallback ? (
        <p className="mt-1 text-[11px] font-semibold text-slate-400">{districtFallback}</p>
      ) : null}
      {note ? <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">{note}</p> : null}
      {!region && regionFallback ? (
        <p className="mt-1 text-[11px] font-semibold text-slate-400">{regionFallback}</p>
      ) : null}
    </div>
  );
}

export function BookingCell({
  id,
  createdAt,
}: {
  id: unknown;
  createdAt: unknown;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-black text-slate-950 dark:text-white">
        #{formatBookingId(id)}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {formatUnixDateTime(createdAt)}
      </p>
    </div>
  );
}

export function ActionsCell({
  primaryLabel,
  onPrimary,
  onDetails,
}: {
  primaryLabel?: string;
  onPrimary?: () => void;
  onDetails: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      {primaryLabel && onPrimary ? (
        <button
          type="button"
          onClick={onPrimary}
          className="grid size-10 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
          aria-label={primaryLabel}
          title={primaryLabel}
        >
          <CheckCircle2 className="size-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDetails}
        className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
        aria-label="View details"
        title="View details"
      >
        <Eye className="size-4" />
      </button>
      <button
        type="button"
        onClick={onDetails}
        className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
        aria-label="More actions"
        title="More actions"
      >
        <MoreHorizontal className="size-4" />
      </button>
    </div>
  );
}

function formatBookingId(value: unknown) {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(id)) return "----";
  return String(id).padStart(4, "0");
}
