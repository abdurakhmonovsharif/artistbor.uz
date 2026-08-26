"use client";

import { Drawer, Tabs } from "antd";
import { CheckCircle2, ImageIcon, MapPin, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { ArtistApplication } from "@/types/api";
import { cn } from "@/lib/utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { ApplicationStatusBadge } from "@/components/admin/applications/application-status-badge";
import { ApplicationInfoTab } from "@/components/admin/applications/application-info-tab";
import { ServiceListTab } from "@/components/admin/applications/service-list-tab";
import { adminDrawerClassNames, adminDrawerStyles } from "@/components/admin/admin-drawer";
import { InlineLoadingState } from "@/components/ui/states";
import {
  canApproveApplication,
  canRejectApplication,
  createApplicationCategoryMap,
  getApplicationAvatar,
  getApplicationLocationLabel,
  getApplicationTitle,
  getApplicationUserName,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getSubmittedApplicationServices } from "@/lib/artist-application-details";

export function ApplicationDetailDrawer({
  application,
  detailLoading,
  categoryMap,
  open,
  onClose,
  onApprove,
  onReject,
}: {
  application: ArtistApplication | null;
  detailLoading: boolean;
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
  const submittedServiceCount = getSubmittedApplicationServices(application).length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 720px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={adminDrawerClassNames}
      title={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
            {labels.drawerTitle(application.public_id ?? "—")}
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
      styles={adminDrawerStyles}
    >
      <div className="space-y-3.5 p-4">
        {detailLoading ? <InlineLoadingState /> : null}
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
              label: `${labels.servicesTab} (${submittedServiceCount})`,
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
        disabled={!canRejectApplication(application)}
        icon={<XCircle className="size-4" />}
        label={labels.rejectAction}
        tone="reject"
        onClick={onReject}
      />
      <ApplicationDrawerActionButton
        disabled={!canApproveApplication(application)}
        icon={<CheckCircle2 className="size-4" />}
        label={labels.approveAction}
        tone="approve"
        onClick={onApprove}
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
  const resolvedCategoryMap = createApplicationCategoryMap(application, categoryMap);
  const location = [
    getApplicationLocationLabel(application, "region", locale),
    getApplicationLocationLabel(application, "district", locale),
  ].filter((value) => value !== "—").join(", ");

  return (
    <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.035]">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={labels.drawerTitle(application.public_id ?? "—")}
          className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10 sm:size-20"
        />
      ) : (
        <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-500 dark:ring-white/10 sm:size-20">
          <ImageIcon className="size-7" />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold text-slate-950 dark:text-white">
          {getApplicationUserName(application)}
        </h2>
        <p className="mt-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
          {getApplicationTitle(application, resolvedCategoryMap, locale)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{labels.idLabel}: {application.public_id ?? "—"}</span>
          {location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {location}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
