"use client";

import { Drawer, Tabs } from "antd";
import { CalendarDays, FolderOpen, ImageIcon, Music, ShieldCheck, User, X } from "lucide-react";
import type { ReactNode } from "react";
import type { ArtistApplication } from "@/types/api";
import { cn, toDisplay } from "@/lib/utils";
import { ApplicationStatusBadge } from "@/components/admin/applications/application-status-badge";
import { ExpandableBio } from "@/components/admin/applications/expandable-bio";
import { ServiceListTab } from "@/components/admin/applications/service-list-tab";
import {
  formatDateParts,
  getApplicationAvatar,
  getApplicationTitle,
  getApplicationUserName,
  getCategoryList,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";

export function ApplicationDetailDrawer({
  application,
  categoryMap,
  open,
  onClose,
}: {
  application: ArtistApplication | null;
  categoryMap: CategoryMap;
  open: boolean;
  onClose: () => void;
}) {
  if (!application) return null;

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
            Ariza #{toDisplay(application.id)}
          </span>
          <ApplicationStatusBadge application={application} />
        </div>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.05]"
        >
          Yopish
        </button>
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
              label: "Ma’lumot",
              children: <ApplicationInfoTab application={application} categoryMap={categoryMap} />,
            },
            {
              key: "services",
              label: "Xizmatlar",
              children: <ServiceListTab application={application} />,
            },
          ]}
        />
      </div>
    </Drawer>
  );
}

function ApplicationProfile({
  application,
  categoryMap,
}: {
  application: ArtistApplication;
  categoryMap: CategoryMap;
}) {
  const avatar = getApplicationAvatar(application);

  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={`Ariza #${toDisplay(application.id)}`}
          className="size-14 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10"
        />
      ) : (
        <div className="grid size-14 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500">
          <ImageIcon className="size-6" />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
          {getApplicationTitle(application, categoryMap)}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          ID: {toDisplay(application.id)}
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
  const created = formatDateParts(application.created_at).full;
  const categories = getCategoryList(application.category_ids, categoryMap);
  const subcategories = getCategoryList(application.sub_category_ids, categoryMap);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-950 dark:text-white">Asosiy ma’lumotlar</h4>
      <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
        <InfoCell icon={<User className="size-4" />} label="Foydalanuvchi" value={getApplicationUserName(application)} />
        <InfoCell icon={<CalendarDays className="size-4" />} label="Yaratilgan vaqt" value={created} />
        <InfoCell icon={<Music className="size-4" />} label="Albomlar soni" value={application.albums_count} />
        <InfoCell icon={<ShieldCheck className="size-4" />} label="Administrator" value={application.administrator_name} />
        <InfoCell icon={<FolderOpen className="size-4" />} label="Kategoriya" value={<ChipList values={categories} />} />
        <InfoCell icon={<ShieldCheck className="size-4" />} label="Subkategoriya" value={<ChipList values={subcategories} />} />
        <InfoCell
          className="sm:col-span-2"
          icon={<X className="size-4" />}
          label="Rad etish sababi"
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
