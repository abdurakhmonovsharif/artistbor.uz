"use client";

import { Button, DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { RotateCcw, Search } from "lucide-react";
import {
  AdminFilterCard,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import { getLocalizedCategoryName, type CategoryMap, type ApplicationStatusKey } from "@/components/admin/applications/application-utils";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { useI18n } from "@/lib/i18n/i18n-provider";

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
    <AdminFilterCard
      gridClassName="md:grid-cols-[minmax(180px,1.25fr)_minmax(170px,0.9fr)_minmax(150px,0.7fr)_auto] md:items-center xl:grid-cols-[minmax(180px,1.25fr)_minmax(170px,0.9fr)_minmax(150px,0.7fr)_minmax(230px,1fr)_auto]"
      mobileLabel={labels.filterSettings}
    >
      <Input
        allowClear
        prefix={<Search className="size-4 text-slate-400" />}
        placeholder={labels.searchPlaceholder}
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        className={`${adminFilterControlClass} h-10`}
      />

      <Select
        className={`${adminFilterControlClass} h-10`}
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
        options={[{ value: "", label: labels.categoryAll }, ...categoryOptions]}
        showSearch
        optionFilterProp="label"
      />

      <Select
        className={`${adminFilterControlClass} h-10`}
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
          className={`${adminFilterControlClass} h-10`}
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
      ) : (
        <div className="hidden xl:block" />
      )}

      <Button className={`${adminFilterActionClass} h-10`} icon={<RotateCcw className="size-4" />} onClick={onReset}>
        {labels.reset}
      </Button>
    </AdminFilterCard>
  );
}

function toRangePickerValue(value: ApplicationsFilterState["customDateRange"]): [Dayjs, Dayjs] | null {
  if (!value) return null;
  return [dayjs(value[0], "YYYY-MM-DD"), dayjs(value[1], "YYYY-MM-DD")];
}
