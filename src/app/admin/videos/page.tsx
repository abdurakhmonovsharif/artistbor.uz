"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal, Select } from "antd";
import { ExternalLink, Loader2, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import {
  adminActionButtonClass,
  adminActionButtonLargeClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormField } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  artistsApi,
  artistVideosApi,
  type ArtistVideoFilters,
  type CreateArtistVideoPayload,
  type UpdateArtistVideoPayload,
} from "@/lib/api/admin-content";
import { getArtistId, getArtistName, getArtistSelectOptions } from "@/lib/artist-display";
import { getDashboardNotification } from "@/lib/i18n/dashboard-copy";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useLatestRequest } from "@/lib/use-latest-request";
import { cn, normalizeDate } from "@/lib/utils";
import type { ArtistProfile, ArtistVideoRecord } from "@/types/api";

const initialFilters: ArtistVideoFilters = {
  artist_id: "",
};

type VideoDialog =
  | { type: "create" }
  | { type: "edit"; video: ArtistVideoRecord }
  | null;

type VideoFormValues = {
  artist_id: string;
  youtube_url: string;
  title: string;
  title_uz: string;
  title_ru: string;
  sort_order: string;
  is_active: "true" | "false";
};

export default function ArtistVideosPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const labels = useMemo(() => getVideoLabels(locale), [locale]);
  const [filters, setFilters] = useState<ArtistVideoFilters>(() => filtersFromUrl());
  const [draftFilters, setDraftFilters] = useState<ArtistVideoFilters>(() => filtersFromUrl());
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [rows, setRows] = useState<ArtistVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<VideoDialog>(null);
  const toast = useToast();
  const startListRequest = useLatestRequest(filters);
  const artistNameById = new Map(
    artistOptions
      .map((artist) => {
        const artistId = getArtistId(artist);
        return artistId === undefined ? undefined : [String(artistId), getArtistName(artist)] as const;
      })
      .filter(Boolean) as [string, string][],
  );
  const columns = getVideoColumns(artistNameById, labels);

  const fetchVideos = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startListRequest();
    if (!background) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await artistVideosApi.list(filters);
      if (!isLatestRequest()) return;
      setRows(result.items);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : labels.loadFailed;
      if (background) toast.error(message);
      else setError(message);
    } finally {
      if (isLatestRequest()) setLoading(false);
    }
  }, [filters, labels.loadFailed, startListRequest, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchVideos();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchVideos]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setArtistsLoading(true);
      try {
        const result = await artistsApi.list({ page: 1, limit: 100 });
        setArtistOptions(result.items);
      } catch {
        setArtistOptions([]);
      } finally {
        setArtistsLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters(draftFilters);
    syncUrl(draftFilters, router);
  };

  const applyArtistFilter = (artist_id: ArtistVideoFilters["artist_id"]) => {
    const nextFilters = { artist_id };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    syncUrl(nextFilters, router);
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    router.replace("/admin/videos", { scroll: false });
  };

  const saveVideo = async (values: VideoFormValues) => {
    if (!dialog) return;
    setSubmitting(true);
    try {
      if (dialog.type === "create") {
        await artistVideosApi.create(buildCreateVideoPayload(values));
        toast.success(labels.created);
      } else {
        if (!dialog.video.id) throw new Error(labels.idNotFound);
        await artistVideosApi.update(dialog.video.id, buildUpdateVideoPayload(values));
        toast.success(labels.updated);
      }
      setDialog(null);
      await fetchVideos({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.saveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteVideo = (video: ArtistVideoRecord) => {
    if (!video.id) {
      toast.error(labels.idNotFound);
      return;
    }
    const videoId = video.id;
    Modal.confirm({
      title: labels.deleteTitle,
      content: labels.deleteConfirm,
      okText: labels.deleteAction,
      okButtonProps: { danger: true },
      cancelText: labels.cancel,
      rootClassName: "artistbor-confirm-modal",
      async onOk() {
        try {
          await artistVideosApi.delete(videoId);
          toast.success(labels.deleted);
          await fetchVideos({ background: true });
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : labels.deleteFailed);
          throw caught;
        }
      },
    });
  };

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        actions={(
          <button
            type="button"
            className={adminActionButtonLargeClass}
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus className="size-4" />
            {labels.createAction}
          </button>
        )}
      />

      <AdminFilterForm
        onSubmit={applyFilters}
        gridClassName="md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
        mobileLabel={labels.search}
      >
          <Select
            className={`${adminFilterControlClass} h-10`}
            loading={artistsLoading}
            value={draftFilters.artist_id ?? ""}
            options={[
              { label: artistsLoading ? labels.artistLoading : labels.artistAll, value: "" },
              ...getArtistSelectOptions(artistOptions, draftFilters.artist_id),
            ]}
            onChange={applyArtistFilter}
          />
          <Button
            htmlType="button"
            className={`${adminFilterActionClass} h-10 md:col-start-3`}
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            {labels.reset}
          </Button>
      </AdminFilterForm>

      {loading ? (
        <LoadingState label={labels.loading} />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title={labels.empty} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row, index) => row.id ?? `${row.artist_id ?? "artist"}-${index}`}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <VideoActionButton label={labels.editAction} onClick={() => setDialog({ type: "edit", video: row })}>
                <Pencil className="size-4" />
              </VideoActionButton>
              <VideoActionButton danger label={labels.deleteAction} onClick={() => deleteVideo(row)}>
                <Trash2 className="size-4" />
              </VideoActionButton>
            </div>
          )}
        />
      )}

      {dialog ? (
        <VideoFormDrawer
          key={dialog.type === "edit" ? `edit-${dialog.video.id ?? "video"}` : "create"}
          artistOptions={artistOptions}
          artistsLoading={artistsLoading}
          defaultArtistId={filters.artist_id}
          dialog={dialog}
          labels={labels}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={saveVideo}
        />
      ) : null}
    </section>
  );
}

