"use client";

import { Eye, Pencil } from "lucide-react";
import { getQuotaPercent } from "@/lib/artist-quota";
import type { ArtistQuotaLabels, ArtistQuotaRow } from "./types";

export function ArtistQuotaTable({
  canEdit,
  labels,
  rows,
  onOpen,
}: {
  canEdit: boolean;
  labels: ArtistQuotaLabels;
  rows: ArtistQuotaRow[];
  onOpen: (row: ArtistQuotaRow) => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[18px] border border-artistbor-border bg-artistbor-surface px-6 py-14 text-center shadow-[var(--artistbor-surface-shadow)]">
        <p className="text-sm font-semibold text-artistbor-primary">{labels.noArtists}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]">
      <div
        className="admin-table-scroll artistbor-artists-data-table overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-artistbor-accent"
        role="region"
        tabIndex={0}
        aria-label={labels.total}
      >
        <table className="min-w-full w-full table-fixed border-separate border-spacing-0" aria-label={labels.total}>
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[280px]" />
            <col className="w-[170px]" />
            <col className="w-[260px]" />
            <col className="w-[150px]" />
            <col className="w-28" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="h-11 bg-[#f8fafc] dark:bg-white/[0.03]">
              <QuotaTableHead label={labels.id} />
              <QuotaTableHead label={labels.total} />
              <QuotaTableHead label={labels.limit} />
              <QuotaTableHead label={labels.used} />
              <QuotaTableHead label={labels.enforced} />
              <QuotaTableHead label={labels.allTime} />
              <QuotaTableHead align="right" label={labels.action} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <ArtistQuotaTableRow key={row.artistId} canEdit={canEdit} labels={labels} row={row} onOpen={() => onOpen(row)} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArtistQuotaTableRow({
  canEdit,
  labels,
  row,
  onOpen,
}: {
  canEdit: boolean;
  labels: ArtistQuotaLabels;
  row: ArtistQuotaRow;
  onOpen: () => void;
}) {
  const quota = row.quota;
  const percent = getQuotaPercent(quota);
  const isUnlimited = row.monthlyOrderLimit === 0 || quota?.unlimited || quota?.limit === 0;
  const rule = row.monthlyOrderLimit === null || row.monthlyOrderLimit === undefined
    ? labels.defaultLimit
    : isUnlimited
      ? labels.unlimited
      : formatCount(row.monthlyOrderLimit);
  const effectiveLimit = isUnlimited ? labels.unlimited : formatCount(quota?.limit);
  const remaining = quota?.remaining === null && isUnlimited ? labels.unlimited : formatCount(quota?.remaining);
  const showRemaining = !isUnlimited && quota?.remaining !== undefined && quota?.remaining !== null;
  const enforcement = quota?.enforced === true ? labels.enforcedActive : quota?.enforced === false ? labels.countingOnly : "—";

  return (
    <tr className="group h-16 transition hover:bg-[#fffaf3] dark:hover:bg-amber-500/[0.04]">
      <td className="whitespace-nowrap border-b border-[#edf2f7] px-3 py-[9px] align-middle text-[13px] font-semibold text-[#64748b] dark:border-white/10 dark:text-slate-400">
        {row.publicId ?? row.artistId}
      </td>
      <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">{row.name}</p>
          <p className="mt-0.5 truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">{row.phone ?? row.status ?? "—"}</p>
        </div>
      </td>
      <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
        <p className="text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">{rule}</p>
        {row.monthlyOrderLimit === null || row.monthlyOrderLimit === undefined ? <p className="mt-0.5 text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">{effectiveLimit}</p> : null}
      </td>
      <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-[#0f172a] dark:text-white">{formatCount(quota?.used)}</span>
          <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">/ {effectiveLimit}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            {percent !== null ? <span className={progressClass(percent)} style={{ width: `${Math.min(percent, 100)}%` }} /> : null}
          </span>
          {showRemaining ? <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">{labels.remaining}: {remaining}</span> : null}
        </div>
      </td>
      <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
        <span className={quota?.enforced === true ? "inline-flex h-6 items-center rounded-full bg-emerald-50 px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em] text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" : quota?.enforced === false ? "inline-flex h-6 items-center rounded-full bg-amber-50 px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em] text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20" : "text-[13px] font-semibold text-[#94a3b8]"}>{enforcement}</span>
      </td>
      <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle text-[13px] font-semibold text-[#0f172a] dark:border-white/10 dark:text-white">
        {formatCount(quota?.totalAllTime)}
      </td>
      <td className="border-b border-[#edf2f7] px-3 py-[9px] align-middle dark:border-white/10">
        <div className="flex justify-end">
          <QuotaTableActionButton label={canEdit ? labels.edit : labels.view} onClick={onOpen}>
            {canEdit ? <Pencil className="size-4" /> : <Eye className="size-4" />}
          </QuotaTableActionButton>
        </div>
      </td>
    </tr>
  );
}

function QuotaTableHead({ align = "left", label }: { align?: "left" | "right"; label: string }) {
  return <th className={`border-b border-[#e6ebf2] px-3 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400 ${align === "right" ? "text-right" : "text-left"}`}>{label}</th>;
}

function QuotaTableActionButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className="grid size-8 place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]">{children}</button>;
}

function progressClass(percent: number) {
  const color = percent >= 100 ? "bg-rose-500" : percent >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return `block h-full rounded-full ${color}`;
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? new Intl.NumberFormat("uz-UZ").format(value) : "—";
}
