"use client";

import { Drawer } from "antd";
import { AtSign, Copy, MapPin, Phone, UserRound, X } from "lucide-react";
import type { ArtistApplication } from "@/types/api";
import { toDisplay } from "@/lib/utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import {
  getApplicationTitle,
  getContactValue,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function ApplicationContactDrawer({
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
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);

  if (!application) return null;

  const rows = [
    {
      label: labels.primaryPhone,
      value: getContactValue(application, ["phone", "main_phone"]),
      icon: <Phone className="size-4" />,
      copyable: true,
    },
    {
      label: labels.extraPhone,
      value: getContactValue(application, ["extra_phone", "additional_phone"]),
      icon: <Phone className="size-4" />,
      copyable: true,
    },
    {
      label: labels.adminPhone,
      value: getContactValue(application, ["administrator_phone", "admin_phone"]),
      icon: <UserRound className="size-4" />,
      copyable: true,
    },
    {
      label: labels.email,
      value: getContactValue(application, ["email"]),
      icon: <AtSign className="size-4" />,
      copyable: true,
    },
    {
      label: labels.address,
      value: getContactValue(application, ["address", "location", "manzil"]),
      icon: <MapPin className="size-4" />,
    },
  ];

  const handleCopy = async (value: string) => {
    if (value === "—") return;
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      return;
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 420px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer artistbor-contact-drawer"
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
      title={
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-6 text-slate-950 dark:text-white">{labels.contactTitle}</p>
          <p className="mt-1 truncate text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
            {labels.drawerTitle(toDisplay(application.id))} · {getApplicationTitle(application, categoryMap, locale)}
          </p>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-full cursor-pointer rounded-lg border border-rose-200 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
        >
          {labels.closeAction}
        </button>
      }
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 82, padding: "12px 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
    >
      <div className="p-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#121a2a]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-3 py-2.5 last:border-b-0 dark:border-white/10"
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
                {row.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{row.label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
                  {row.value}
                </p>
              </div>
              {row.copyable && row.value !== "—" ? (
                <button
                  type="button"
                  onClick={() => void handleCopy(row.value)}
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={labels.copyValue(row.label)}
                >
                  <Copy className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
