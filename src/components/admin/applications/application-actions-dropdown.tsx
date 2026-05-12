"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { CheckCircle2, MoreVertical, XCircle } from "lucide-react";
import type { ArtistApplication } from "@/types/api";
import {
  canApproveApplication,
  canRejectApplication,
} from "@/components/admin/applications/application-utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function ApplicationActionsDropdown({
  application,
  onApprove,
  onReject,
}: {
  application: ArtistApplication;
  onApprove: (application: ArtistApplication) => void;
  onReject: (application: ArtistApplication) => void;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const items: MenuProps["items"] = [];

  if (canApproveApplication(application)) {
    items.push({
      key: "approve",
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
      label: labels.approveAction,
      onClick: () => onApprove(application),
    });
  }

  if (canRejectApplication(application)) {
    items.push({
      key: "reject",
      icon: <XCircle className="size-4 text-rose-500" />,
      danger: true,
      label: labels.rejectAction,
      onClick: () => onReject(application),
    });
  }

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight" disabled={!items.length}>
      <button
        type="button"
        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
        aria-label={labels.actionsLabel}
        onClick={(event) => event.preventDefault()}
      >
        <MoreVertical className="size-4" />
      </button>
    </Dropdown>
  );
}
