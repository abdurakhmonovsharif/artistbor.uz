"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Pencil, Search, XCircle } from "lucide-react";
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
  type UpdateApplicationPayload,
} from "@/lib/api/admin-content";
import { normalizeDate, toDisplay } from "@/lib/utils";
import type { ArtistApplication, Category, ListResult } from "@/types/api";

type DialogState =
  | { type: "view"; application: ArtistApplication }
  | { type: "edit"; application: ArtistApplication }
  | { type: "approve"; application: ArtistApplication }
  | { type: "reject"; application: ArtistApplication }
  | null;

const limit = 20;

const statusOptions = [
  { label: "Kutilmoqda", value: "pending" },
  { label: "Tasdiqlangan", value: "approved" },
  { label: "Rad etilgan", value: "rejected" },
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
      render: (row) => <StatusBadge value={row.status} />,
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

  const openDialog = async (type: "view" | "edit", row: ArtistApplication) => {
    if (!row.id) return;
    setSubmitting(true);
    try {
      const application = await applicationsApi.detail(row.id);
      setDialog({ type, application: { ...row, ...application } });
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
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <FormField
            label="Holat"
            type="select"
            options={statusOptions}
            value={draftFilters.status ?? ""}
            onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
          >
            Tozalash
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Search className="size-4" />
            Qidirish
          </button>
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
              <IconButton label="Ko'rish" disabled={submitting} onClick={() => void openDialog("view", row)}>
                <Eye className="size-4" />
              </IconButton>
              <IconButton label="Tahrirlash" disabled={submitting} onClick={() => void openDialog("edit", row)}>
                <Pencil className="size-4" />
              </IconButton>
              {isPendingApplication(row) ? (
                <>
                  <IconButton
                    tone="confirm"
                    label="Tasdiqlash"
                    disabled={submitting}
                    onClick={() => setDialog({ type: "approve", application: row })}
                  >
                    <CheckCircle2 className="size-4" />
                  </IconButton>
                  <IconButton
                    tone="danger"
                    label="Rad etish"
                    disabled={submitting}
                    onClick={() => setDialog({ type: "reject", application: row })}
                  >
                    <XCircle className="size-4" />
                  </IconButton>
                </>
              ) : null}
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
          <ApplicationDetails application={dialog.application} categoryMap={categoryMap} />
        </Modal>
      ) : null}

      {dialog?.type === "edit" ? (
        <EditApplicationModal
          application={dialog.application}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.application.id) return;
            setSubmitting(true);
            try {
              await applicationsApi.update(dialog.application.id, payload);
              toast.success("Ariza yangilandi");
              setDialog(null);
              await fetchApplications();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Yangilash bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
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

function EditApplicationModal({
  application,
  loading,
  onClose,
  onSubmit,
}: {
  application: ArtistApplication;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateApplicationPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    category_ids: application.category_ids?.join(", ") ?? "",
    sub_category_ids: application.sub_category_ids?.join(", ") ?? "",
    bio: application.bio ?? "",
    albums_count: application.albums_count === undefined ? "" : String(application.albums_count),
    extra_phone: application.extra_phone ?? "",
    administrator_name: application.administrator_name ?? "",
    administrator_phone: application.administrator_phone ?? "",
    profile_photo_id:
      application.profile_photo_id === undefined ? "" : String(application.profile_photo_id),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(buildApplicationPayload(values));
  };

  return (
    <Modal title="Arizani tahrirlash" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Kategoriya IDlari"
            value={values.category_ids}
            placeholder="1, 2, 3"
            onChange={(category_ids) => setValues((current) => ({ ...current, category_ids }))}
          />
          <FormField
            label="Subkategoriya IDlari"
            value={values.sub_category_ids}
            placeholder="10, 15"
            onChange={(sub_category_ids) =>
              setValues((current) => ({ ...current, sub_category_ids }))
            }
          />
          <div className="md:col-span-2">
            <FormField
              label="Bio"
              type="textarea"
              rows={4}
              value={values.bio}
              onChange={(bio) => setValues((current) => ({ ...current, bio }))}
            />
          </div>
          <FormField
            label="Albomlar soni"
            type="number"
            value={values.albums_count}
            onChange={(albums_count) => setValues((current) => ({ ...current, albums_count }))}
          />
          <FormField
            label="Qoshimcha telefon"
            value={values.extra_phone}
            onChange={(extra_phone) => setValues((current) => ({ ...current, extra_phone }))}
          />
          <FormField
            label="Administrator ismi"
            value={values.administrator_name}
            onChange={(administrator_name) =>
              setValues((current) => ({ ...current, administrator_name }))
            }
          />
          <FormField
            label="Administrator telefoni"
            value={values.administrator_phone}
            onChange={(administrator_phone) =>
              setValues((current) => ({ ...current, administrator_phone }))
            }
          />
          <FormField
            label="Profile photo ID"
            type="number"
            value={values.profile_photo_id}
            onChange={(profile_photo_id) =>
              setValues((current) => ({ ...current, profile_photo_id }))
            }
          />
        </div>
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </Modal>
  );
}

function ApplicationDetails({
  application,
  categoryMap,
}: {
  application: ArtistApplication;
  categoryMap: CategoryMap;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-center">
        <ApplicationPhoto application={application} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              Ariza #{toDisplay(application.id)}
            </h3>
            <StatusBadge value={application.status} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {toDisplay(application.bio)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InfoCard label="ID" value={application.id} />
        <InfoCard label="User" value={application.user_id ? `#${application.user_id}` : undefined} />
        <InfoCard label="Holat" value={<StatusBadge value={application.status} />} />
        <InfoCard label="Yaratilgan" value={normalizeDate(application.created_at)} />
        <InfoCard label="Qo'shimcha telefon" value={application.extra_phone} />
        <InfoCard label="Profile photo ID" value={application.profile_photo_id} />
        <InfoCard
          label="Profile photo URL"
          value={
            application.profile_photo_url ? (
              <a
                href={application.profile_photo_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-amber-600 hover:underline dark:text-amber-300"
              >
                Rasmni ochish
              </a>
            ) : undefined
          }
        />
        <InfoCard label="Albomlar soni" value={application.albums_count} />
        <InfoCard label="Administrator" value={application.administrator_name} />
        <InfoCard label="Administrator telefoni" value={application.administrator_phone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Bio</p>
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
            {toDisplay(application.bio)}
          </p>
        </div>
        <div className="grid gap-4">
          <ChipGroup label="Kategoriyalar" values={application.category_ids} categoryMap={categoryMap} />
          <ChipGroup label="Subkategoriyalar" values={application.sub_category_ids} categoryMap={categoryMap} />
          <InfoCard label="Rad etish sababi" value={application.rejection_reason} />
        </div>
      </div>
    </div>
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
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{value ?? "—"}</div>
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
}: {
  application: ArtistApplication;
  size: "sm" | "lg";
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

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={application.profile_photo_url}
      alt={`Ariza #${toDisplay(application.id)} rasmi`}
      className={`${className} shrink-0 object-cover ring-1 ring-slate-200 dark:ring-white/10`}
    />
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
      className={`inline-flex size-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${actionClass(tone)}`}
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

function buildApplicationPayload(values: {
  category_ids: string;
  sub_category_ids: string;
  bio: string;
  albums_count: string;
  extra_phone: string;
  administrator_name: string;
  administrator_phone: string;
  profile_photo_id: string;
}) {
  const payload: UpdateApplicationPayload = {};
  const categoryIds = parseNumberList(values.category_ids);
  const subCategoryIds = parseNumberList(values.sub_category_ids);
  if (categoryIds.length) payload.category_ids = categoryIds;
  if (subCategoryIds.length) payload.sub_category_ids = subCategoryIds;
  if (values.bio) payload.bio = values.bio;
  if (values.albums_count) payload.albums_count = Number(values.albums_count);
  if (values.extra_phone) payload.extra_phone = values.extra_phone;
  if (values.administrator_name) payload.administrator_name = values.administrator_name;
  if (values.administrator_phone) payload.administrator_phone = values.administrator_phone;
  if (values.profile_photo_id) payload.profile_photo_id = Number(values.profile_photo_id);
  return payload;
}

function parseNumberList(value: string) {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));
}

function isPendingApplication(application: ArtistApplication) {
  const status = String(application.status ?? "").toLowerCase();
  return !status || status.includes("pending");
}

function formatCategoryList(values: number[] | undefined, categoryMap: CategoryMap) {
  return values?.length ? values.map((value) => getCategoryLabel(value, categoryMap)).join(", ") : "—";
}

function getCategoryLabel(id: number, categoryMap: CategoryMap) {
  const category = categoryMap.get(id);
  return category ? category.name_uz || category.name_ru || category.name_en || `#${id}` : `#${id}`;
}
