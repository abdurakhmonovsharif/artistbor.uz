"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "antd";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { ApplicationsFilterBar, defaultApplicationFilters } from "@/components/admin/applications/applications-filter-bar";
import type { ApplicationsFilterState } from "@/components/admin/applications/applications-filter-bar";
import { ApplicationContactDrawer } from "@/components/admin/applications/application-contact-drawer";
import { ApplicationDetailDrawer } from "@/components/admin/applications/application-detail-drawer";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import { ApplicationsTable } from "@/components/admin/applications/applications-table";
import { ApplicationStatusTabs } from "@/components/admin/applications/application-status-tabs";
import {
  APPLICATION_STATUS_FILTERS,
  applicationStatusKey,
  canApproveApplication,
  canRejectApplication,
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
import { FormField } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  applicationsApi,
  categoriesApi,
  type ApplicationFilters,
} from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Locale } from "@/lib/i18n/translations";
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

type InitialApplicationStatus = Exclude<ApplicationStatusKey, "unknown">;

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ApplicationsContent />
    </Suspense>
  );
}

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();

  return (
    <ApplicationsTableView
      key={queryKey}
      initialStatus={getInitialApplicationStatus(searchParams)}
    />
  );
}

function ApplicationsTableView({ initialStatus }: { initialStatus: InitialApplicationStatus }) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const [apiFilters, setApiFilters] = useState<ApplicationFilters>(() => ({
    ...initialApiFilters,
    status: APPLICATION_STATUS_FILTERS[initialStatus],
  }));
  const [uiFilters, setUiFilters] = useState<ApplicationsFilterState>(() => ({
    ...defaultApplicationFilters,
    status: initialStatus,
  }));
  const [rows, setRows] = useState<ArtistApplication[]>([]);
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
  const debouncedSearch = useDebouncedValue(uiFilters.search, 450);

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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : getApplicationLabels(locale).loadFailed);
    } finally {
      setLoading(false);
    }
  }, [apiFilters, locale]);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await categoriesApi.list({});
      setCategoryMap(createCategoryMap(result.items));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : getApplicationLabels(locale).categoriesLoadFailed);
    }
  }, [locale, toast]);

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

  const appliedUiFilters = useMemo(
    () => ({
      search: debouncedSearch,
      status: uiFilters.status,
      categoryId: uiFilters.categoryId,
      dateRange: uiFilters.dateRange,
      customDateRange: uiFilters.customDateRange,
    }),
    [debouncedSearch, uiFilters.categoryId, uiFilters.customDateRange, uiFilters.dateRange, uiFilters.status],
  );

  const displayedRows = useMemo(
    () => filterRows(rows, appliedUiFilters, categoryMap, locale),
    [rows, appliedUiFilters, categoryMap, locale],
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
      toast.error(caught instanceof Error ? caught.message : labels.detailLoadFailed);
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
    if (!canApproveApplication(dialog.application)) {
      toast.error(labels.alreadyProcessed);
      setDialog(null);
      await Promise.all([fetchApplications(), fetchStatusCounts()]);
      return;
    }
    setSubmitting(true);
    try {
      await applicationsApi.approve(dialog.application.id);
      toast.success(labels.approvedToast);
      setDialog(null);
      setDetailApplication(null);
      await Promise.all([fetchApplications(), fetchStatusCounts()]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.approveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const rejectApplication = async (reason: string) => {
    if (dialog?.type !== "reject" || !dialog.application.id) return;
    if (!canRejectApplication(dialog.application)) {
      toast.error(labels.alreadyProcessed);
      setDialog(null);
      await Promise.all([fetchApplications(), fetchStatusCounts()]);
      return;
    }
    setSubmitting(true);
    try {
      await applicationsApi.reject(dialog.application.id, reason);
      toast.success(labels.rejectedToast);
      setDialog(null);
      setDetailApplication(null);
      await Promise.all([fetchApplications(), fetchStatusCounts()]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.rejectFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const pageCount =
    meta?.pageCount ?? (meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : undefined);

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[2px] text-[#f97316]">{labels.pageEyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold leading-[30px] tracking-[-0.02em] text-[#0f172a] dark:text-white md:text-[30px] md:leading-9">{labels.pageTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-[22px] text-[#64748b] dark:text-slate-400">
          {labels.pageDescription}
        </p>
      </div>

      <ApplicationStatusTabs active={activeStatus} counts={counts} onChange={changeStatus} />
      <ApplicationsFilterBar
        value={uiFilters}
        categoryMap={categoryMap}
        onChange={changeFilters}
        onReset={resetFilters}
      />

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
        onApprove={(application) => setDialog({ type: "approve", application })}
        onReject={(application) => setDialog({ type: "reject", application })}
      />

      <ApplicationContactDrawer
        open={Boolean(contactApplication)}
        application={contactApplication}
        categoryMap={categoryMap}
        onClose={() => setContactApplication(null)}
      />

      {dialog?.type === "approve" ? (
        <ApproveApplicationModal
          loading={submitting}
          application={dialog.application}
          locale={locale}
          onClose={() => setDialog(null)}
          onSubmit={approveApplication}
        />
      ) : null}

      {dialog?.type === "reject" ? (
        <RejectApplicationModal
          loading={submitting}
          application={dialog.application}
          locale={locale}
          onClose={() => setDialog(null)}
          onSubmit={rejectApplication}
        />
      ) : null}
    </section>
  );
}

function ApproveApplicationModal({
  application,
  loading,
  locale,
  onClose,
  onSubmit,
}: {
  application: ArtistApplication;
  loading: boolean;
  locale: Locale;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const labels = getApplicationLabels(locale);
  const applicationId = toDisplay(application.id);
  const formId = `application-approve-form-${applicationId}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <Modal
      centered
      open
      rootClassName="artistbor-confirm-modal"
      width={480}
      title={labels.approveDialogTitle}
      onCancel={onClose}
      closeIcon={<ApplicationModalCloseIcon />}
      footer={
        <div className="grid grid-cols-1 gap-2">
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--success w-full text-sm font-black"
          >
            <CheckCircle2 className="size-4" />
            {loading ? labels.submitting : labels.approveAction}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {labels.approveAction}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
            {labels.approveDialogMessage(applicationId)}
          </p>
        </div>
      </form>
    </Modal>
  );
}

function RejectApplicationModal({
  application,
  loading,
  locale,
  onClose,
  onSubmit,
}: {
  application: ArtistApplication;
  loading: boolean;
  locale: Locale;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const labels = getApplicationLabels(locale);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const formId = `application-reject-form-${toDisplay(application.id)}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError(labels.requiredField);
      return;
    }
    await onSubmit(reason.trim());
  };

  return (
    <Modal
      centered
      open
      rootClassName="artistbor-confirm-modal"
      width={480}
      title={labels.rejectDialogTitle(toDisplay(application.id))}
      onCancel={onClose}
      closeIcon={<ApplicationModalCloseIcon />}
      footer={
        <div className="flex justify-end">
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className="artistbor-modal-action artistbor-modal-action--danger w-1/2 text-sm font-black"
          >
            <XCircle className="size-4" />
            {loading ? labels.submitting : labels.rejectAction}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <FormField
          label={labels.reason}
          type="textarea"
          rows={7}
          required
          value={reason}
          error={error}
          onChange={(nextReason) => {
            setReason(nextReason);
            setError("");
          }}
        />
      </form>
    </Modal>
  );
}

function ApplicationModalCloseIcon() {
  return <X className="size-4" />;
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

function getInitialApplicationStatus(
  searchParams: Pick<URLSearchParams, "get"> | null,
): InitialApplicationStatus {
  const status = String(searchParams?.get("status") ?? "").trim().toLowerCase();
  if (!status) return "all";
  if (status === "pending" || status === "10") return "pending";
  if (status === "approved" || status === "20") return "approved";
  if (status === "rejected" || status === "30") return "rejected";
  return "all";
}

function filterRows(
  rows: ArtistApplication[],
  filters: ApplicationsFilterState,
  categoryMap: CategoryMap,
  locale: Locale,
) {
  return rows.filter((row) => {
    if (filters.search && !matchesSearch(row, filters.search, categoryMap, locale)) return false;
    if (filters.categoryId && !matchesCategory(row, Number(filters.categoryId))) return false;
    if (filters.dateRange !== "all" && !matchesDateRange(row, filters.dateRange, filters.customDateRange)) return false;
    if (filters.status !== "all" && applicationStatusKey(row) !== filters.status) return false;
    return true;
  });
}

function matchesSearch(
  application: ArtistApplication,
  search: string,
  categoryMap: CategoryMap,
  locale: Locale,
) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    application.id,
    application.profile_photo_id,
    application.bio,
    application.rejection_reason,
    application.administrator_name,
    getApplicationTitle(application, categoryMap, locale),
    getApplicationUserName(application),
    getContactValue(application, ["phone", "extra_phone", "administrator_phone", "email"]),
    ...getCategoryList(application.category_ids, categoryMap, locale),
    ...getCategoryList(application.sub_category_ids, categoryMap, locale),
    formatDateParts(application.created_at, locale).full,
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
