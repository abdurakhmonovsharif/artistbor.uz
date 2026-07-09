"use client";

import { Input, Select } from "antd";
import { cn } from "@/lib/utils";

export type DateFilterMode = "newest" | "oldest" | "custom";

export type DateFilterValue = {
  mode: DateFilterMode;
  date_from: string;
  date_to: string;
};

export type DateFilterLabels = {
  label: string;
  newest: string;
  oldest: string;
  custom: string;
  from: string;
  to: string;
};

export function DateFilterSelect({
  value,
  labels,
  onChange,
  className,
  selectClassName,
  inputClassName,
  rangeClassName,
}: {
  value: DateFilterValue;
  labels: DateFilterLabels;
  onChange: (value: DateFilterValue) => void;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  rangeClassName?: string;
}) {
  const mode = value.mode;
  const commonInputClassName = cn(
    "artistbor-table-filter-control !h-[38px] !w-[150px] shrink-0 !rounded-xl !border-[#e6ebf2] !bg-white !text-[13px] !font-medium !text-[#475569] dark:!border-white/10 dark:!bg-white/[0.03] dark:!text-white",
    inputClassName,
  );

  return (
    <div className={cn("flex min-w-0 flex-nowrap items-center gap-2", className)}>
      <Select
        className={cn("artistbor-compact-select artistbor-table-filter-control !h-[38px] !w-[190px] shrink-0", selectClassName)}
        value={mode}
        aria-label={labels.label}
        onChange={(nextMode: DateFilterMode) =>
          onChange({
            mode: nextMode,
            date_from: nextMode === "custom" ? value.date_from : "",
            date_to: nextMode === "custom" ? value.date_to : "",
          })
        }
        options={[
          { label: `${labels.label}: ${labels.newest}`, value: "newest" },
          { label: `${labels.label}: ${labels.oldest}`, value: "oldest" },
          { label: `${labels.label}: ${labels.custom}`, value: "custom" },
        ]}
      />

      {mode === "custom" ? (
        <div className={cn("flex min-w-0 flex-nowrap items-center gap-2", rangeClassName)}>
          <Input
            type="date"
            value={value.date_from}
            aria-label={labels.from}
            onChange={(event) => onChange({ ...value, date_from: event.target.value })}
            className={commonInputClassName}
          />
          <Input
            type="date"
            value={value.date_to}
            aria-label={labels.to}
            onChange={(event) => onChange({ ...value, date_to: event.target.value })}
            className={commonInputClassName}
          />
        </div>
      ) : null}
    </div>
  );
}

export function inferDateFilterMode(filters: {
  date_from?: string;
  date_to?: string;
  sort?: string;
}): DateFilterMode {
  if (filters.date_from || filters.date_to) return "custom";
  return filters.sort === "created_at" ? "oldest" : "newest";
}

export function getDateFilterPatch(value: DateFilterValue) {
  return {
    date_from: value.mode === "custom" ? value.date_from : "",
    date_to: value.mode === "custom" ? value.date_to : "",
    sort: value.mode === "oldest" ? "created_at" : "-created_at",
  };
}
