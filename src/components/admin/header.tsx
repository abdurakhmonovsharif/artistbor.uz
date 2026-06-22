"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Globe2, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, UserCog } from "lucide-react";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/auth-provider";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { formatPhone, normalizePhoneForApi } from "@/lib/phone-format";
import { localeLabels, locales, type Locale } from "@/lib/i18n/translations";
import { useTheme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";

export function Header({
  user,
  navigationExpanded,
  pendingOrdersCount,
  onToggleNavigation,
  onLogout,
}: {
  user: User | null;
  navigationExpanded: boolean;
  pendingOrdersCount?: number;
  onToggleNavigation: () => void;
  onLogout: () => void;
}) {
  const { t } = useI18n();
  const [profileOpen, setProfileOpen] = useState(false);
  const pendingOrderBadge = formatHeaderBadge(pendingOrdersCount);
  const formattedPhone = formatPhone(user?.phone);
  const name = String(
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    formattedPhone ||
    t("common.administrator"),
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#111827] lg:px-8">
        <div className="flex min-h-14 items-center gap-4">
          <button
            type="button"
            onClick={onToggleNavigation}
            className="grid size-10 shrink-0 place-items-center rounded-[8px] border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-300/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            aria-label={t("sidebar.openMenu")}
            title={t("sidebar.openMenu")}
          >
            {navigationExpanded ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
          </button>

          <h1 className="min-w-0 truncate text-sm font-black text-slate-950 dark:text-white sm:text-[15px]">
            {t("menu.dashboard")}
          </h1>

          <div className="flex-1" />

          <HeaderLanguageControl />
          <HeaderThemeButton />
          <Link
            href="/admin/orders?status=10"
            className="relative hidden size-10 shrink-0 place-items-center rounded-[8px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] sm:grid"
            aria-label={t("menu.orders")}
            title={t("menu.orders")}
          >
            <Bell className="size-4" />
            {pendingOrderBadge ? (
              <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-black leading-4 text-white">
                {pendingOrderBadge}
              </span>
            ) : null}
          </Link>
          <UserMenu
            name={name}
            phoneLabel={formattedPhone}
            roleLabel={formatRole(user?.role, t)}
            onLogout={onLogout}
            onProfile={() => setProfileOpen(true)}
          />
        </div>
      </header>
      {profileOpen ? (
        <ProfileDrawer
          key={user?.id ?? "profile"}
          open={profileOpen}
          user={user}
          onClose={() => setProfileOpen(false)}
        />
      ) : null}
    </>
  );
}

function HeaderLanguageControl() {
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
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-300/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("language.label")}
        title={t("language.label")}
      >
        <Globe2 className="size-4" />
        <span>{localeLabels[locale]}</span>
        <ChevronDown className="size-3.5 text-slate-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-[8px] border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/15 dark:border-white/10 dark:bg-[#111827]"
        >
          {locales.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitemradio"
              aria-checked={item === locale}
              onClick={() => selectLocale(item)}
              className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-bold text-slate-600 transition hover:bg-amber-50 hover:text-amber-700 aria-checked:bg-amber-400 aria-checked:text-slate-950 dark:text-slate-200 dark:hover:bg-amber-400/10 dark:hover:text-amber-300 dark:aria-checked:bg-amber-400 dark:aria-checked:text-slate-950"
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

function HeaderThemeButton() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const label = isDark ? t("theme.light") : t("theme.dark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="hidden size-10 shrink-0 place-items-center rounded-[8px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-300/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] sm:grid"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function UserMenu({
  name,
  phoneLabel,
  roleLabel,
  onLogout,
  onProfile,
}: {
  name: string;
  phoneLabel: string;
  roleLabel: string;
  onLogout: () => void;
  onProfile: () => void;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labels = profileLabels(locale, t);
  const subtitle = phoneLabel && name !== phoneLabel ? phoneLabel : roleLabel;

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

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  const handleProfile = () => {
    setOpen(false);
    onProfile();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-11 cursor-pointer items-center gap-3 rounded-[8px] border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/40 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
          "max-w-[300px]",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="hidden min-w-0 sm:block">
          <span className="block whitespace-nowrap text-xs font-black text-slate-950 dark:text-white">
            {name}
          </span>
          <span className="block truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {roleLabel}
          </span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ffb357] text-sm font-black text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-13 z-50 w-56 overflow-hidden rounded-[8px] border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/15 dark:border-white/10 dark:bg-[#111827]"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">{name}</p>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleProfile}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
          >
            <UserCog className="size-4" />
            {labels.profile}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <LogOut className="size-4" />
            {t("admin.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProfileDrawer({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: User | null;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const { updateProfile } = useAuth();
  const toast = useToast();
  const labels = profileLabels(locale, t);
  const [values, setValues] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: formatPhone(user?.phone),
    email: user?.email ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.first_name.trim()) nextErrors.first_name = labels.required;
    if (!values.phone.trim()) nextErrors.phone = labels.required;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await updateProfile({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim() || undefined,
        phone: normalizePhoneForApi(values.phone),
        email: values.email.trim() || undefined,
      });
      toast.success(labels.updated);
      onClose();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.updateFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AdminDrawer
      open={open}
      title={labels.editProfile}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.04]"
          >
            {t("actions.close")}
          </button>
          <button
            type="submit"
            form="admin-profile-form"
            disabled={saving}
            className="h-10 rounded-lg border border-amber-300 bg-amber-400 px-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("crud.saving") : t("actions.save")}
          </button>
        </div>
      }
      size="min(100vw, 460px)"
    >
      <form id="admin-profile-form" className="space-y-4 p-4" onSubmit={submit}>
        <FormField
          compact
          required
          label={labels.firstName}
          value={values.first_name}
          error={errors.first_name}
          onChange={(first_name) => setValues((current) => ({ ...current, first_name }))}
        />
        <FormField
          compact
          label={labels.lastName}
          value={values.last_name}
          onChange={(last_name) => setValues((current) => ({ ...current, last_name }))}
        />
        <FormField
          compact
          required
          label={labels.phone}
          value={values.phone}
          error={errors.phone}
          placeholder="+998..."
          onChange={(phone) => setValues((current) => ({ ...current, phone: formatPhone(phone) }))}
        />
        <FormField
          compact
          label={labels.email}
          value={values.email}
          placeholder="name@example.com"
          onChange={(email) => setValues((current) => ({ ...current, email }))}
        />
      </form>
    </AdminDrawer>
  );
}

function formatRole(role: User["role"], t: ReturnType<typeof useI18n>["t"]) {
  if (role === 30) return t("roles.admin");
  if (role === 25) return t("roles.moderator");
  if (role === 20) return t("roles.operator");
  if (role === 10) return t("roles.client");
  if (role === "admin") return t("roles.admin");
  if (role === "moderator") return t("roles.moderator");
  if (role === "operator") return t("roles.operator");
  if (role === "artist") return t("roles.artist");
  if (role === "client") return t("roles.client");
  return String(role ?? t("roles.admin"));
}

function formatHeaderBadge(value?: number) {
  if (!value || value <= 0) return "";
  if (value > 99) return "99+";
  return String(value);
}

function profileLabels(locale: Locale, t: ReturnType<typeof useI18n>["t"]) {
  const isRu = locale === "ru";
  return {
    profile: isRu ? "Профиль" : "Profil",
    editProfile: isRu ? "Редактировать профиль" : "Profilni tahrirlash",
    firstName: isRu ? "Имя" : "Ism",
    lastName: isRu ? "Фамилия" : "Familiya",
    phone: isRu ? "Телефон" : "Telefon",
    email: "Email",
    required: t("common.requiredField"),
    updated: isRu ? "Профиль обновлен" : "Profil yangilandi",
    updateFailed: isRu ? "Не удалось обновить профиль" : "Profilni yangilash bajarilmadi",
  };
}
