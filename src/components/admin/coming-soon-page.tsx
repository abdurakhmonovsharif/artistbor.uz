"use client";

import { useI18n } from "@/lib/i18n/i18n-provider";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export function ComingSoonPage({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  const { locale } = useI18n();
  const comingNext = locale === "ru" ? "Следующий этап" : "Coming next phase";
  const notConnected = locale === "ru" ? "Пока не подключено" : "Hali ulanmagan";
  const description =
    locale === "ru"
      ? "Этот раздел пока находится в разработке. Полная функциональность будет добавлена в следующих обновлениях."
      : "Bu bo'lim hozircha tayyorlanmoqda. To'liq funksiyalar keyingi yangilanishlarda qo'shiladi.";

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader eyebrow={eyebrow} title={title} description={comingNext} />

      <div className="rounded-[18px] border border-artistbor-border bg-artistbor-surface p-6 shadow-[var(--artistbor-surface-shadow)]">
        <h2 className="text-base font-bold text-artistbor-primary">
          {notConnected}
        </h2>
        <p className="mt-2 text-sm leading-6 text-artistbor-secondary">
          {description}
        </p>
      </div>
    </section>
  );
}
