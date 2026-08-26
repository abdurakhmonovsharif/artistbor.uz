"use client";

import {
  FolderTree,
  Hash,
  MapPin,
  Music,
  ShieldCheck,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ArtistApplication } from "@/types/api";
import { cn, isRecord } from "@/lib/utils";
import { formatPhone } from "@/lib/phone-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { ExpandableBio } from "@/components/admin/applications/expandable-bio";
import {
  createApplicationCategoryMap,
  formatDateParts,
  getApplicationLocationLabel,
  getApplicationUserName,
  getCategoryList,
  getContactValue,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";

export function ApplicationInfoTab({
  application,
  categoryMap,
}: {
  application: ArtistApplication;
  categoryMap: CategoryMap;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const resolvedCategoryMap = createApplicationCategoryMap(application, categoryMap);
  const categories = getCategoryList(application.category_ids, resolvedCategoryMap, locale);
  const subcategories = getCategoryList(application.sub_category_ids, resolvedCategoryMap, locale);
  const userPublicId = isRecord(application.user) && typeof application.user.public_id === "string"
    ? application.user.public_id
    : undefined;

  return (
    <div className="space-y-4">
      <InfoSection title={labels.submissionInfo} icon={<Hash className="size-4" />}>
        <InfoGrid>
          <InfoCell label={labels.applicationId} value={application.public_id} />
          <InfoCell label={labels.userId} value={userPublicId} />
          <InfoCell label={labels.createdAt} value={formatDateParts(application.created_at, locale).full} />
          <InfoCell label={labels.albumsCount} value={application.albums_count} />
          <InfoCell label={labels.profilePhotoId} value={application.profile_photo_id} />
          <InfoCell
            label={labels.topArtist}
            value={application.is_top === undefined ? undefined : isTruthyFlag(application.is_top) ? labels.yes : labels.no}
          />
        </InfoGrid>
      </InfoSection>

      <InfoSection title={labels.contactInfo} icon={<User className="size-4" />}>
        <InfoGrid>
          <InfoCell label={labels.user} value={getApplicationUserName(application)} />
          <InfoCell label={labels.primaryPhone} value={contactPhone(application, ["phone", "main_phone"])} />
          <InfoCell label={labels.extraPhone} value={contactPhone(application, ["extra_phone", "additional_phone"])} />
          <InfoCell label={labels.email} value={getContactValue(application, ["email"])} />
          <InfoCell label={labels.address} value={getContactValue(application, ["address", "location", "manzil"])} />
          <InfoCell label={labels.administrator} value={application.administrator_name} />
          <InfoCell
            className="sm:col-span-2 lg:col-span-3"
            label={labels.adminPhone}
            value={contactPhone(application, ["administrator_phone", "admin_phone"])}
          />
        </InfoGrid>
      </InfoSection>

      <InfoSection title={labels.locationInfo} icon={<MapPin className="size-4" />}>
        <InfoGrid columns="two">
          <InfoCell label={labels.region} value={getApplicationLocationLabel(application, "region", locale)} />
          <InfoCell label={labels.district} value={getApplicationLocationLabel(application, "district", locale)} />
        </InfoGrid>
      </InfoSection>

      <InfoSection title={labels.directionInfo} icon={<FolderTree className="size-4" />}>
        <div className="grid gap-3 md:grid-cols-2">
          <ChipGroup label={labels.category} values={categories} />
          <ChipGroup label={labels.subcategory} values={subcategories} />
        </div>
      </InfoSection>

      <InfoSection title={labels.bio} icon={<Music className="size-4" />}>
        <ExpandableBio value={application.bio} showLabel={false} />
      </InfoSection>

      {application.rejection_reason ? (
        <InfoSection title={labels.rejectionReason} icon={<ShieldCheck className="size-4" />} tone="danger">
          <p className="whitespace-pre-wrap text-sm leading-6 text-rose-700 dark:text-rose-200">
            {application.rejection_reason}
          </p>
        </InfoSection>
      ) : null}
    </div>
  );
}

function InfoSection({
  children,
  icon,
  title,
  tone = "default",
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-white dark:bg-white/[0.025]",
        tone === "danger"
          ? "border-rose-200 dark:border-rose-400/20"
          : "border-slate-200 dark:border-white/10",
      )}
    >
      <div className={cn(
        "flex items-center gap-2 border-b px-4 py-3",
        tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-200",
      )}>
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function InfoGrid({
  children,
  columns = "three",
}: {
  children: ReactNode;
  columns?: "two" | "three";
}) {
  return (
    <dl className={cn(
      "grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10",
      columns === "three" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
    )}>
      {children}
    </dl>
  );
}

function InfoCell({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: ReactNode;
}) {
  const isMissing = value === null || value === undefined || value === "";
  return (
    <div className={cn("min-w-0 bg-white px-3 py-3 dark:bg-[#121a2a]", className)}>
      <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
        {isMissing ? "—" : value}
      </dd>
    </div>
  );
}

function ChipGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="min-h-20 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#121a2a]">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {values.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span key={value} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
              {value}
            </span>
          ))}
        </div>
      ) : <p className="mt-2 text-sm font-semibold text-slate-400">—</p>}
    </div>
  );
}

function contactPhone(application: ArtistApplication, keys: string[]) {
  const value = getContactValue(application, keys);
  return formatPhone(value) || value;
}

function isTruthyFlag(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}
