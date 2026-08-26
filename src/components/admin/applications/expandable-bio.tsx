"use client";

import { useState } from "react";
import { cn, toDisplay } from "@/lib/utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function ExpandableBio({ value, showLabel = true }: { value?: string; showLabel?: boolean }) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const [expanded, setExpanded] = useState(false);
  const hasText = Boolean(value?.trim());
  const canToggle = Boolean(value && value.length > 160);

  return (
    <div className="rounded-lg border border-artistbor-border bg-artistbor-surface-subtle p-3.5">
      {showLabel || canToggle ? (
        <div className={cn("mb-1.5 flex items-center gap-3", showLabel ? "justify-between" : "justify-end")}>
          {showLabel ? <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.bio}</p> : null}
          {canToggle ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="cursor-pointer text-xs font-semibold text-artistbor-accent transition-colors duration-200 hover:text-artistbor-focus"
            >
              {expanded ? labels.showLess : labels.showMore}
            </button>
          ) : null}
        </div>
      ) : null}
      <p
        className={cn(
          "whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-800 dark:text-slate-100",
          !expanded && hasText && "line-clamp-4",
        )}
      >
        {toDisplay(value)}
      </p>
    </div>
  );
}
