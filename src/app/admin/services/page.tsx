"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CrudPage, type CrudField, type FilterField } from "@/components/admin/crud-page";
import type { DataTableColumn } from "@/components/admin/data-table";
import {
  categoriesApi,
  servicesApi,
  type ServiceCreatePayload,
  type ServiceFilters,
  type ServiceUpdatePayload,
} from "@/lib/api/admin-content";
import { useToast } from "@/components/ui/toast";
import type { Service } from "@/types/api";

const columns: DataTableColumn<Service>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "name_uz", label: "Nomi UZ" },
  { key: "name_ru", label: "Nomi RU" },
  { key: "name_en", label: "Nomi EN" },
  { key: "slug", label: "Slug" },
  { key: "parent_id", label: "Asosiy ID", kind: "number" },
  { key: "status", label: "Holat", kind: "status" },
  { key: "sort_order", label: "Tartib", kind: "number" },
];

const createFields: CrudField<ServiceCreatePayload>[] = [
  { name: "name_uz", label: "Nomi UZ", required: true },
  { name: "name_ru", label: "Nomi RU" },
  { name: "name_en", label: "Nomi EN" },
  { name: "slug", label: "Slug", required: true },
  { name: "parent_id", label: "Asosiy ID", type: "number" },
  { name: "description_uz", label: "Tavsif UZ", type: "textarea" },
  { name: "description_ru", label: "Tavsif RU", type: "textarea" },
  { name: "description_en", label: "Tavsif EN", type: "textarea" },
  { name: "sort_order", label: "Tartib", type: "number" },
  { name: "status", label: "Holat", type: "number" },
];

const updateFields: CrudField<ServiceUpdatePayload>[] = [
  { name: "name_uz", label: "Nomi UZ", required: true },
  { name: "name_ru", label: "Nomi RU" },
  { name: "name_en", label: "Nomi EN" },
  { name: "slug", label: "Slug" },
  { name: "parent_id", label: "Asosiy ID", type: "number" },
  { name: "description_uz", label: "Tavsif UZ", type: "textarea" },
  { name: "description_ru", label: "Tavsif RU", type: "textarea" },
  { name: "description_en", label: "Tavsif EN", type: "textarea" },
  { name: "sort_order", label: "Tartib", type: "number" },
  { name: "status", label: "Holat", type: "number" },
];

export default function ServicesPage() {
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: number }[]>([]);
  const toast = useToast();

  const loadCategories = useCallback(async () => {
    try {
      const result = await categoriesApi.list({});
      setCategoryOptions(
        result.items
          .filter((category): category is typeof category & { id: number } => typeof category.id === "number")
          .map((category) => ({
            label: category.name_uz || category.name_ru || category.name_en || `Kategoriya #${category.id}`,
            value: category.id,
          })),
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Kategoriyalar yuklanmadi");
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  const filters = useMemo<FilterField<ServiceFilters>[]>(
    () => [
      {
        name: "category_id",
        label: "Kategoriya",
        type: "select",
        options: categoryOptions,
      },
      { name: "status", label: "Holat", type: "number" },
    ],
    [categoryOptions],
  );

  return (
    <CrudPage<Service, ServiceFilters, ServiceCreatePayload, ServiceUpdatePayload>
      title="Xizmatlar"
      eyebrow="Xizmatlar"
      description="Artistlar taklif qiladigan xizmatlarni ko'rish, qo'shish va tahrirlash."
      columns={columns}
      filterFields={filters}
      createFields={createFields}
      updateFields={updateFields}
      initialFilters={{ category_id: "", status: "" }}
      list={servicesApi.list}
      create={servicesApi.create}
      update={servicesApi.update}
      remove={servicesApi.delete}
    />
  );
}