function VideoFormDrawer({
  artistOptions,
  artistsLoading,
  defaultArtistId,
  dialog,
  labels,
  loading,
  onClose,
  onSubmit,
}: {
  artistOptions: ArtistProfile[];
  artistsLoading: boolean;
  defaultArtistId: ArtistVideoFilters["artist_id"];
  dialog: Exclude<VideoDialog, null>;
  labels: ReturnType<typeof getVideoLabels>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: VideoFormValues) => Promise<void>;
}) {
  const editing = dialog.type === "edit";
  const [values, setValues] = useState<VideoFormValues>(() =>
    initialVideoValues(dialog, defaultArtistId),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof VideoFormValues, string>>>({});
  const formId = editing ? `artist-video-edit-${dialog.video.id ?? "video"}` : "artist-video-create";

  const changeValue = (key: keyof VideoFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateVideoValues(values, labels);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    void onSubmit(values);
  };

  return (
    <AdminDrawer
      title={editing ? labels.editTitle : labels.createTitle}
      onClose={onClose}
      size="min(100vw, 680px)"
      footer={(
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={adminActionButtonClass} disabled={loading} onClick={onClose}>
            <X className="size-4" />
            {labels.cancel}
          </button>
          <button type="submit" form={formId} className={adminPrimaryActionButtonClass} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {loading ? labels.saving : labels.saveAction}
          </button>
        </div>
      )}
    >
      <form id={formId} className="space-y-4 p-4" onSubmit={submit}>
        <FormField
          compact
          required
          disabled={editing || artistsLoading}
          label={labels.artist}
          type="select"
          value={values.artist_id}
          error={errors.artist_id}
          placeholder={artistsLoading ? labels.artistLoading : labels.artistSelect}
          options={getArtistSelectOptions(artistOptions, values.artist_id)}
          onChange={(artist_id) => changeValue("artist_id", artist_id)}
        />
        <FormField
          compact
          required
          label={labels.youtubeUrl}
          value={values.youtube_url}
          error={errors.youtube_url}
          placeholder="https://youtu.be/..."
          inputMode="url"
          onChange={(youtube_url) => changeValue("youtube_url", youtube_url)}
        />
        <FormField
          compact
          label={labels.videoTitle}
          value={values.title}
          error={errors.title}
          maxLength={255}
          onChange={(title) => changeValue("title", title)}
        />
        {!editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              compact
              label={labels.titleUz}
              value={values.title_uz}
              maxLength={255}
              onChange={(title_uz) => changeValue("title_uz", title_uz)}
            />
            <FormField
              compact
              label={labels.titleRu}
              value={values.title_ru}
              maxLength={255}
              onChange={(title_ru) => changeValue("title_ru", title_ru)}
            />
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            compact
            label={labels.sortOrder}
            type="number"
            inputMode="numeric"
            value={values.sort_order}
            error={errors.sort_order}
            placeholder="0"
            onChange={(sort_order) => changeValue("sort_order", sort_order)}
          />
          <FormField
            compact
            label={labels.status}
            type="select"
            value={values.is_active}
            options={[
              { label: labels.active, value: "true" },
              { label: labels.inactive, value: "false" },
            ]}
            onChange={(is_active) => changeValue("is_active", is_active)}
          />
        </div>
      </form>
    </AdminDrawer>
  );
}

function VideoActionButton({
  children,
  danger = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-xl border bg-artistbor-surface transition focus:outline-none focus:ring-2 focus:ring-amber-300/40",
        danger
          ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
          : "border-artistbor-border text-artistbor-secondary hover:border-artistbor-border-strong hover:bg-artistbor-surface-subtle hover:text-artistbor-primary",
      )}
    >
      {children}
    </button>
  );
}

