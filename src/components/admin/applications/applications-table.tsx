"use client";

import { Eye, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { ArtistApplication } from "@/types/api";
import { cn, toDisplay } from "@/lib/utils";
import { ApplicationActionsDropdown } from "@/components/admin/applications/application-actions-dropdown";
import { ApplicationStatusBadge } from "@/components/admin/applications/application-status-badge";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import {
  formatDateParts,
  getApplicationAvatar,
  getApplicationTitle,
  getPrimaryCategoryLabel,
  getPrimarySubcategoryLabel,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function ApplicationsTable({
  rows,
  categoryMap,
  page,
  pageSize,
  onOpenDetail,
  onOpenContact,
  onApprove,
  onReject,
}: {
  rows: ArtistApplication[];
  categoryMap: CategoryMap;
  page: number;
  pageSize: number;
  onOpenDetail: (application: ArtistApplication) => void;
  onOpenContact: (application: ArtistApplication) => void;
  onApprove: (application: ArtistApplication) => void;
  onReject: (application: ArtistApplication) => void;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e6ebf2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0">
          <colgroup>
            <col className="w-14" />
            <col className="w-[300px]" />
            <col className="w-[190px]" />
            <col className="w-[150px]" />
            <col className="w-[170px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="h-11 bg-[#f8fafc] text-left dark:bg-white/[0.03]">
              <TableHead className="w-14">#</TableHead>
              <TableHead>{labels.tableApplication}</TableHead>
              <TableHead>{labels.tableCategory}</TableHead>
              <TableHead>{labels.tableStatus}</TableHead>
              <TableHead>{labels.tableSubmittedAt}</TableHead>
              <TableHead>{labels.tableContact}</TableHead>
              <TableHead className="text-right">{labels.tableActions}</TableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((application, index) => {
              const date = formatDateParts(application.created_at, locale);

              return (
                <tr
                  key={String(application.id ?? index)}
                  className="h-16 transition hover:bg-[#fffaf3] dark:hover:bg-amber-500/[0.04]"
                >
                  <TableCell className="font-semibold text-[#64748b] dark:text-slate-400">
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ApplicationAvatar application={application} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
                          {getApplicationTitle(application, categoryMap, locale)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-[13px] font-semibold leading-[18px] text-[#334155] dark:text-slate-100">
                      {getPrimaryCategoryLabel(application, categoryMap, locale)}
                    </p>
                    <p className="truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
                      {labels.subLabel}: {getPrimarySubcategoryLabel(application, categoryMap, locale)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge application={application} />
                  </TableCell>
                  <TableCell>
                    <p className="text-[13px] font-semibold leading-[18px] text-[#334155] dark:text-slate-100">{date.date}</p>
                    <p className="text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">{date.time}</p>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onOpenContact(application)}
                      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[10px] border border-[#e6ebf2] bg-white px-3 text-xs font-semibold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                    >
                      <Phone className="size-3.5" />
                      {labels.contactAction}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(application)}
                        className="grid size-8 cursor-pointer place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                        aria-label={labels.viewAction}
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
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const avatar = getApplicationAvatar(application);

  if (!avatar) {
    return (
      <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-slate-100 text-xs font-bold text-slate-400 ring-1 ring-[#e6ebf2] dark:bg-white/10 dark:text-slate-500 dark:ring-white/10">
        —
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt={labels.drawerTitle(toDisplay(application.id))}
      className="size-9 shrink-0 rounded-[10px] object-cover ring-1 ring-[#e6ebf2] dark:ring-white/10"
    />
  );
}

function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[#e6ebf2] px-3.5 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-[#edf2f7] px-3.5 py-[9px] align-middle text-[13px] dark:border-white/10", className)}>{children}</td>;
}
