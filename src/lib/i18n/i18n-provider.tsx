"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  defaultLocale,
  isLocale,
  localeStorageKey,
  translations,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n/translations";

type TranslateParams = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const localeChangeEvent = "artistbor:locale-change";

function getStoredLocale() {
  const storedLocale = window.localStorage.getItem(localeStorageKey);
  return isLocale(storedLocale) ? storedLocale : defaultLocale;
}

function getServerLocale() {
  return defaultLocale;
}

function subscribeToLocaleChange(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(localeChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localeChangeEvent, callback);
  };
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocaleChange,
    getStoredLocale,
    getServerLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(localeStorageKey, nextLocale);
    window.dispatchEvent(new Event(localeChangeEvent));
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "uz" ? "ru" : "uz");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => {
      const template: string =
        translations[locale][key] ?? translations[defaultLocale][key] ?? key;
      if (!params) return template;

      let result = template;
      for (const [paramKey, value] of Object.entries(params)) {
        result = result.replaceAll(`{${paramKey}}`, String(value));
      }
      return result;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
