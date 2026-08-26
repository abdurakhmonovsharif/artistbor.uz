"use client";

import { ArrowDownUp } from "lucide-react";
import { getValue, normalizeDate, toDisplay } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { isLocationIdKey, LocationName } from "@/components/admin/location-name";
import { useI18n } from "@/lib/i18n/i18n-provider";
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
  ariaLabel,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => string | number;
  actions?: (row: T) => React.ReactNode;
  ariaLabel?: string;
}) {
  const { locale, t } = useI18n();
  const resolvedAriaLabel = ariaLabel ?? (locale === "ru" ? "Таблица данных" : "Ma’lumotlar jadvali");

  return (
    <div className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]">
      <div
        className="admin-table-scroll overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-artistbor-accent"
        role="region"
        tabIndex={0}
        aria-label={resolvedAriaLabel}
      >
        <table aria-label={resolvedAriaLabel} className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr className="h-11 bg-artistbor-surface-subtle text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border-b border-artistbor-border px-3 py-0 text-left text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-artistbor-secondary"
                >
                  <span className="inline-flex items-center gap-2">
                    {column.label}
                    <ArrowDownUp className="size-3 opacity-40" />
                  </span>
                </th>
              ))}
              {actions ? (
                <th className="border-b border-artistbor-border px-3 py-0 text-right text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-artistbor-secondary">
                  {t("common.actions")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={String(getRowKey?.(row, index) ?? index)}
                className="h-16 transition-colors duration-200 hover:bg-amber-50/60 dark:hover:bg-amber-500/[0.04]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="max-w-[300px] border-b border-artistbor-border px-3 py-[9px] align-middle text-[13px] font-normal leading-[18px] text-artistbor-primary"
                  >
                    {column.render ? (
                      column.render(row)
                    ) : (
                      <Cell column={column} value={getValue(row as UnknownRecord, column.key)} />
                    )}
                  </td>
                ))}
                {actions ? (
                  <td className="border-b border-artistbor-border px-3 py-[9px] text-right align-middle text-[13px] font-normal leading-[18px] text-artistbor-primary [&_button:not(:disabled)]:cursor-pointer">
                    {actions(row)}
                  </td>
                ) : null}
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
  if (isLocationIdKey(column.key)) {
    return (
      <span className="line-clamp-2">
        <LocationName fieldKey={column.key} value={value} fallback={toDisplay(value)} />
      </span>
    );
  }
  if (isIdentifierColumn(column.key)) {
    return <span className="whitespace-nowrap">{toDisplay(value)}</span>;
  }
  if (column.kind === "status") return <StatusBadge value={value} fieldKey={column.key} />;
  if (column.kind === "boolean") return <StatusBadge value={value} fieldKey={column.key} />;
  if (column.kind === "date") return <span>{normalizeDate(value)}</span>;
  return <span className="line-clamp-2">{toDisplay(value)}</span>;
}

function isIdentifierColumn(key: string) {
  return key === "id" || key === "public_id" || key.endsWith("_id");
}
