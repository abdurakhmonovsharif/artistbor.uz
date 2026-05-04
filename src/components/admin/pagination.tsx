"use client";

import type { PaginationMeta } from "@/types/api";

export function Pagination({
  meta,
  page,
  onPageChange,
}: {
  meta?: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount =
    meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);
  const total = meta?.totalCount ?? meta?.total;
  if (!pageCount || pageCount <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-[22px] border border-slate-100 bg-white px-5 py-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400 sm:flex-row">
      <span>{total ? `${total} ta yozuv` : `${pageCount} sahifa`}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-slate-200 px-4 py-2 font-black disabled:opacity-40 dark:border-white/10"
        >
          Oldingi
        </button>
        <span className="rounded-xl bg-amber-100 px-4 py-2 font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-slate-200 px-4 py-2 font-black disabled:opacity-40 dark:border-white/10"
        >
          Keyingi
        </button>
      </div>
    </div>
  );
}
