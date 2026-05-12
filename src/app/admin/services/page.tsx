"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CrudPage, type CrudField, type FilterField } from "@/components/admin/crud-page";
import type { DataTableColumn } from "@/components/admin/data-table";
import {
  categoriesApi,
  servicesApi,
  type ServiceCreatePayload,
  type ServiceFilters,
  type ServiceUpdatePayload,
} from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useToast } from "@/components/ui/toast";
import type { Category, Service } from "@/types/api";

export default function ServicesPage() {
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: number }[]>([]);
  const { locale } = useI18n();
  const labels = getLabels(locale);
  const toast = useToast();

  const loadCategories = useCallback(async () => {
    try {
      const result = await categoriesApi.list({});
      setCategoryOptions(
        result.items
          .filter((category): category is typeof category & { id: number } => typeof category.id === "number")
          .map((category) => ({
            label: localizedCategoryName(category, locale) || `${getLabels(locale).category} #${category.id}`,
            value: category.id,
          })),
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : getLabels(locale).categoriesLoadFailed);
    }
  }, [locale, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  const filters = useMemo<FilterField<ServiceFilters>[]>(
    () => [
      {
        name: "name",
        label: labels.search,
        type: "text",
        placeholder: labels.searchPlaceholder,
        hideLabel: true,
        compact: true,
        prefixIcon: <Search className="size-4" />,
      },
      {
        name: "category_id",
        label: labels.category,
        type: "select",
        placeholder: labels.categoryAll,
        options: categoryOptions,
        hideLabel: true,
        compact: true,
      },
      {
        name: "status",
        label: labels.status,
        type: "select",
        placeholder: labels.statusAll,
        options: [
          { label: labels.active, value: "1" },
          { label: labels.inactive, value: "0" },
        ],
        hideLabel: true,
        compact: true,
      },
      {
        name: "sort_order",
        label: labels.sortOrder,
        type: "number",
        placeholder: labels.sortOrderPlaceholder,
        hideLabel: true,
        compact: true,
      },
    ],
    [
      categoryOptions,
      labels.active,
      labels.category,
      labels.categoryAll,
      labels.inactive,
      labels.search,
      labels.searchPlaceholder,
      labels.sortOrder,
      labels.sortOrderPlaceholder,
      labels.status,
      labels.statusAll,
    ],
  );
  const columns: DataTableColumn<Service>[] = [
    { key: "id", label: "ID", kind: "number" },
    { key: "name", label: labels.name, render: (row) => localizedName(row, locale) },
    { key: "slug", label: "Slug" },
    { key: "status", label: labels.status, kind: "status" },
  ];
  const createFields: CrudField<ServiceCreatePayload>[] = [
    { name: "name_uz", label: labels.nameUz, required: true },
    { name: "name_ru", label: labels.nameRu },
    { name: "name_en", label: labels.nameEn },
    { name: "slug", label: "Slug", required: true },
    { name: "parent_id", label: labels.parentId, type: "number" },
    { name: "description_uz", label: labels.descriptionUz, type: "textarea" },
    { name: "description_ru", label: labels.descriptionRu, type: "textarea" },
    { name: "description_en", label: labels.descriptionEn, type: "textarea" },
    { name: "sort_order", label: labels.sortOrder, type: "number" },
    { name: "status", label: labels.status, type: "number" },
  ];
  const updateFields: CrudField<ServiceUpdatePayload>[] = [
    { name: "name_uz", label: labels.nameUz, required: true },
    { name: "name_ru", label: labels.nameRu },
    { name: "name_en", label: labels.nameEn },
    { name: "slug", label: "Slug" },
    { name: "parent_id", label: labels.parentId, type: "number" },
    { name: "description_uz", label: labels.descriptionUz, type: "textarea" },
    { name: "description_ru", label: labels.descriptionRu, type: "textarea" },
    { name: "description_en", label: labels.descriptionEn, type: "textarea" },
    { name: "sort_order", label: labels.sortOrder, type: "number" },
    { name: "status", label: labels.status, type: "number" },
  ];

  return (
    <CrudPage<Service, ServiceFilters, ServiceCreatePayload, ServiceUpdatePayload>
      title={labels.title}
      eyebrow={labels.eyebrow}
      description={labels.pageDescription}
      columns={columns}
      filterFields={filters}
      createFields={createFields}
      updateFields={updateFields}
      initialFilters={{ name: "", category_id: "", sort_order: "", status: "" }}
      filterGridClassName="md:grid-cols-[minmax(180px,1.2fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_minmax(140px,0.65fr)_auto] md:items-center"
      inlineFilterActions
      autoApplyFilters
      filterDebounceMs={450}
      showFilterSearchButton={false}
      showFilterSettingsButton
      list={servicesApi.list}
      create={servicesApi.create}
      update={servicesApi.update}
      remove={servicesApi.delete}
    />
  );
}

function getLabels(locale: string) {
  if (locale === "ru") {
    return {
      categoriesLoadFailed: "Не удалось загрузить категории",
      category: "Категория",
      categoryAll: "Категория: Все",
      descriptionEn: "Описание EN",
      descriptionRu: "Описание RU",
      descriptionUz: "Описание UZ",
      eyebrow: "Услуги",
      name: "Название",
      nameEn: "Название EN",
      nameRu: "Название RU",
      nameUz: "Название UZ",
      pageDescription: "Просмотр, добавление и редактирование услуг артистов.",
      parentId: "ID родителя",
      sortOrder: "Порядок",
      sortOrderPlaceholder: "Порядок",
      search: "Поиск",
      searchPlaceholder: "Поиск...",
      status: "Статус",
      statusAll: "Статус: Все",
      active: "Активный",
      inactive: "Неактивный",
      title: "Услуги",
    };
  }

  return {
    categoriesLoadFailed: "Kategoriyalar yuklanmadi",
    category: "Kategoriya",
    categoryAll: "Kategoriya: Barchasi",
    descriptionEn: "Tavsif EN",
    descriptionRu: "Tavsif RU",
    descriptionUz: "Tavsif UZ",
    eyebrow: "Xizmatlar",
    name: "Nomi",
    nameEn: "Nomi EN",
    nameRu: "Nomi RU",
    nameUz: "Nomi UZ",
    pageDescription: "Sanatkorlar taklif qiladigan xizmatlarni ko'rish, qo'shish va tahrirlash.",
    parentId: "Asosiy ID",
    sortOrder: "Tartib",
    sortOrderPlaceholder: "Tartib raqami",
    search: "Qidirish",
    searchPlaceholder: "Qidirish...",
    status: "Holat",
    statusAll: "Holat: Barchasi",
    active: "Faol",
    inactive: "Faol emas",
    title: "Xizmatlar",
  };
}

function localizedCategoryName(record: Pick<Category, "name_uz" | "name_ru" | "name_en">, locale: string) {
  if (locale === "ru") return record.name_ru || record.name_uz || record.name_en || "";
  if (locale === "en") return record.name_en || record.name_uz || record.name_ru || "";
  return record.name_uz || record.name_ru || record.name_en || "";
}

function localizedName(record: Pick<Service, "name_uz" | "name_ru" | "name_en">, locale: string) {
  if (locale === "ru") return record.name_ru || record.name_uz || record.name_en || "—";
  if (locale === "en") return record.name_en || record.name_uz || record.name_ru || "—";
  return record.name_uz || record.name_ru || record.name_en || "—";
}
