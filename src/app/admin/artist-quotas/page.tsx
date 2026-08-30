"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Select } from "antd";
import { RotateCcw, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArtistQuotaDrawer } from "@/components/admin/artist-quotas/artist-quota-drawer";
import { ArtistQuotaTable } from "@/components/admin/artist-quotas/artist-quota-table";
import type { ArtistQuotaLabels, ArtistQuotaRow } from "@/components/admin/artist-quotas/types";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Pagination } from "@/components/admin/pagination";
import { artistsApi, type ArtistFilters } from "@/lib/api/admin-content";
import { artistQuotasApi } from "@/lib/api/artist-quotas";
import { useAuth } from "@/lib/auth/auth-provider";
import { canUseAdminAction } from "@/lib/auth/permissions";
import {
  buildMonthlyOrderLimitPayload,
  readArtistQuota,
  readMonthlyOrderLimit,
  type ArtistQuota,
  type ArtistQuotaDetails,
  type MonthlyOrderLimitMode,
} from "@/lib/artist-quota";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { formatPhone } from "@/lib/phone-format";
import { useToast } from "@/components/ui/toast";
import { cn, isRecord } from "@/lib/utils";
import type { ArtistProfile, ListResult, UnknownRecord } from "@/types/api";

const pageSize = 20;

const initialFilters: ArtistFilters = {
  limit: pageSize,
  page: 1,
  search: "",
  status: "",
};

export default function ArtistQuotasPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const labels = getLabels(locale);
  const canEdit = canUseAdminAction(user?.role, "artistQuotaManage");
  const [filters, setFilters] = useState<ArtistFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ArtistFilters>(initialFilters);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [meta, setMeta] = useState<ListResult<ArtistProfile>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ArtistQuotaRow | null>(null);
  const [drawerDetails, setDrawerDetails] = useState<ArtistQuotaDetails | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => artists.flatMap(toQuotaRow), [artists]);

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await artistsApi.list(filters);
      setArtists(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed]);

  useEffect(() => {
    let cancelled = false;

    const loadForFilters = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await artistsApi.list(filters);
        if (cancelled) return;
        setArtists(result.items);
        setMeta(result.meta);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : labels.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadForFilters();
    return () => {
      cancelled = true;
    };
  }, [filters, labels.loadFailed]);

  const openDrawer = async (row: ArtistQuotaRow) => {
    setSelectedRow(row);
    setDrawerDetails(row.quota ? { quota: row.quota, history: [] } : null);
    setDrawerError(null);
    setDrawerLoading(true);
    try {
      const details = await artistQuotasApi.detail(row.artistId);
      setDrawerDetails(details);
    } catch (caught) {
      setDrawerError(caught instanceof Error ? caught.message : labels.detailLoadFailed);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedRow(null);
    setDrawerDetails(null);
    setDrawerError(null);
  };

  const saveLimit = async (mode: MonthlyOrderLimitMode, customLimit: string) => {
    if (!selectedRow) return;
    let monthlyOrderLimit: number | null;
    try {
      monthlyOrderLimit = buildMonthlyOrderLimitPayload(mode, customLimit).monthly_order_limit;
    } catch {
      setDrawerError(labels.customLimitInvalid);
      return;
    }

    setSaving(true);
    setDrawerError(null);
    try {
      const returnedQuota = await artistQuotasApi.update(selectedRow.artistId, monthlyOrderLimit);
      setArtists((current) => current.map((artist) => patchArtistQuota(artist, selectedRow.artistId, monthlyOrderLimit, returnedQuota)));
      setSelectedRow((current) => current ? {
        ...current,
        monthlyOrderLimit,
        quota: mergeQuota(current.quota, returnedQuota),
      } : current);
      setDrawerDetails((current) => current ? {
        ...current,
        quota: mergeQuota(current.quota, returnedQuota),
      } : current);
      toast.success(labels.saveSuccess);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : labels.saveFailed;
      setDrawerError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const applyDraftFilters = useCallback(() => {
    setFilters((current) => {
      const nextSearch = draftFilters.search ?? "";
      const nextStatus = draftFilters.status ?? "";
      if (current.search === nextSearch && current.status === nextStatus) return current;
      return { ...current, page: 1, search: nextSearch, status: nextStatus };
    });
  }, [draftFilters.search, draftFilters.status]);

  useEffect(() => {
    const timer = window.setTimeout(applyDraftFilters, 350);
    return () => window.clearTimeout(timer);
  }, [applyDraftFilters]);

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyDraftFilters();
  };

  return (
    <section className="artistbor-admin-page artistbor-responsive-data-page w-full space-y-4">
      <AdminPageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        actions={(
          <button type="button" onClick={() => void fetchArtists()} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-md border border-artistbor-border bg-artistbor-surface px-4 text-sm font-bold text-artistbor-secondary transition-[background-color,border-color,color,transform] duration-150 hover:border-slate-300 hover:bg-artistbor-surface-subtle hover:text-artistbor-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:border-slate-600">
            {labels.refresh}
          </button>
        )}
      />

      <form onSubmit={submitFilters} className="artistbor-table-filter-shell artistbor-responsive-filter-shell">
        <div className="artistbor-table-filter-panel artistbor-responsive-filter-panel">
          <Input
            allowClear
            className={cn(
              "artistbor-table-filter-control artistbor-filter-search artistbor-artist-search h-10",
              draftFilters.search && "artistbor-filter-search-active",
            )}
            prefix={<Search className="size-4 text-[#94a3b8]" />}
            placeholder={labels.searchPlaceholder}
            value={draftFilters.search ?? ""}
            onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
            onPressEnter={applyDraftFilters}
          />
          <Select
            className="artistbor-compact-select artistbor-table-filter-control !h-10 !w-[170px] shrink-0 md:justify-self-start"
            value={draftFilters.status ?? ""}
            onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
            options={[
              { label: labels.allStatuses, value: "" },
              { label: labels.active, value: "10" },
              { label: labels.inactive, value: "9" },
              { label: labels.blocked, value: "20" },
            ]}
          />
          <Button
            htmlType="button"
            className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 w-28 shrink-0"
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            {labels.reset}
          </Button>
        </div>
      </form>

      {loading ? <LoadingState label={labels.loading} /> : error ? (
        <div className="rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]"><ErrorState message={error} /><div className="pb-6 text-center"><button type="button" onClick={() => void fetchArtists()} className="rounded-lg border border-artistbor-border px-4 py-2 text-sm font-bold text-artistbor-secondary transition hover:bg-artistbor-surface-subtle">{labels.errorRetry}</button></div></div>
      ) : (
        <>
          <ArtistQuotaTable canEdit={canEdit} labels={labels} rows={rows} onOpen={(row) => void openDrawer(row)} />
          <Pagination meta={meta} page={Number(filters.page) || 1} pageSize={Number(filters.limit) || pageSize} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} onPageSizeChange={(limit) => {
            setDraftFilters((current) => ({ ...current, limit }));
            setFilters((current) => ({ ...current, limit, page: 1 }));
          }} />
        </>
      )}

      <ArtistQuotaDrawer
        key={selectedRow ? `${selectedRow.artistId}:${selectedRow.monthlyOrderLimit ?? "default"}` : "empty"}
        canEdit={canEdit}
        details={drawerDetails}
        error={drawerError}
        labels={labels}
        loading={drawerLoading}
        open={Boolean(selectedRow)}
        row={selectedRow}
        saving={saving}
        onClose={closeDrawer}
        onSave={saveLimit}
      />
    </section>
  );
}

