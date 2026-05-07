"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Maximize2, Search, X, XCircle } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  applicationsApi,
  categoriesApi,
  type ApplicationFilters,
} from "@/lib/api/admin-content";
import { isRecord, normalizeDate, toDisplay } from "@/lib/utils";
import type { ArtistApplication, Category, ListResult, UnknownRecord } from "@/types/api";

type DialogState =
  | { type: "view"; application: ArtistApplication }
  | { type: "approve"; application: ArtistApplication }
  | { type: "reject"; application: ArtistApplication }
  | null;

const limit = 20;

const statusOptions = [
  { label: "Kutilmoqda", value: 10 },
  { label: "Tasdiqlangan", value: 20 },
  { label: "Rad etilgan", value: 30 },
];

type CategoryMap = Map<number, Category>;

function createColumns(categoryMap: CategoryMap): DataTableColumn<ArtistApplication>[] {
  return [
    {
      key: "id",
      label: "Ariza",
      render: (row) => (
        <div className="flex items-center gap-3">
          <ApplicationPhoto application={row} size="sm" />
          <div>
            <p className="font-black text-slate-950 dark:text-white">#{toDisplay(row.id)}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">{normalizeDate(row.created_at)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Holat",
      render: (row) => <ApplicationStatusBadge application={row} />,
    },
    {
      key: "contact",
      label: "Aloqa",
      render: (row) => (
        <div>
          <p className="font-black">{toDisplay(row.extra_phone)}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {toDisplay(row.administrator_name)} - {toDisplay(row.administrator_phone)}
          </p>
        </div>
      ),
    },
    {
      key: "categories",
      label: "Kategoriya",
      render: (row) => (
        <div className="space-y-1">
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">
            {formatCategoryList(row.category_ids, categoryMap)}
          </p>
          <p className="text-xs font-bold text-slate-400">
            Sub: {formatCategoryList(row.sub_category_ids, categoryMap)}
          </p>
        </div>
      ),
    },
    {
      key: "bio",
      label: "Bio",
      render: (row) => (
        <p className="line-clamp-2 max-w-[320px] text-sm font-semibold leading-5">
          {toDisplay(row.bio)}
        </p>
      ),
    },
    {
      key: "meta",
      label: "Qo'shimcha",
      render: (row) => (
        <div className="space-y-1">
          <p>Albom: {toDisplay(row.albums_count)}</p>
          <p className="text-xs font-bold text-slate-400">Photo ID: {toDisplay(row.profile_photo_id)}</p>
        </div>
      ),
    },
    {
      key: "rejection_reason",
      label: "Izoh",
      render: (row) => (
        <p className="line-clamp-2 max-w-[220px] text-sm font-semibold leading-5">
          {toDisplay(row.rejection_reason)}
        </p>
      ),
    },
  ];
}

const initialFilters: ApplicationFilters = {
  status: "",
  page: 1,
  limit,
};

export default function ApplicationsPage() {
  const [filters, setFilters] = useState<ApplicationFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ApplicationFilters>(initialFilters);
  const [rows, setRows] = useState<ArtistApplication[]>([]);
  const [categoryMap, setCategoryMap] = useState<CategoryMap>(() => new Map());
  const [meta, setMeta] = useState<ListResult<ArtistApplication>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [photoPreview, setPhotoPreview] = useState<ArtistApplication | null>(null);
  const toast = useToast();
  const columns = useMemo(() => createColumns(categoryMap), [categoryMap]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await applicationsApi.list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Arizalar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await categoriesApi.list({});
      setCategoryMap(
        new Map(
          result.items
            .filter((category) => typeof category.id === "number")
            .map((category) => [category.id as number, category]),
        ),
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Kategoriyalar yuklanmadi");
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApplications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchApplications]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCategories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCategories]);

  const openDialog = async (row: ArtistApplication) => {
    if (!row.id) return;
    setSubmitting(true);
    try {
      const application = await applicationsApi.detail(row.id);
      setDialog({ type: "view", application: { ...row, ...application } });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Ariza tafsilotlari yuklanmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1, limit: Number(filters.limit) || limit });
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, limit: nextLimit }));
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const approveApplication = async () => {
    if (dialog?.type !== "approve" || !dialog.application.id) return;
    setSubmitting(true);
    try {
      await applicationsApi.approve(dialog.application.id);
      toast.success("Ariza tasdiqlandi");
      setDialog(null);
      await fetchApplications();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Tasdiqlash bajarilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const page = Number(filters.page ?? 1);
  const pageCount =
    meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
          Arizalar
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Arizalar
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Artist bo&apos;lish uchun yuborilgan arizalarni ko&apos;rish va ko&apos;rib chiqish.
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-sm">
            <FormField
              label="Holat"
              type="select"
              options={statusOptions}
              value={draftFilters.status ?? ""}
              onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
            >
              Tozalash
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <Search className="size-4" />
              Qidirish
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row, index) => row.id ?? index}
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <IconButton label="Ko'rish" disabled={submitting} onClick={() => void openDialog(row)}>
                <Eye className="size-4" />
              </IconButton>
            </div>
          )}
        />
      )}

      {pageCount ? (
        <Pagination
          meta={meta}
          page={page}
          pageSize={Number(filters.limit) || limit}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      ) : (
        <FallbackPagination
          page={page}
          rowsCount={rows.length}
          pageSize={Number(filters.limit) || limit}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      )}

      {dialog?.type === "view" ? (
        <Modal title="Ariza tafsilotlari" onClose={() => setDialog(null)} width="max-w-5xl">
          <ApplicationDetails
            application={dialog.application}
            categoryMap={categoryMap}
            loading={submitting}
            onApprove={() => setDialog({ type: "approve", application: dialog.application })}
            onReject={() => setDialog({ type: "reject", application: dialog.application })}
            onOpenPhoto={() => setPhotoPreview(dialog.application)}
          />
        </Modal>
      ) : null}

      {photoPreview ? (
        <PhotoPreviewModal application={photoPreview} onClose={() => setPhotoPreview(null)} />
      ) : null}

      {dialog?.type === "approve" ? (
        <ConfirmDialog
          loading={submitting}
          title="Arizani tasdiqlash"
          message="Arizani tasdiqlashni tasdiqlaysizmi?"
          confirmLabel="Tasdiqlash"
          onCancel={() => setDialog(null)}
          onConfirm={approveApplication}
        />
      ) : null}

      {dialog?.type === "reject" ? (
        <RejectApplicationModal
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (!dialog.application.id) return;
            setSubmitting(true);
            try {
              await applicationsApi.reject(dialog.application.id, reason);
              toast.success("Ariza rad etildi");
              setDialog(null);
              await fetchApplications();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Rad etish bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function ApplicationDetails({
  application,
  categoryMap,
  loading,
  onApprove,
  onReject,
  onOpenPhoto,
}: {
  application: ArtistApplication;
  categoryMap: CategoryMap;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenPhoto: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <ApplicationPhoto application={application} size="lg" onOpen={onOpenPhoto} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">
                Ariza #{toDisplay(application.id)}
              </h3>
            </div>
            <p className="mt-2 line-clamp-2 break-words text-sm font-semibold text-slate-500 dark:text-slate-400">
              {toDisplay(application.bio)}
            </p>
          </div>
        </div>
        <ApplicationReviewActions
          application={application}
          loading={loading}
          onApprove={onApprove}
          onReject={onReject}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <UserInfoCard application={application} />
        <InfoCard label="Yaratilgan" value={normalizeDate(application.created_at)} />
        <InfoCard label="Qo'shimcha telefon" value={application.extra_phone} />
        <InfoCard label="Albomlar soni" value={application.albums_count} />
        <InfoCard label="Administrator" value={application.administrator_name} />
        <InfoCard label="Administrator telefoni" value={application.administrator_phone} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ChipGroup label="Kategoriyalar" values={application.category_ids} categoryMap={categoryMap} />
        <ChipGroup label="Subkategoriyalar" values={application.sub_category_ids} categoryMap={categoryMap} />
        <InfoCard label="Rad etish sababi" value={application.rejection_reason} />
      </div>

      <BioCard value={application.bio} />
    </div>
  );
}

function PhotoPreviewModal({
  application,
  onClose,
}: {
  application: ArtistApplication;
  onClose: () => void;
}) {
  if (!application.profile_photo_url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-white">Ariza #{toDisplay(application.id)} rasmi</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">{normalizeDate(application.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:border-amber-300 hover:text-amber-300"
            aria-label="Yopish"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex max-h-[78vh] items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={application.profile_photo_url}
            alt={`Ariza #${toDisplay(application.id)} rasmi`}
            className="max-h-[72vh] w-auto max-w-full rounded-2xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function ApplicationReviewActions({
  application,
  loading,
  onApprove,
  onReject,
}: {
  application: ArtistApplication;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const status = applicationStatusKey(application);

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <ReviewButton
        tone="confirm"
        disabled={loading || !canApproveApplication(application)}
        onClick={onApprove}
      >
        <CheckCircle2 className="size-4" />
        {status === "approved" ? "Tasdiqlangan" : "Tasdiqlash"}
      </ReviewButton>
      <ReviewButton
        tone="danger"
        disabled={loading || !canRejectApplication(application)}
        onClick={onReject}
      >
        <XCircle className="size-4" />
        {status === "rejected" ? "Rad etilgan" : "Rad etish"}
      </ReviewButton>
    </div>
  );
}

function ReviewButton({
  children,
  tone,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  tone: "confirm" | "danger";
  disabled: boolean;
  onClick: () => void;
}) {
  const className =
    tone === "confirm"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
      : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function RejectApplicationModal({
  loading,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setError("Majburiy maydon");
      return;
    }
    await onSubmit(reason);
  };

  return (
    <Modal title="Arizani rad etish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <FormField
          label="Sabab"
          type="textarea"
          rows={4}
          required
          value={reason}
          error={error}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />
        <FormActions danger loading={loading} onClose={onClose} submitLabel="Rad etish" />
      </form>
    </Modal>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue = value === null || value === undefined || value === "" ? "—" : value;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{displayValue}</div>
    </div>
  );
}

function UserInfoCard({ application }: { application: ArtistApplication }) {
  const user = isRecord(application.user) ? application.user : undefined;
  const name = user ? getUserName(user) : undefined;
  const phone = user ? getStringValue(user, "phone") : undefined;
  const email = user ? getStringValue(user, "email") : undefined;

  return (
    <InfoCard
      label="Foydalanuvchi"
      value={
        name || phone || email ? (
          <div className="space-y-1">
            {name ? <p>{name}</p> : null}
            {phone ? <p className="text-xs text-slate-500 dark:text-slate-400">{phone}</p> : null}
            {email ? <p className="break-all text-xs text-slate-500 dark:text-slate-400">{email}</p> : null}
          </div>
        ) : undefined
      }
    />
  );
}

function getUserName(user: UnknownRecord) {
  const fullName = getStringValue(user, "full_name");
  if (fullName) return fullName;

  const firstName = getStringValue(user, "first_name");
  const lastName = getStringValue(user, "last_name");
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || undefined;
}

function getStringValue(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function BioCard({ value }: { value?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Bio</p>
      <div className="mt-3 max-h-56 overflow-auto pr-2">
        <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
          {toDisplay(value)}
        </p>
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  values,
  categoryMap,
}: {
  label: string;
  values?: number[];
  categoryMap: CategoryMap;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      {values?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
            >
              {getCategoryLabel(value, categoryMap)}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-black text-slate-600 dark:text-slate-300">—</p>
      )}
    </div>
  );
}

function ApplicationPhoto({
  application,
  size,
  onOpen,
}: {
  application: ArtistApplication;
  size: "sm" | "lg";
  onOpen?: () => void;
}) {
  const className =
    size === "lg"
      ? "size-24 rounded-3xl"
      : "size-12 rounded-2xl";

  if (!application.profile_photo_url) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center bg-slate-100 text-xs font-black text-slate-400 dark:bg-white/10 dark:text-slate-500`}
      >
        —
      </div>
    );
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={application.profile_photo_url}
      alt={`Ariza #${toDisplay(application.id)} rasmi`}
      className={`${className} shrink-0 object-cover ring-1 ring-slate-200 dark:ring-white/10`}
    />
  );

  if (!onOpen) return image;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${className} group relative shrink-0 overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-amber-300`}
      aria-label="Rasmni kattalashtirib ko'rish"
    >
      {image}
      <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/55 group-hover:opacity-100 group-focus:bg-slate-950/55 group-focus:opacity-100">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-black backdrop-blur">
          <Maximize2 className="size-4" />
          Ochish
        </span>
      </span>
    </button>
  );
}

function IconButton({
  label,
  children,
  tone = "default",
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "default" | "confirm" | "danger";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${actionClass(tone)}`}
    >
      {children}
    </button>
  );
}

function actionClass(tone: "default" | "confirm" | "danger") {
  if (tone === "confirm") {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-400/20";
  }
  if (tone === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
  }
  return "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-amber-400/10";
}

function FormActions({
  loading,
  onClose,
  danger,
  submitLabel = "Saqlash",
}: {
  loading: boolean;
  onClose: () => void;
  danger?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
      >
        Bekor qilish
      </button>
      <button
        type="submit"
        disabled={loading}
        className={`rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.16em] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
          danger
            ? "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600"
            : "bg-amber-400 text-slate-950 shadow-amber-400/25 hover:bg-amber-300"
        }`}
      >
        {loading ? "Bajarilmoqda..." : submitLabel}
      </button>
    </div>
  );
}

function ApplicationStatusBadge({ application }: { application: ArtistApplication }) {
  return <StatusBadge value={applicationStatusLabel(application)} />;
}

function canApproveApplication(application: ArtistApplication) {
  return Boolean(application.id) && applicationStatusKey(application) !== "approved";
}

function canRejectApplication(application: ArtistApplication) {
  return Boolean(application.id) && applicationStatusKey(application) !== "rejected";
}

function applicationStatusLabel(application: ArtistApplication) {
  const key = applicationStatusKey(application);
  if (key === "pending") return "Kutilmoqda";
  if (key === "approved") return "Tasdiqlangan";
  if (key === "rejected") return "Rad etilgan";
  return application.status_label ?? application.status ?? "—";
}

function applicationStatusKey(application: ArtistApplication) {
  const numericStatus = numberValue(application.status);
  if (numericStatus === 10) return "pending";
  if (numericStatus === 20) return "approved";
  if (numericStatus === 30) return "rejected";

  const text = [application.status, application.status_label]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!text) return "pending";
  if (hasAny(text, ["reject", "rad etilgan"])) return "rejected";
  if (hasAny(text, ["approve", "accepted", "tasdiqlangan", "qabul qilingan"])) return "approved";
  if (hasAny(text, ["pending", "review", "new", "kutilmoqda"])) return "pending";
  return "unknown";
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function hasAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function formatCategoryList(values: number[] | undefined, categoryMap: CategoryMap) {
  return values?.length ? values.map((value) => getCategoryLabel(value, categoryMap)).join(", ") : "—";
}

function getCategoryLabel(id: number, categoryMap: CategoryMap) {
  const category = categoryMap.get(id);
  return category ? category.name_uz || category.name_ru || category.name_en || `#${id}` : `#${id}`;
}
