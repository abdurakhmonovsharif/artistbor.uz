"use client";

import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { localeLabels, locales, type Locale } from "@/lib/i18n/translations";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 shadow-none transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("language.label")}
        title={t("language.label")}
      >
        <Languages className="size-4" />
        <span>{localeLabels[locale]}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-none dark:border-white/10 dark:bg-[#111827]"
        >
          {locales.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitemradio"
              aria-checked={item === locale}
              onClick={() => selectLocale(item)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-black text-slate-600 transition hover:bg-amber-50 hover:text-amber-700 aria-checked:bg-amber-400 aria-checked:text-slate-950 dark:text-slate-200 dark:hover:bg-amber-400/10 dark:hover:text-amber-300 dark:aria-checked:bg-amber-400 dark:aria-checked:text-slate-950"
            >
              <span>{item === "uz" ? t("language.uz") : t("language.ru")}</span>
              <span className="text-xs">{localeLabels[item]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
