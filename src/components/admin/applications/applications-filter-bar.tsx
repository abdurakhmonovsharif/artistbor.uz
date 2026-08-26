"use client";

import { DatePicker, Input, Select } from "antd";
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
      label: getLocalizedCategoryName(category, locale) || "Kategoriya —",
    }));

  return (
    <div className="artistbor-table-filter-shell artistbor-responsive-filter-shell">
      <div className="artistbor-table-filter-panel artistbor-responsive-filter-panel grid gap-3 md:grid-cols-[auto_auto_auto_auto_minmax(0,1fr)_auto] md:items-center">
        <Input
          allowClear
          prefix={<Search className="size-4 text-[#94a3b8]" />}
          placeholder={labels.searchPlaceholder}
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
          className={cn(
            "artistbor-table-filter-control artistbor-filter-search h-10",
            value.search && "artistbor-filter-search-active",
          )}
        />

        <Select
          className="artistbor-compact-select artistbor-table-filter-control !h-10 !w-[220px] shrink-0 md:justify-self-start"
          value={value.categoryId}
          onChange={(categoryId) => onChange({ ...value, categoryId })}
          options={[{ value: "", label: labels.categoryAll }, ...categoryOptions]}
          showSearch
          optionFilterProp="label"
        />

        <Select
          className="artistbor-compact-select artistbor-table-filter-control !h-10 !w-[180px] shrink-0 md:justify-self-start"
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
            className="artistbor-table-filter-control !h-10 !w-[230px] shrink-0 !rounded-xl !border-[#e6ebf2] !bg-[#f8fafc] dark:!border-white/10 dark:!bg-white/[0.035]"
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

        <button
          type="button"
          className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 px-4 md:col-start-6"
          onClick={onReset}
        >
          <RotateCcw className="size-4" />
          {labels.reset}
        </button>
      </div>
    </div>
  );
}

function toRangePickerValue(value: ApplicationsFilterState["customDateRange"]): [Dayjs, Dayjs] | null {
  if (!value) return null;
  return [dayjs(value[0], "YYYY-MM-DD"), dayjs(value[1], "YYYY-MM-DD")];
}
