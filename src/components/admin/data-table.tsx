"use client";

import { ArrowDownUp } from "lucide-react";
import { getValue, normalizeDate, toDisplay } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { UnknownRecord } from "@/types/api";

export type DataTableColumn<T extends object = UnknownRecord> = {
  key: string;
  label: string;
  kind?: "text" | "status" | "date" | "boolean" | "number";
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends object>({
  columns,
  rows,
  getRowKey,
  actions,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => string | number;
  actions?: (row: T) => React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
                >
                  <span className="inline-flex items-center gap-2">
                    {column.label}
                    <ArrowDownUp className="size-3 opacity-40" />
                  </span>
                </th>
              ))}
              {actions ? (
                <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Amallar
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={String(getRowKey?.(row, index) ?? index)}
                className="border-b border-slate-100 last:border-0 hover:bg-amber-50/40 dark:border-white/10 dark:hover:bg-white/[0.03]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="max-w-[300px] px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {column.render ? (
                      column.render(row)
                    ) : (
                      <Cell column={column} value={getValue(row as UnknownRecord, column.key)} />
                    )}
                  </td>
                ))}
                {actions ? <td className="px-5 py-4 text-right">{actions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell<T extends object>({
  column,
  value,
}: {
  column: DataTableColumn<T>;
  value: unknown;
}) {
  if (column.kind === "status") return <StatusBadge value={value} />;
  if (column.kind === "boolean") return <StatusBadge value={Boolean(value)} />;
  if (column.kind === "date") return <span>{normalizeDate(value)}</span>;
  return <span className="line-clamp-2">{toDisplay(value)}</span>;
}
