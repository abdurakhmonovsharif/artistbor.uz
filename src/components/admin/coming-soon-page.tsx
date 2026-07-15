"use client";

import { useI18n } from "@/lib/i18n/i18n-provider";

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
      <div>
        <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[2px] text-[#f97316]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-[30px] tracking-[-0.02em] text-[#0f172a] dark:text-white md:text-[30px] md:leading-9">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-[22px] text-[#64748b] dark:text-slate-400">
          {comingNext}
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950">
        <h2 className="text-base font-black text-slate-950 dark:text-white">
          {notConnected}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </section>
  );
}