function toQuotaRow(artist: ArtistProfile): ArtistQuotaRow[] {
  const artistId = artist.user_id ?? artist.id;
  if (!artistId) return [];
  const raw = artist as UnknownRecord;
  const profile = isRecord(raw.artistProfile) ? raw.artistProfile : isRecord(raw.artist_profile) ? raw.artist_profile : undefined;
  const read = (key: string) => raw[key] !== undefined ? raw[key] : profile?.[key];
  const firstName = text(read("first_name"));
  const lastName = text(read("last_name"));
  const name = text(read("stage_name")) ?? text(read("full_name")) ?? ([firstName, lastName].filter(Boolean).join(" ") || `${artistId}`);
  const quota = readArtistQuota(read("quota"));

  return [{
    artistId,
    monthlyOrderLimit: readMonthlyOrderLimit(read("monthly_order_limit")),
    name,
    phone: text(read("phone")) ? formatPhone(read("phone")) : undefined,
    publicId: identifier(read("public_id")),
    quota,
    status: text(read("status_label")) ?? text(read("status")),
  }];
}

function patchArtistQuota(artist: ArtistProfile, artistId: number, monthlyOrderLimit: number | null, returnedQuota: ArtistQuota | null) {
  if ((artist.user_id ?? artist.id) !== artistId) return artist;
  return {
    ...artist,
    monthly_order_limit: monthlyOrderLimit,
    quota: mergeQuota(readArtistQuota((artist as UnknownRecord).quota), returnedQuota),
  } as ArtistProfile;
}

