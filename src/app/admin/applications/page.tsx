"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Input } from "antd";
import { ApplicationsFilterBar, defaultApplicationFilters } from "@/components/admin/applications/applications-filter-bar";
import type { ApplicationsFilterState } from "@/components/admin/applications/applications-filter-bar";
import { ApplicationContactDrawer } from "@/components/admin/applications/application-contact-drawer";
import { ApplicationDetailDrawer } from "@/components/admin/applications/application-detail-drawer";
import { ApplicationsTable } from "@/components/admin/applications/applications-table";
import { ApplicationStatusTabs } from "@/components/admin/applications/application-status-tabs";
import {
  APPLICATION_STATUS_FILTERS,
  applicationStatusKey,
  formatDateParts,
  getApplicationTitle,
  getApplicationUserName,
  getCategoryList,
  getContactValue,
  toDate,
  type ApplicationStatusKey,
  type CategoryMap,
} from "@/components/admin/applications/application-utils";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  applicationsApi,
  categoriesApi,
  type ApplicationFilters,
} from "@/lib/api/admin-content";
import { toDisplay } from "@/lib/utils";
import type { ArtistApplication, Category, ListResult } from "@/types/api";

type StatusCounts = Record<Exclude<ApplicationStatusKey, "unknown">, number>;

type DialogState =
  | { type: "approve"; application: ArtistApplication }
  | { type: "reject"; application: ArtistApplication }
  | null;

const limit = 20;

const initialApiFilters: ApplicationFilters = {
  status: "",
  page: 1,
  limit,
};

const initialCounts: StatusCounts = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

