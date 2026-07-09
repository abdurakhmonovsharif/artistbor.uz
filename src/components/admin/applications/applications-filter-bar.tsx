"use client";

import { Button, DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { RotateCcw, Search } from "lucide-react";
import { getLocalizedCategoryName, type CategoryMap, type ApplicationStatusKey } from "@/components/admin/applications/application-utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

const { RangePicker } = DatePicker;

export type ApplicationsFilterState = {
  search: string;
  status: ApplicationStatusKey;
  categoryId: string;
  dateRange: "all" | "today" | "week" | "month" | "custom";
  customDateRange: [string, string] | null;
};

export const defaultApplicationFilters: ApplicationsFilterState = {
  search: "",
  status: "all",
  categoryId: "",
  dateRange: "all",
  customDateRange: null,
};

export function ApplicationsFilterBar({
  value,
  categoryMap,
  onChange,
  onReset,
}: {
  value: ApplicationsFilterState;
  categoryMap: CategoryMap;
  onChange: (value: ApplicationsFilterState) => void;
  onReset: () => void;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const categoryOptions = Array.from(categoryMap.values())
    .filter((category) => typeof category.id === "number")
    .map((category) => ({
      value: String(category.id),
      label: getLocalizedCategoryName(category, locale) || `#${category.id}`,
    }));

  return (
    <div className="artistbor-table-filter-shell overflow-x-auto">
      <div className="artistbor-table-filter-panel flex min-h-[52px] min-w-[820px] items-center gap-2.5 py-2">
        <Input
          allowClear
          prefix={<Search className="size-4 text-[#94a3b8]" />}
          placeholder={labels.searchPlaceholder}
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
          className={cn(
            "artistbor-filter-search artistbor-table-filter-control !h-[38px] !rounded-xl !border-[#e6ebf2] !bg-white !text-[13px] !font-medium dark:!border-white/10 dark:!bg-white/[0.03] dark:!text-white",
            value.search && "artistbor-filter-search-active",
          )}
        />

        <Select
          className="artistbor-compact-select artistbor-table-filter-control !h-[38px] !w-[220px] shrink-0"
          value={value.categoryId}
          onChange={(categoryId) => onChange({ ...value, categoryId })}
          options={[{ value: "", label: labels.categoryAll }, ...categoryOptions]}
          showSearch
          optionFilterProp="label"
        />

        <Select
          className="artistbor-compact-select artistbor-table-filter-control !h-[38px] !w-[180px] shrink-0"
          value={value.dateRange}
          onChange={(dateRange) =>
            onChange({
              ...value,
              dateRange,
              customDateRange: dateRange === "custom" ? value.customDateRange : null,
            })
          }
          options={[
            { value: "all", label: labels.dateAll },
            { value: "today", label: labels.today },
            { value: "week", label: labels.week },
            { value: "month", label: labels.month },
            { value: "custom", label: labels.custom },
          ]}
        />

        {value.dateRange === "custom" ? (
          <RangePicker
            className="!h-[38px] !w-[230px] shrink-0 !rounded-[11px] !border-[#e6ebf2] !bg-white dark:!border-white/10 dark:!bg-white/[0.03]"
            format="YYYY-MM-DD"
            value={toRangePickerValue(value.customDateRange)}
            onChange={(_, dateStrings) => {
              const [start, end] = dateStrings;
              onChange({
                ...value,
                customDateRange: start && end ? [start, end] : null,
              });
            }}
          />
        ) : null}

        <Button
          className="artistbor-filter-reset artistbor-table-filter-control !h-[38px] !w-28 shrink-0 !rounded-xl !border-[#e6ebf2] !bg-white !px-3 !text-sm !font-bold !text-[#475569] hover:!border-[#cbd5e1] hover:!bg-[#f8fafc] dark:!border-white/10 dark:!bg-white/[0.03] dark:!text-slate-200"
          icon={<RotateCcw className="size-4" />}
          onClick={onReset}
        >
          {labels.reset}
        </Button>
      </div>
    </div>
  );
}

function toRangePickerValue(value: ApplicationsFilterState["customDateRange"]): [Dayjs, Dayjs] | null {
  if (!value) return null;
  return [dayjs(value[0], "YYYY-MM-DD"), dayjs(value[1], "YYYY-MM-DD")];
}
