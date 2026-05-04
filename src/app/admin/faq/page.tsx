"use client";

import { CrudPage, type CrudField, type FilterField } from "@/components/admin/crud-page";
import type { DataTableColumn } from "@/components/admin/data-table";
import { faqApi, type FaqFilters, type FaqPayload } from "@/lib/api/admin-content";
import type { Faq } from "@/types/api";

const columns: DataTableColumn<Faq>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "question_uz", label: "Savol UZ" },
  { key: "question_ru", label: "Savol RU" },
  { key: "answer_uz", label: "Javob UZ" },
  { key: "status", label: "Holat", kind: "status" },
  { key: "sort_order", label: "Tartib", kind: "number" },
  { key: "created_at", label: "Yaratilgan", kind: "date" },
];

const filters: FilterField<FaqFilters>[] = [
  { name: "search", label: "Qidiruv", placeholder: "Savol yoki javob" },
  { name: "status", label: "Holat", type: "number" },
];

const fields: CrudField<FaqPayload>[] = [
  { name: "question_uz", label: "Savol UZ", required: true },
  { name: "question_ru", label: "Savol RU" },
  { name: "question_en", label: "Savol EN" },
  { name: "answer_uz", label: "Javob UZ", type: "textarea", required: true },
  { name: "answer_ru", label: "Javob RU", type: "textarea" },
  { name: "answer_en", label: "Javob EN", type: "textarea" },
  { name: "sort_order", label: "Tartib", type: "number" },
  { name: "status", label: "Holat", type: "number" },
];

export default function FaqPage() {
  return (
    <CrudPage<Faq, FaqFilters, FaqPayload, FaqPayload>
      title="Savol-javob"
      eyebrow="Yordam"
      description="Ko'p so'raladigan savollarni ko'rish, qo'shish va tahrirlash."
      columns={columns}
      filterFields={filters}
      createFields={fields}
      updateFields={fields}
      initialFilters={{ search: "", status: "", page: 1, limit: 20 }}
      pagination={{ limit: 20 }}
      list={faqApi.list}
      detail={faqApi.detail}
      create={faqApi.create}
      update={faqApi.update}
      remove={faqApi.delete}
    />
  );
}