function initialVideoValues(
  dialog: Exclude<VideoDialog, null>,
  defaultArtistId: ArtistVideoFilters["artist_id"],
): VideoFormValues {
  const video = dialog.type === "edit" ? dialog.video : undefined;
  return {
    artist_id: video?.artist_id ? String(video.artist_id) : defaultArtistId ? String(defaultArtistId) : "",
    youtube_url: video?.youtube_url ?? video?.embed_url ?? "",
    title: video?.title ?? "",
    title_uz: video?.title_uz ?? "",
    title_ru: video?.title_ru ?? "",
    sort_order: video?.sort_order === undefined ? "" : String(video.sort_order),
    is_active: video?.is_active === false || video?.is_active === 0 ? "false" : "true",
  };
}

function validateVideoValues(
  values: VideoFormValues,
  labels: ReturnType<typeof getVideoLabels>,
) {
  const errors: Partial<Record<keyof VideoFormValues, string>> = {};
  if (!Number.isFinite(Number(values.artist_id)) || Number(values.artist_id) <= 0) {
    errors.artist_id = labels.artistRequired;
  }
  if (!isYoutubeUrl(values.youtube_url)) errors.youtube_url = labels.youtubeUrlInvalid;
  if (values.title.trim().length > 255) errors.title = labels.titleTooLong;
  if (
    values.sort_order !== "" &&
    (!Number.isInteger(Number(values.sort_order)) || Number(values.sort_order) < 0)
  ) {
    errors.sort_order = labels.sortOrderInvalid;
  }
  return errors;
}

function isYoutubeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && ["youtube.com", "m.youtube.com", "youtu.be"].includes(host);
  } catch {
    return false;
  }
}

function buildCreateVideoPayload(values: VideoFormValues): CreateArtistVideoPayload {
  const payload: CreateArtistVideoPayload = {
    artist_id: Number(values.artist_id),
    youtube_url: values.youtube_url.trim(),
    is_active: values.is_active === "true",
  };
  if (values.title.trim()) payload.title = values.title.trim();
  if (values.title_uz.trim()) payload.title_uz = values.title_uz.trim();
  if (values.title_ru.trim()) payload.title_ru = values.title_ru.trim();
  if (values.sort_order !== "") payload.sort_order = Number(values.sort_order);
  return payload;
}

