"use client";

import { Button, DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { CategoryMap, ApplicationStatusKey } from "@/components/admin/applications/application-utils";

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
  const categoryOptions = Array.from(categoryMap.values())
    .filter((category) => typeof category.id === "number")
    .map((category) => ({
      value: String(category.id),
      label: category.name_uz || category.name_ru || category.name_en || `#${category.id}`,
    }));

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111827] md:grid-cols-[minmax(180px,1.25fr)_minmax(170px,0.9fr)_minmax(150px,0.7fr)_auto_auto] md:items-center xl:grid-cols-[minmax(180px,1.25fr)_minmax(170px,0.9fr)_minmax(150px,0.7fr)_minmax(230px,1fr)_auto_auto]">
      <Input
        allowClear
        prefix={<Search className="size-4 text-slate-400" />}
        placeholder="Qidirish..."
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        className="h-10"
      />

      <Select
        className="h-10"
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
        options={[{ value: "", label: "Kategoriya: Barchasi" }, ...categoryOptions]}
        showSearch
        optionFilterProp="label"
      />

      <Select
        className="h-10"
        value={value.dateRange}
        onChange={(dateRange) =>
          onChange({
            ...value,
            dateRange,
            customDateRange: dateRange === "custom" ? value.customDateRange : null,
          })
        }
        options={[
          { value: "all", label: "Sana: Barchasi" },
          { value: "today", label: "Bugun" },
          { value: "week", label: "7 kun" },
          { value: "month", label: "30 kun" },
          { value: "custom", label: "Custom" },
        ]}
      />

      {value.dateRange === "custom" ? (
        <RangePicker
          className="h-10"
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

      <Button className="h-10" icon={<RotateCcw className="size-4" />} onClick={onReset}>
        Reset
      </Button>

      <Button className="h-10" icon={<SlidersHorizontal className="size-4" />} aria-label="Filter sozlamalari" />
    </div>
  );
}

function toRangePickerValue(value: ApplicationsFilterState["customDateRange"]): [Dayjs, Dayjs] | null {
  if (!value) return null;
  return [dayjs(value[0], "YYYY-MM-DD"), dayjs(value[1], "YYYY-MM-DD")];
}
