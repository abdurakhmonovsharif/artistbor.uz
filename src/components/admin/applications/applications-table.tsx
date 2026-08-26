"use client";

import { Eye, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { ArtistApplication } from "@/types/api";
import { cn } from "@/lib/utils";
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
  onOpenDetail,
  onOpenContact,
  onApprove,
  onReject,
}: {
  rows: ArtistApplication[];
  categoryMap: CategoryMap;
  onOpenDetail: (application: ArtistApplication) => void;
  onOpenContact: (application: ArtistApplication) => void;
  onApprove: (application: ArtistApplication) => void;
  onReject: (application: ArtistApplication) => void;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);

  return (
    <div className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]">
      <div className="admin-table-scroll artistbor-applications-data-table overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-artistbor-accent" role="region" tabIndex={0} aria-label={labels.pageTitle}>
        <table aria-label={labels.pageTitle} className="w-full min-w-[1080px] border-separate border-spacing-0">
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
            <tr className="h-11 bg-artistbor-surface-subtle text-left">
              <TableHead className="w-28">Public ID</TableHead>
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
                  className="h-16 transition-colors duration-200 hover:bg-amber-50/60 dark:hover:bg-amber-500/[0.04]"
                >
                  <TableCell className="whitespace-nowrap font-semibold text-artistbor-secondary">
                    {application.public_id ?? "—"}
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
                    <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
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
                    <p className="text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">{date.date}</p>
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
      alt={labels.drawerTitle(application.public_id ?? "—")}
      className="size-9 shrink-0 rounded-[10px] object-cover ring-1 ring-[#e6ebf2] dark:ring-white/10"
    />
  );
}

function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-artistbor-border px-3.5 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-artistbor-secondary",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-artistbor-border px-3.5 py-[9px] align-middle text-[13px] font-normal leading-[18px] text-artistbor-primary", className)}>{children}</td>;
}
