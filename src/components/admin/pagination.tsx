"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/api";

const defaultPageSizeOptions = [20, 50, 100];

export function Pagination({
  meta,
  page,
  pageSize,
  pageSizeOptions = defaultPageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: {
  meta?: PaginationMeta;
  page: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const limit = normalizePositiveNumber(pageSize ?? meta?.perPage ?? meta?.limit, defaultPageSizeOptions[0]);
  const currentPage = normalizePositiveNumber(meta?.currentPage ?? meta?.page ?? page, 1);
  const total = normalizeTotal(meta?.totalCount ?? meta?.total);
  const pageCount =
    normalizePositiveNumber(meta?.pageCount, 0) ||
    (total ? Math.ceil(total / limit) : undefined);

  if (!pageCount || pageCount <= 1) return null;

  return (
    <PaginationShell
      page={currentPage}
      pageCount={pageCount}
      pageSize={limit}
      pageSizeOptions={pageSizeOptions}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}

export function FallbackPagination({
  page,
  rowsCount,
  pageSize,
  pageSizeOptions = defaultPageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  rowsCount: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  if (page <= 1 && rowsCount < pageSize) return null;

  return (
    <PaginationShell
      page={page}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      rowsCount={rowsCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}

function PaginationShell({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  rowsCount,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount?: number;
  pageSize: number;
  pageSizeOptions: number[];
  rowsCount?: number;
  total?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const { t } = useI18n();
  const canGoPrevious = page > 1;
  const canGoNext = pageCount ? page < pageCount : (rowsCount ?? 0) >= pageSize;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = total
    ? Math.min(page * pageSize, total)
    : (page - 1) * pageSize + (rowsCount ?? pageSize);
  const rangeLabel = total
    ? t("pagination.rangeTotal", { from: firstItem, to: lastItem, total })
    : t("pagination.range", { from: firstItem, to: lastItem });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-[22px] border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-xl shadow-slate-950/[0.04] dark:border-slate-700/70 dark:bg-[#111827] dark:text-slate-400">
      <PaginationIconButton
        label={t("pagination.first")}
        disabled={!canGoPrevious}
        onClick={() => onPageChange(1)}
      >
        <ChevronsLeft className="size-4" />
      </PaginationIconButton>
      <PaginationIconButton
        label={t("pagination.previous")}
        disabled={!canGoPrevious}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </PaginationIconButton>

      {pageCount ? (
        <div className="flex items-center gap-1">
          {getVisiblePages(page, pageCount).map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "grid size-9 place-items-center rounded-full text-sm font-black transition",
                pageNumber === page
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20 dark:bg-teal-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white",
              )}
              aria-current={pageNumber === page ? "page" : undefined}
            >
              {pageNumber}
            </button>
          ))}
        </div>
      ) : (
        <span className="grid size-9 place-items-center rounded-full bg-teal-600 text-sm font-black text-white shadow-lg shadow-teal-600/20 dark:bg-teal-700">
          {page}
        </span>
      )}

      <PaginationIconButton
        label={t("pagination.next")}
        disabled={!canGoNext}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </PaginationIconButton>
      <PaginationIconButton
        label={t("pagination.last")}
        disabled={!pageCount || !canGoNext}
        onClick={() => pageCount && onPageChange(pageCount)}
      >
        <ChevronsRight className="size-4" />
      </PaginationIconButton>

      <span className="mx-1 whitespace-nowrap text-slate-500 dark:text-slate-400">
        {rangeLabel}
      </span>

      {onPageSizeChange ? (
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition hover:border-slate-300 focus:border-teal-500 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-100 dark:hover:border-slate-500"
          aria-label={t("pagination.perPage")}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function PaginationIconButton({
  label,
  disabled,
  children,
  onClick,
}: {
  label: string;
  disabled: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function getVisiblePages(page: number, pageCount: number) {
  const visibleCount = Math.min(5, pageCount);
  let start = Math.max(1, page - Math.floor(visibleCount / 2));
  const endOverflow = start + visibleCount - 1 - pageCount;

  if (endOverflow > 0) start = Math.max(1, start - endOverflow);

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeTotal(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