export default function ApplicationsPage() {
  const [apiFilters, setApiFilters] = useState<ApplicationFilters>(initialApiFilters);
  const [uiFilters, setUiFilters] = useState<ApplicationsFilterState>(defaultApplicationFilters);
  const [rows, setRows] = useState<ArtistApplication[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [categoryMap, setCategoryMap] = useState<CategoryMap>(() => new Map());
  const [counts, setCounts] = useState<StatusCounts>(initialCounts);
  const [meta, setMeta] = useState<ListResult<ArtistApplication>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailApplication, setDetailApplication] = useState<ArtistApplication | null>(null);
  const [contactApplication, setContactApplication] = useState<ArtistApplication | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const activeStatus = uiFilters.status;
  const page = Number(apiFilters.page ?? 1);
  const pageSize = Number(apiFilters.limit ?? limit);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await applicationsApi.list(apiFilters);
      setRows(result.items);
      setMeta(result.meta);
      setSelectedIds(new Set());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Arizalar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await categoriesApi.list({});
      setCategoryMap(createCategoryMap(result.items));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Kategoriyalar yuklanmadi");
    }
  }, [toast]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const [all, pending, approved, rejected] = await Promise.all([
        applicationsApi.list({ status: "", page: 1, limit: 1 }),
        applicationsApi.list({ status: APPLICATION_STATUS_FILTERS.pending, page: 1, limit: 1 }),
        applicationsApi.list({ status: APPLICATION_STATUS_FILTERS.approved, page: 1, limit: 1 }),
        applicationsApi.list({ status: APPLICATION_STATUS_FILTERS.rejected, page: 1, limit: 1 }),
      ]);
      setCounts({
        all: getResultCount(all),
        pending: getResultCount(pending),
        approved: getResultCount(approved),
        rejected: getResultCount(rejected),
      });
    } catch {
      setCounts(initialCounts);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApplications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchApplications]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCategories();
      void fetchStatusCounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCategories, fetchStatusCounts]);

  const displayedRows = useMemo(
    () => filterRows(rows, uiFilters, categoryMap),
    [rows, uiFilters, categoryMap],
  );

  const changeStatus = (status: ApplicationStatusKey) => {
    setUiFilters((current) => ({ ...current, status }));
    setApiFilters((current) => ({
      ...current,
      status: APPLICATION_STATUS_FILTERS[status as Exclude<ApplicationStatusKey, "unknown">],
      page: 1,
      limit: Number(current.limit) || limit,
    }));
  };

  const changeFilters = (nextFilters: ApplicationsFilterState) => {
    const statusChanged = nextFilters.status !== uiFilters.status;
    setUiFilters(nextFilters);
    if (statusChanged) {
      setApiFilters((current) => ({
        ...current,
        status: APPLICATION_STATUS_FILTERS[nextFilters.status as Exclude<ApplicationStatusKey, "unknown">],
        page: 1,
        limit: Number(current.limit) || limit,
      }));
    }
  };

  const resetFilters = () => {
    setUiFilters(defaultApplicationFilters);
    setApiFilters(initialApiFilters);
  };

  const changePage = (nextPage: number) => {
    setApiFilters((current) => ({ ...current, page: nextPage, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setApiFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const openDetail = async (application: ArtistApplication) => {
    if (!application.id) return;
    setSubmitting(true);
    try {
      const detail = await applicationsApi.detail(application.id);
      setDetailApplication({ ...application, ...detail });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Ariza tafsilotlari yuklanmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const openContact = async (application: ArtistApplication) => {
    if (!application.id) {
      setContactApplication(application);
      return;
    }
    setSubmitting(true);
    try {
      const detail = await applicationsApi.detail(application.id);
      setContactApplication({ ...application, ...detail });
    } catch {
      setContactApplication(application);
    } finally {
      setSubmitting(false);
    }
  };

  const approveApplication = async () => {
    if (dialog?.type !== "approve" || !dialog.application.id) return;
    setSubmitting(true);
    try {
      await applicationsApi.approve(dialog.application.id);
      toast.success("Ariza tasdiqlandi");
      setDialog(null);
      await Promise.all([fetchApplications(), fetchStatusCounts()]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Tasdiqlash bajarilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const rejectApplication = async (reason: string) => {
    if (dialog?.type !== "reject" || !dialog.application.id) return;
    setSubmitting(true);
    try {
      await applicationsApi.reject(dialog.application.id, reason);
      toast.success("Ariza rad etildi");
      setDialog(null);
      await Promise.all([fetchApplications(), fetchStatusCounts()]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Rad etish bajarilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      displayedRows.forEach((row) => {
        if (typeof row.id !== "number") return;
        if (checked) next.add(row.id);
        else next.delete(row.id);
      });
      return next;
    });
  };

  const toggleRow = (application: ArtistApplication, checked: boolean) => {
    if (typeof application.id !== "number") return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(application.id as number);
      else next.delete(application.id as number);
      return next;
    });
  };

  const pageCount =
    meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-500">Arizalar</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Arizalar</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Artist bo&apos;lish uchun yuborilgan arizalarni ko&apos;rish va boshqarish.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]">
        <ApplicationStatusTabs active={activeStatus} counts={counts} onChange={changeStatus} />
        <div className="pt-4">
          <ApplicationsFilterBar
            value={uiFilters}
            categoryMap={categoryMap}
            onChange={changeFilters}
            onReset={resetFilters}
          />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : displayedRows.length === 0 ? (
        <EmptyState />
      ) : (
        <ApplicationsTable
          rows={displayedRows}
          categoryMap={categoryMap}
          page={page}
          pageSize={pageSize}
          selectedIds={selectedIds}
          onToggleAll={toggleAll}
          onToggleRow={toggleRow}
          onOpenDetail={(application) => void openDetail(application)}
          onOpenContact={(application) => void openContact(application)}
          onApprove={(application) => setDialog({ type: "approve", application })}
          onReject={(application) => setDialog({ type: "reject", application })}
        />
      )}

      {pageCount ? (
        <Pagination
          meta={meta}
          page={page}
          pageSize={pageSize}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      ) : (
        <FallbackPagination
          page={page}
          rowsCount={rows.length}
          pageSize={pageSize}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      )}

      <ApplicationDetailDrawer
        open={Boolean(detailApplication)}
        application={detailApplication}
        categoryMap={categoryMap}
        onClose={() => setDetailApplication(null)}
      />

      <ApplicationContactDrawer
        open={Boolean(contactApplication)}
        application={contactApplication}
        categoryMap={categoryMap}
        onClose={() => setContactApplication(null)}
      />

      {dialog?.type === "approve" ? (
        <ConfirmDialog
          loading={submitting}
          title="Arizani tasdiqlash"
          message={`Ariza #${toDisplay(dialog.application.id)} tasdiqlansinmi?`}
          confirmLabel="Tasdiqlash"
          onCancel={() => setDialog(null)}
          onConfirm={approveApplication}
        />
      ) : null}

      {dialog?.type === "reject" ? (
        <RejectApplicationModal
          loading={submitting}
          application={dialog.application}
          onClose={() => setDialog(null)}
          onSubmit={rejectApplication}
        />
      ) : null}
    </section>
  );
}

function RejectApplicationModal({
  application,
  loading,
  onClose,
  onSubmit,
}: {
  application: ArtistApplication;
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError("Majburiy maydon");
      return;
    }
    await onSubmit(reason.trim());
  };

  return (
    <Modal title={`Ariza #${toDisplay(application.id)} rad etish`} onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sabab</label>
          <Input.TextArea
            rows={4}
            value={reason}
            status={error ? "error" : undefined}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
          />
          {error ? <p className="mt-1 text-xs font-semibold text-rose-500">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Bajarilmoqda..." : "Rad etish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function createCategoryMap(categories: Category[]) {
  return new Map(
    categories
      .filter((category) => typeof category.id === "number")
      .map((category) => [category.id as number, category]),
  );
}

function getResultCount(result: ListResult<ArtistApplication>) {
  return Number(result.meta?.totalCount ?? result.meta?.total ?? result.items.length) || 0;
}

function filterRows(
  rows: ArtistApplication[],
  filters: ApplicationsFilterState,
  categoryMap: CategoryMap,
) {
  return rows.filter((row) => {
    if (filters.search && !matchesSearch(row, filters.search, categoryMap)) return false;
    if (filters.categoryId && !matchesCategory(row, Number(filters.categoryId))) return false;
    if (filters.dateRange !== "all" && !matchesDateRange(row, filters.dateRange, filters.customDateRange)) return false;
    if (filters.status !== "all" && applicationStatusKey(row) !== filters.status) return false;
    return true;
  });
}

function matchesSearch(application: ArtistApplication, search: string, categoryMap: CategoryMap) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    application.id,
    application.profile_photo_id,
    application.bio,
    application.rejection_reason,
    application.administrator_name,
    getApplicationTitle(application, categoryMap),
    getApplicationUserName(application),
    getContactValue(application, ["phone", "extra_phone", "administrator_phone", "email"]),
    ...getCategoryList(application.category_ids, categoryMap),
    ...getCategoryList(application.sub_category_ids, categoryMap),
    formatDateParts(application.created_at).full,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  return haystack.includes(query);
}

function matchesCategory(application: ArtistApplication, categoryId: number) {
  if (!Number.isFinite(categoryId)) return true;
  return [...(application.category_ids ?? []), ...(application.sub_category_ids ?? [])].includes(categoryId);
}

function matchesDateRange(
  application: ArtistApplication,
  range: ApplicationsFilterState["dateRange"],
  customRange: ApplicationsFilterState["customDateRange"],
) {
  const date = toDate(application.created_at);
  if (!date) return false;

  if (range === "custom") {
    if (!customRange) return true;
    const [startValue, endValue] = customRange;
    const start = new Date(`${startValue}T00:00:00`);
    const end = new Date(`${endValue}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
    return date >= start && date <= end;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (range === "today") return date >= start;

  if (range === "week") {
    start.setDate(start.getDate() - 6);
    return date >= start;
  }

  if (range === "month") {
    start.setDate(start.getDate() - 29);
    return date >= start;
  }

  return true;
}
