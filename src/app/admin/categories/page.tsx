"use client";

import { CrudPage, type CrudField, type FilterField } from "@/components/admin/crud-page";
import type { DataTableColumn } from "@/components/admin/data-table";
import {
  categoriesApi,
  type CategoryCreatePayload,
  type CategoryFilters,
  type CategoryUpdatePayload,
} from "@/lib/api/admin-content";
import type { Category } from "@/types/api";

const columns: DataTableColumn<Category>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "name_uz", label: "Nomi UZ" },
  { key: "name_ru", label: "Nomi RU" },
  { key: "name_en", label: "Nomi EN" },
  { key: "parent_id", label: "Asosiy ID", kind: "number" },
  { key: "slug", label: "Slug" },
  { key: "status", label: "Holat", kind: "status" },
  { key: "sort_order", label: "Tartib", kind: "number" },
];

const filters: FilterField<CategoryFilters>[] = [
  { name: "name", label: "Nomi", placeholder: "Kategoriya nomi" },
  { name: "parent_id", label: "Asosiy ID", type: "number" },
  { name: "status", label: "Holat", type: "number" },
];

const createFields: CrudField<CategoryCreatePayload>[] = [
  { name: "name_uz", label: "Nomi UZ", required: true },
  { name: "name_ru", label: "Nomi RU" },
  { name: "name_en", label: "Nomi EN" },
  { name: "parent_id", label: "Asosiy ID", type: "number" },
  { name: "icon", label: "Icon" },
  { name: "sort_order", label: "Tartib", type: "number" },
  { name: "status", label: "Holat", type: "number" },
];

const updateFields: CrudField<CategoryUpdatePayload>[] = [
  { name: "name_uz", label: "Nomi UZ", required: true },
  { name: "name_ru", label: "Nomi RU" },
  { name: "name_en", label: "Nomi EN" },
  { name: "slug", label: "Slug" },
  { name: "parent_id", label: "Asosiy ID", type: "number" },
  { name: "icon", label: "Icon" },
  { name: "sort_order", label: "Tartib", type: "number" },
  { name: "status", label: "Holat", type: "number" },
];

export default function CategoriesPage() {
  return (
    <CrudPage<Category, CategoryFilters, CategoryCreatePayload, CategoryUpdatePayload>
      title="Kategoriyalar"
      eyebrow="Ma'lumotlar"
      description="Xizmat kategoriyalarini ko'rish, qo'shish va tartiblash."
      columns={columns}
      filterFields={filters}
      createFields={createFields}
      updateFields={updateFields}
      initialFilters={{ name: "", parent_id: "", status: "" }}
      list={categoriesApi.list}
      detail={categoriesApi.detail}
      create={categoriesApi.create}
      update={categoriesApi.update}
      remove={categoriesApi.delete}
      restore={categoriesApi.restore}
    />
  );
}
