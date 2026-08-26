"use client";

import { Search } from "lucide-react";
import { CrudPage, type CrudField, type FilterField } from "@/components/admin/crud-page";
import type { DataTableColumn } from "@/components/admin/data-table";
import { faqApi, type FaqFilters, type FaqPayload } from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getDashboardStatus } from "@/lib/i18n/dashboard-copy";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Faq } from "@/types/api";

export default function FaqPage() {
  const { locale } = useI18n();
  const labels = getLabels(locale);
  const columns: DataTableColumn<Faq>[] = [
    { key: "public_id", label: "Public ID", render: (row) => row.public_id ?? "—" },
    { key: "question_uz", label: labels.questionUz },
    { key: "question_ru", label: labels.questionRu },
    { key: "answer_uz", label: labels.answerUz },
    { key: "status", label: labels.status, render: (row) => <StatusBadge value={row.status} fieldKey="is_active" /> },
    { key: "sort_order", label: labels.sortOrder, kind: "number" },
    { key: "created_at", label: labels.createdAt, kind: "date" },
  ];
  const filters: FilterField<FaqFilters>[] = [
    {
      name: "search",
      label: labels.search,
      placeholder: labels.searchPlaceholder,
      hideLabel: true,
      compact: true,
      prefixIcon: <Search className="size-4" />,
    },
    {
      name: "status",
      label: labels.status,
      type: "select",
      placeholder: labels.status,
      options: [
        { label: getDashboardStatus("resource", 1, locale).label, value: 1 },
        { label: getDashboardStatus("resource", 0, locale).label, value: 0 },
      ],
      hideLabel: true,
      compact: true,
    },
  ];
  const fields: CrudField<FaqPayload>[] = [
    { name: "question_uz", label: labels.questionUz, required: true },
    { name: "question_ru", label: labels.questionRu },
    { name: "question_en", label: labels.questionEn },
    { name: "answer_uz", label: labels.answerUz, type: "textarea", required: true },
    { name: "answer_ru", label: labels.answerRu, type: "textarea" },
    { name: "answer_en", label: labels.answerEn, type: "textarea" },
    { name: "sort_order", label: labels.sortOrder, type: "number" },
    {
      name: "status",
      label: labels.status,
      type: "select",
      options: [
        { label: getDashboardStatus("resource", 1, locale).label, value: 1 },
        { label: getDashboardStatus("resource", 0, locale).label, value: 0 },
      ],
    },
  ];

  return (
    <CrudPage<Faq, FaqFilters, FaqPayload, FaqPayload>
      title={labels.title}
      eyebrow={labels.eyebrow}
      description={labels.description}
      columns={columns}
      filterFields={filters}
      createFields={fields}
      updateFields={fields}
      initialFilters={{ search: "", status: "", page: 1, limit: 20 }}
      filterGridClassName="md:grid-cols-[auto_minmax(150px,0.75fr)_auto] md:items-center"
      inlineFilterActions
      autoApplyFilters
      showFilterSettingsButton
      showFilterSearchButton={false}
      pagination={{ limit: 20 }}
      list={faqApi.list}
      detail={faqApi.detail}
      create={faqApi.create}
      update={faqApi.update}
      remove={faqApi.delete}
    />
  );
}

function getLabels(locale: string) {
  if (locale === "ru") {
    return {
      answerEn: "Ответ EN",
      answerRu: "Ответ RU",
      answerUz: "Ответ UZ",
      createdAt: "Создано",
      description: "Просмотр, добавление и редактирование часто задаваемых вопросов.",
      eyebrow: "Помощь",
      questionEn: "Вопрос EN",
      questionRu: "Вопрос RU",
      questionUz: "Вопрос UZ",
      search: "Поиск",
      searchPlaceholder: "Вопрос или ответ",
      sortOrder: "Порядок",
      status: "Статус",
      title: "Вопросы и ответы",
    };
  }

  return {
    answerEn: "Javob EN",
    answerRu: "Javob RU",
    answerUz: "Javob UZ",
    createdAt: "Yaratilgan",
    description: "Ko'p so'raladigan savollarni ko'rish, qo'shish va tahrirlash.",
    eyebrow: "Yordam",
    questionEn: "Savol EN",
    questionRu: "Savol RU",
    questionUz: "Savol UZ",
    search: "Qidiruv",
    searchPlaceholder: "Savol yoki javob",
    sortOrder: "Tartib",
    status: "Holat",
    title: "Savol-javob",
  };
}