function mergeQuota(current: ArtistQuota | null, next: ArtistQuota | null) {
  if (!current && !next) return null;
  return { ...current, ...next };
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function identifier(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return typeof value === "number" && Number.isFinite(value) ? String(value) : undefined;
}

function getLabels(locale: "uz" | "ru"): ArtistQuotaLabels & Record<string, string> {
  if (locale === "ru") return {
    action: "Действия", active: "Активный", allStatuses: "Все статусы", allTime: "За все время", apply: "Применить", artistsOnPage: "Артистов на странице", blocked: "Заблокирован", cancel: "Отмена", countingOnly: "Только учет", customLimit: "Свой лимит", customLimitHelp: "Укажите целое число больше нуля.", customLimitInvalid: "Укажите лимит больше нуля или выберите безлимитный режим.", defaultLimit: "Системный", defaultLimitHelp: "Используется системное значение.", description: "Контроль подтвержденных заказов и индивидуальных месячных лимитов артистов.", detailLoadFailed: "Не удалось загрузить квоту артиста", edit: "Изменить", enforced: "Статус лимита", enforcedActive: "Включен", errorRetry: "Повторить", eyebrow: "Артисты", history: "История по месяцам", id: "ID", inactive: "Неактивный", limit: "Месячный лимит", limitOnlyCounts: "Сейчас лимит только учитывается: прием заказов не блокируется, пока серверный enforce-режим выключен.", limitedOnPage: "С лимитом на странице", loadFailed: "Не удалось загрузить лимиты артистов", loading: "Лимиты артистов загружаются...", noArtists: "Артисты по этим фильтрам не найдены", period: "Период", refresh: "Обновить", remaining: "Осталось", reset: "Сбросить", save: "Сохранить", saveFailed: "Не удалось сохранить лимит", saveSuccess: "Лимит артиста сохранен", saving: "Сохранение...", searchPlaceholder: "Имя артиста, telefon yoki ID", status: "Статус", title: "Лимиты артистов", total: "Артист", unlimited: "Безлимитный", unlimitedHelp: "Заказы не ограничиваются.", unlimitedOnPage: "Безлимитных на странице", used: "Использовано", usedOnPage: "Использовано на странице", view: "Просмотр" };
  return {
    action: "Amallar", active: "Faol", allStatuses: "Barcha statuslar", allTime: "Barcha vaqt", apply: "Qo‘llash", artistsOnPage: "Sahifadagi artistlar", blocked: "Bloklangan", cancel: "Bekor qilish", countingOnly: "Faqat hisob", customLimit: "Maxsus limit", customLimitHelp: "Noldan katta butun son kiriting.", customLimitInvalid: "Noldan katta limit kiriting yoki cheksiz rejimni tanlang.", defaultLimit: "Tizim defaulti", defaultLimitHelp: "Tizimning umumiy qiymati ishlatiladi.", description: "Artistlarning tasdiqlangan buyurtmalari va individual oylik limitlarini nazorat qiling.", detailLoadFailed: "Artist kvotasini yuklab bo‘lmadi", edit: "Tahrirlash", enforced: "Limit holati", enforcedActive: "Faol", errorRetry: "Qayta urinish", eyebrow: "Artistlar", history: "Oylar bo‘yicha tarix", id: "ID", inactive: "Nofaol", limit: "Oylik limit", limitOnlyCounts: "Hozir limit faqat hisoblanadi: serverdagi enforce rejimi yoqilmaguncha buyurtma qabul qilish to‘xtatilmaydi.", limitedOnPage: "Limitli sahifada", loadFailed: "Artist limitlari yuklanmadi", loading: "Artist limitlari yuklanmoqda...", noArtists: "Bu filtrlar bo‘yicha artist topilmadi", period: "Davr", refresh: "Yangilash", remaining: "Qolgan", reset: "Tozalash", save: "Saqlash", saveFailed: "Limitni saqlab bo‘lmadi", saveSuccess: "Artist limiti saqlandi", saving: "Saqlanmoqda...", searchPlaceholder: "Artist ismi, telefoni yoki ID", status: "Status", title: "Artistlar limiti", total: "Artist", unlimited: "Cheksiz", unlimitedHelp: "Buyurtmalar soni cheklanmaydi.", unlimitedOnPage: "Cheksiz sahifada", used: "Ishlatilgan", usedOnPage: "Sahifada ishlatilgan", view: "Ko‘rish" };
}
