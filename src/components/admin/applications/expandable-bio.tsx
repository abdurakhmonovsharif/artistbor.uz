"use client";

import { useState } from "react";
import { cn, toDisplay } from "@/lib/utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function ExpandableBio({ value }: { value?: string }) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const [expanded, setExpanded] = useState(false);
  const hasText = Boolean(value?.trim());
  const canToggle = Boolean(value && value.length > 160);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-[#121a2a]">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.bio}</p>
        {canToggle ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-amber-300 dark:hover:text-amber-200"
          >
            {expanded ? labels.showLess : labels.showMore}
          </button>
        ) : null}
      </div>
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
