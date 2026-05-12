"use client";

import { Drawer, Tabs } from "antd";
import { CalendarDays, CheckCircle2, FolderOpen, ImageIcon, Music, ShieldCheck, User, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { ArtistApplication } from "@/types/api";
import { cn, toDisplay } from "@/lib/utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { ApplicationStatusBadge } from "@/components/admin/applications/application-status-badge";
import { ExpandableBio } from "@/components/admin/applications/expandable-bio";
import { ServiceListTab } from "@/components/admin/applications/service-list-tab";
import {
  formatDateParts,
  canApproveApplication,
  canRejectApplication,
  getApplicationAvatar,
  getApplicationTitle,
  getApplicationUserName,
  getCategoryList,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function ApplicationDetailDrawer({
  application,
  categoryMap,
  open,
  onClose,
  onApprove,
  onReject,
}: {
  application: ArtistApplication | null;
  categoryMap: CategoryMap;
  open: boolean;
  onClose: () => void;
  onApprove: (application: ArtistApplication) => void;
  onReject: (application: ArtistApplication) => void;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);

  if (!application) return null;

  const canProcessApplication = canApproveApplication(application) || canRejectApplication(application);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 480px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
            {labels.drawerTitle(toDisplay(application.id))}
          </span>
          <ApplicationStatusBadge application={application} />
        </div>
      }
      footer={
        canProcessApplication ? (
          <ApplicationDrawerActions
            application={application}
            onApprove={() => onApprove(application)}
            onReject={() => onReject(application)}
          />
        ) : null
      }
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 64, padding: "0 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
    >
      <div className="space-y-3.5 p-4">
        <ApplicationProfile application={application} categoryMap={categoryMap} />

        <Tabs
          defaultActiveKey="info"
          className="artistbor-drawer-tabs"
          items={[
            {
              key: "info",
              label: labels.infoTab,
              children: <ApplicationInfoTab application={application} categoryMap={categoryMap} />,
            },
            {
              key: "services",
              label: labels.servicesTab,
              children: <ServiceListTab application={application} />,
            },
          ]}
        />
      </div>
    </Drawer>
  );
}

function ApplicationDrawerActions({
  application,
  onApprove,
  onReject,
}: {
  application: ArtistApplication;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);

  return (
    <div className="grid grid-cols-2 gap-2">
      <ApplicationDrawerActionButton
        disabled={!canApproveApplication(application)}
        icon={<CheckCircle2 className="size-4" />}
        label={labels.approveAction}
        tone="approve"
        onClick={onApprove}
      />
      <ApplicationDrawerActionButton
        disabled={!canRejectApplication(application)}
        icon={<XCircle className="size-4" />}
        label={labels.rejectAction}
        tone="reject"
        onClick={onReject}
      />
    </div>
  );
}

function ApplicationDrawerActionButton({
  disabled,
  icon,
  label,
  tone,
  onClick,
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  tone: "approve" | "reject";
  onClick: () => void;
}) {
  const toneClass =
    tone === "approve"
      ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
      : "border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70 dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
        toneClass,
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function ApplicationProfile({
  application,
  categoryMap,
}: {
  application: ArtistApplication;
  categoryMap: CategoryMap;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const avatar = getApplicationAvatar(application);

  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={labels.drawerTitle(toDisplay(application.id))}
          className="size-14 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10"
        />
      ) : (
        <div className="grid size-14 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500">
          <ImageIcon className="size-6" />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
          {getApplicationTitle(application, categoryMap, locale)}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {labels.idLabel}: {toDisplay(application.id)}
        </p>
      </div>
    </div>
  );
}

function ApplicationInfoTab({
  application,
  categoryMap,
}: {
  application: ArtistApplication;
  categoryMap: CategoryMap;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const created = formatDateParts(application.created_at, locale).full;
  const categories = getCategoryList(application.category_ids, categoryMap, locale);
  const subcategories = getCategoryList(application.sub_category_ids, categoryMap, locale);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.mainInfo}</h4>
      <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
        <InfoCell icon={<User className="size-4" />} label={labels.user} value={getApplicationUserName(application)} />
        <InfoCell icon={<CalendarDays className="size-4" />} label={labels.createdAt} value={created} />
        <InfoCell icon={<Music className="size-4" />} label={labels.albumsCount} value={application.albums_count} />
        <InfoCell icon={<ShieldCheck className="size-4" />} label={labels.administrator} value={application.administrator_name} />
        <InfoCell icon={<FolderOpen className="size-4" />} label={labels.category} value={<ChipList values={categories} />} />
        <InfoCell icon={<ShieldCheck className="size-4" />} label={labels.subcategory} value={<ChipList values={subcategories} />} />
        <InfoCell
          className="sm:col-span-2"
          icon={<X className="size-4" />}
          label={labels.rejectionReason}
          value={application.rejection_reason}
        />
      </div>
      <ExpandableBio value={application.bio} />
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  const isMissing = value === null || value === undefined || value === "";

  return (
    <div className={cn("flex min-h-16 gap-3 bg-slate-50 p-3 dark:bg-[#121a2a]", className)}>
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
          {isMissing ? "—" : value}
        </div>
      </div>
    </div>
  );
}

function ChipList({ values }: { values: string[] }) {
  if (!values.length) return <span>—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
        >
          {value}
        </span>
      ))}
    </div>
  );
}