function buildUpdateVideoPayload(values: VideoFormValues): UpdateArtistVideoPayload {
  const payload: UpdateArtistVideoPayload = {
    youtube_url: values.youtube_url.trim(),
    title: values.title.trim(),
    is_active: values.is_active === "true",
  };
  if (values.sort_order !== "") payload.sort_order = Number(values.sort_order);
  return payload;
}

function getVideoColumns(
  artistNameById: Map<string, string>,
  labels: ReturnType<typeof getVideoLabels>,
): DataTableColumn<ArtistVideoRecord>[] {
  return [
    { key: "public_id", label: "Public ID", render: (row) => typeof row.public_id === "string" ? row.public_id : "—" },
    {
      key: "artist_id",
      label: labels.artist,
      render: (row) => artistNameById.get(String(row.artist_id)) ?? `${labels.artist} —`,
    },
    {
      key: "thumbnail_url",
      label: labels.preview,
      render: (row) => <VideoPreview row={row} ariaLabel={labels.previewAria} />,
    },
    {
      key: "title",
      label: labels.videoTitle,
      render: (row) => (
        <div className="min-w-48">
          <p className="line-clamp-2 font-black text-slate-900 dark:text-white">
            {row.title || row.title_uz || row.title_ru || `${labels.video} —`}
          </p>
          {row.title_uz || row.title_ru ? (
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {[row.title_uz, row.title_ru].filter(Boolean).join(" / ")}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "youtube_url",
      label: "YouTube",
      render: (row) => <VideoLink value={row.youtube_url ?? row.embed_url} label={labels.open} />,
    },
    { key: "is_active", label: labels.status, render: (row) => <StatusBadge value={row.is_active} fieldKey="is_active" /> },
    { key: "created_at", label: labels.createdAt, render: (row) => normalizeDate(row.created_at) },
  ];
}

function VideoPreview({ row, ariaLabel }: { row: ArtistVideoRecord; ariaLabel: string }) {
  const image = row.thumbnail_url;

  if (!image) return <span className="text-sm font-semibold text-slate-400">—</span>;

  return (
    <a
      href={row.youtube_url ?? row.embed_url ?? image}
      target="_blank"
      rel="noreferrer"
      className="block size-16 rounded-xl border border-slate-200 bg-cover bg-center dark:border-white/10"
      style={{ backgroundImage: `url(${image})` }}
      aria-label={ariaLabel}
    />
  );
}

function VideoLink({ value, label }: { value: unknown; label: string }) {
  if (typeof value !== "string" || !value) return <span>—</span>;

  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm font-black text-amber-700 underline decoration-amber-300 underline-offset-4 dark:text-amber-300"
    >
      {label}
      <ExternalLink className="size-4" />
    </a>
  );
}

function getVideoLabels(locale: "uz" | "ru") {
  const notification = <Key extends Parameters<typeof getDashboardNotification>[0]>(key: Key) =>
    getDashboardNotification(key, locale);
  return locale === "ru"
    ? {
        active: "Активно",
        artist: "Артист",
        artistAll: "Артист: все",
        artistLoading: "Загрузка артистов...",
        artistRequired: "Выберите артиста",
        artistSelect: "Выберите артиста",
        cancel: "Отмена",
        createAction: "Добавить видео",
        created: notification("artistVideoCreated"),
        createTitle: "Добавить видео артиста",
        createdAt: "Создано",
        deleteAction: "Удалить",
        deleteConfirm: "Видео будет удалено из профиля артиста.",
        deleteFailed: "Не удалось удалить видео",
        deleteTitle: "Удалить видео?",
        deleted: notification("artistVideoDeleted"),
        description: "Просмотр видео, привязанных к артистам, и фильтрация по артисту.",
        editAction: "Изменить",
        editTitle: "Изменить видео",
        empty: "Видео не найдены",
        eyebrow: "Видео",
        idNotFound: "ID видео не найден",
        inactive: "Неактивно",
        loadFailed: "Не удалось загрузить видео",
        loading: "Загрузка видео...",
        open: "Открыть",
        preview: "Превью",
        previewAria: "Открыть превью видео",
        reset: "Сбросить",
        saveAction: "Сохранить",
        saveFailed: "Не удалось сохранить видео",
        saving: "Сохранение...",
        search: "Поиск",
        sortOrder: "Порядок",
        sortOrderInvalid: "Порядок должен быть целым числом от 0.",
        status: "Статус",
        title: "Видео артистов",
        titleRu: "Название на русском",
        titleTooLong: "Название не должно превышать 255 символов.",
        titleUz: "Название на узбекском",
        updated: notification("artistVideoUpdated"),
        video: "Видео",
        videoTitle: "Название",
        youtubeUrl: "Ссылка YouTube",
        youtubeUrlInvalid: "Укажите корректную HTTPS-ссылку YouTube.",
      }
    : {
        active: "Faol",
        artist: "San’atkor",
        artistAll: "San’atkor: barchasi",
        artistLoading: "San’atkorlar yuklanmoqda...",
        artistRequired: "San’atkorni tanlang",
        artistSelect: "San’atkorni tanlang",
        cancel: "Bekor qilish",
        createAction: "Video qo‘shish",
        created: notification("artistVideoCreated"),
        createTitle: "San’atkor videosini qo‘shish",
        createdAt: "Yaratilgan",
        deleteAction: "O‘chirish",
        deleteConfirm: "Video sanatkor profilidan o‘chiriladi.",
        deleteFailed: "Videoni o‘chirish bajarilmadi",
        deleteTitle: "Video o‘chirilsinmi?",
        deleted: notification("artistVideoDeleted"),
        description: "San’atkorlarga biriktirilgan videolarni ko‘rish va san’atkor bo‘yicha filtrlash.",
        editAction: "Tahrirlash",
        editTitle: "Videoni tahrirlash",
        empty: "Videolar topilmadi",
        eyebrow: "Videolar",
        idNotFound: "Video ID topilmadi",
        inactive: "Nofaol",
        loadFailed: "Videolar yuklanmadi",
        loading: "Videolar yuklanmoqda...",
        open: "Ochish",
        preview: "Ko‘rinish",
        previewAria: "Video ko‘rinishini ochish",
        reset: "Tozalash",
        saveAction: "Saqlash",
        saveFailed: "Videoni saqlash bajarilmadi",
        saving: "Saqlanmoqda...",
        search: "Qidirish",
        sortOrder: "Tartib",
        sortOrderInvalid: "Tartib 0 dan boshlanadigan butun son bo‘lishi kerak.",
        status: "Holat",
        title: "San’atkor videolari",
        titleRu: "Ruscha sarlavha",
        titleTooLong: "Sarlavha 255 belgidan oshmasligi kerak.",
        titleUz: "O‘zbekcha sarlavha",
        updated: notification("artistVideoUpdated"),
        video: "Video",
        videoTitle: "Sarlavha",
        youtubeUrl: "YouTube havolasi",
        youtubeUrlInvalid: "To‘g‘ri HTTPS YouTube havolasini kiriting.",
      };
}

function filtersFromUrl(): ArtistVideoFilters {
  if (typeof window === "undefined") return initialFilters;
  const params = new URLSearchParams(window.location.search);
  return { artist_id: params.get("artist_id") ?? "" };
}

function syncUrl(filters: ArtistVideoFilters, router: ReturnType<typeof useRouter>) {
  const params = new URLSearchParams();
  if (filters.artist_id) params.set("artist_id", String(filters.artist_id));
  const query = params.toString();
  router.replace(query ? `/admin/videos?${query}` : "/admin/videos", { scroll: false });
}
