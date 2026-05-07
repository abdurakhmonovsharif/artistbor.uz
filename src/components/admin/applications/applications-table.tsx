"use client";

import { Checkbox } from "antd";
import { Eye, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { ArtistApplication } from "@/types/api";
import { cn, toDisplay } from "@/lib/utils";
import { ApplicationActionsDropdown } from "@/components/admin/applications/application-actions-dropdown";
import { ApplicationStatusBadge } from "@/components/admin/applications/application-status-badge";
import {
  formatDateParts,
  getApplicationAvatar,
  getApplicationTitle,
  getPrimaryCategoryLabel,
  getPrimarySubcategoryLabel,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";

export function ApplicationsTable({
  rows,
  categoryMap,
  page,
  pageSize,
  selectedIds,
  onToggleAll,
  onToggleRow,
  onOpenDetail,
  onOpenContact,
  onApprove,
  onReject,
}: {
  rows: ArtistApplication[];
  categoryMap: CategoryMap;
  page: number;
  pageSize: number;
  selectedIds: Set<number>;
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (application: ArtistApplication, checked: boolean) => void;
  onOpenDetail: (application: ArtistApplication) => void;
  onOpenContact: (application: ArtistApplication) => void;
  onApprove: (application: ArtistApplication) => void;
  onReject: (application: ArtistApplication) => void;
}) {
  const selectableRows = rows.filter((row) => typeof row.id === "number");
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.id as number));
  const partiallySelected = selectableRows.some((row) => selectedIds.has(row.id as number)) && !allSelected;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111827]">
      <div className="admin-table-scroll overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="h-11 border-b border-slate-200 bg-slate-50 text-left dark:border-white/10 dark:bg-white/[0.03]">
              <TableHead className="w-11">
                <Checkbox
                  checked={allSelected}
                  indeterminate={partiallySelected}
                  onChange={(event) => onToggleAll(event.target.checked)}
                  aria-label="Barchasini tanlash"
                />
              </TableHead>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Ariza</TableHead>
              <TableHead>Kategoriya</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Yuborilgan vaqt</TableHead>
              <TableHead>Aloqa</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((application, index) => {
              const id = typeof application.id === "number" ? application.id : undefined;
              const date = formatDateParts(application.created_at);

              return (
                <tr
                  key={String(application.id ?? index)}
                  className="h-16 border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-white/[0.035]"
                >
                  <TableCell>
                    <Checkbox
                      checked={id ? selectedIds.has(id) : false}
                      disabled={!id}
                      onChange={(event) => onToggleRow(application, event.target.checked)}
                      aria-label={`Ariza ${toDisplay(application.id)} tanlash`}
                    />
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <ApplicationAvatar application={application} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {getApplicationTitle(application, categoryMap)}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                          ID: {toDisplay(application.id)}
                          {application.profile_photo_id ? ` · Photo ID: ${application.profile_photo_id}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {getPrimaryCategoryLabel(application, categoryMap)}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                      Sub: {getPrimarySubcategoryLabel(application, categoryMap)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge application={application} />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{date.date}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{date.time}</p>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onOpenContact(application)}
                      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
                    >
                      <Phone className="size-3.5" />
                      Aloqa
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(application)}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
                        aria-label="Ko'rish"
                      >
                        <Eye className="size-4" />
                      </button>
                      <ApplicationActionsDropdown
                        application={application}
                        onApprove={onApprove}
                        onReject={onReject}
                      />
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

function ApplicationAvatar({ application }: { application: ArtistApplication }) {
  const avatar = getApplicationAvatar(application);

  if (!avatar) {
    return (
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400 dark:bg-white/10 dark:text-slate-500">
        —
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt={`Ariza #${toDisplay(application.id)}`}
      className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10"
    />
  );
}

function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-middle text-sm", className)}>{children}</td>;
}
