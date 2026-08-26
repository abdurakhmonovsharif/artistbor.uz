"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { Button, Drawer, Input, Select } from "antd";
import { ArrowDownUp, Ban, Pencil, Plus, RotateCcw, Search, Unlock, X } from "lucide-react";
import {
  adminActionButtonLargeClass,
  adminDangerActionButtonClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { adminDrawerClassNames, adminDrawerStyles } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  DateFilterSelect,
  getDateFilterPatch,
  inferDateFilterMode,
  type DateFilterValue,
} from "@/components/admin/date-filter-select";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  staffApi,
  type CreateStaffPayload,
  type StaffFilters,
  type UpdateStaffPayload,
} from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getDashboardNotification, getDashboardStatus } from "@/lib/i18n/dashboard-copy";
import type { Locale } from "@/lib/i18n/translations";
import { formatPhone, normalizePhoneForApi } from "@/lib/phone-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLatestRequest } from "@/lib/use-latest-request";
import { cn } from "@/lib/utils";
import type { ListResult, User } from "@/types/api";

type DialogState =
  | { type: "create" }
  | { type: "edit"; user: User }
  | { type: "block"; user: User }
  | { type: "unblock"; user: User }
  | null;

const limit = 20;
const operatorRole = 20;

const initialFilters: StaffFilters = {
  role: operatorRole,
  status: "",
  search: "",
  date_from: "",
  date_to: "",
  sort: "-created_at",
  page: 1,
  limit,
};

function formatPhoneInput(value: unknown) {
  return formatPhone(value);
}

export default function OperatorsPage() {
  const { locale } = useI18n();
  const labels = getOperatorLabels(locale);
  const staffStatusOptions = getStaffStatusOptions(labels);
  const [filters, setFilters] = useState<StaffFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<StaffFilters>(initialFilters);
  const [rows, setRows] = useState<User[]>([]);
  const [meta, setMeta] = useState<ListResult<User>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dateFilterMode, setDateFilterMode] = useState(() => inferDateFilterMode(initialFilters));
  const toast = useToast();
  const startListRequest = useLatestRequest(filters);
  const debouncedSearch = useDebouncedValue(draftFilters.search ?? "", 450);

  const fetchStaff = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startListRequest();
    if (!background) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await staffApi.list({ ...filters, role: operatorRole });
      if (!isLatestRequest()) return;
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : getOperatorLabels(locale).loadFailed;
      if (background) toast.error(message);
      else setError(message);
    } finally {
      if (isLatestRequest()) setLoading(false);
    }
  }, [filters, locale, startListRequest, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStaff();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStaff]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextLimit = Number(current.limit) || limit;
        const next: StaffFilters = {
          ...current,
          search: debouncedSearch,
          page: 1,
          limit: nextLimit,
        };

        if (
          (current.search ?? "") === next.search &&
          Number(current.page ?? 1) === next.page &&
          Number(current.limit ?? limit) === next.limit
        ) {
          return current;
        }

        return next;
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [debouncedSearch]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draftFilters, page: 1, limit: Number(filters.limit) || limit });
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    setDateFilterMode(inferDateFilterMode(initialFilters));
  };

  const changePage = (page: number) => {
    setFilters((current) => ({ ...current, page, limit: Number(current.limit) || limit }));
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, limit: nextLimit }));
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }));
  };

  const changeDraftFilter = (next: Partial<StaffFilters>) => {
    setDraftFilters((current) => ({ ...current, ...next }));
    setFilters((current) => ({
      ...current,
      ...next,
      page: 1,
      limit: Number(current.limit) || limit,
    }));
  };

  const changeDateFilter = (value: DateFilterValue) => {
    setDateFilterMode(value.mode);
    changeDraftFilter(getDateFilterPatch(value));
  };

  const runConfirmedAction = async () => {
    if (!dialog || (dialog.type !== "block" && dialog.type !== "unblock") || !dialog.user.id) return;
    setSubmitting(true);
    try {
      if (dialog.type === "block") {
        await staffApi.block(dialog.user.id);
        toast.success(labels.blocked);
      } else {
        await staffApi.unblock(dialog.user.id);
        toast.success(labels.unblocked);
      }
      setDialog(null);
      void fetchStaff({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.actionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const createOperator = async (payload: CreateStaffPayload) => {
    setSubmitting(true);
    try {
      await staffApi.create(payload);
      toast.success(labels.created);
      setDialog(null);
      void fetchStaff({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const updateOperatorWithPassword = async (user: User, payload: UpdateStaffPayload, password?: string) => {
    if (!user.id) return;
    setSubmitting(true);
    try {
      await staffApi.update(user.id, payload);
      if (password) {
        await staffApi.resetPassword(user.id, password);
      }
      toast.success(password ? labels.updatedWithPassword : labels.updated);
      setDialog(null);
      void fetchStaff({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.updateFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const page = Number(filters.page ?? 1);
  const pageCount =
    meta?.pageCount ??
    (meta?.total && (meta?.perPage ?? meta?.limit)
      ? Math.ceil(meta.total / (meta.perPage ?? meta.limit ?? limit))
      : undefined);

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        actions={(
          <button
            type="button"
            onClick={() => setDialog({ type: "create" })}
            className={cn(adminActionButtonLargeClass, "w-full md:w-auto")}
          >
            <Plus className="size-4" />
            {labels.createAction}
          </button>
        )}
      />

      <form
        onSubmit={applyFilters}
        className="artistbor-table-filter-shell artistbor-responsive-filter-shell"
      >
        <div className="artistbor-table-filter-panel artistbor-responsive-filter-panel grid gap-3 md:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] md:items-center">
          <Input
            allowClear
            prefix={<Search className="size-4 text-[#94a3b8]" />}
            value={draftFilters.search ?? ""}
            placeholder={labels.searchPlaceholder}
            onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
            className={cn(
              "artistbor-table-filter-control artistbor-filter-search h-10",
              draftFilters.search && "artistbor-filter-search-active",
            )}
          />
          <Select
            className="artistbor-compact-select artistbor-table-filter-control !h-10 !w-[220px] shrink-0 md:justify-self-start"
            value={draftFilters.status ?? ""}
            onChange={(status) => changeDraftFilter({ status })}
            options={[{ label: `${labels.status}: ${labels.all}`, value: "" }, ...staffStatusOptions]}
          />
          <DateFilterSelect
            value={{
              mode: dateFilterMode,
              date_from: draftFilters.date_from ?? "",
              date_to: draftFilters.date_to ?? "",
            }}
            labels={{
              label: labels.dateFilter,
              newest: labels.newest,
              oldest: labels.oldest,
              custom: labels.custom,
              from: labels.dateFrom,
              to: labels.dateTo,
            }}
            onChange={changeDateFilter}
          />
          <Button
            htmlType="button"
            className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 w-28 shrink-0 md:col-start-5"
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            {labels.clear}
          </Button>
        </div>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <OperatorsTable
          rows={rows}
          labels={labels}
          onEdit={(row) => setDialog({ type: "edit", user: row })}
          onBlock={(row) => setDialog({ type: "block", user: row })}
          onUnblock={(row) => setDialog({ type: "unblock", user: row })}
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

      {dialog?.type === "create" || dialog?.type === "edit" ? (
        <StaffDrawer
          key={dialog.type === "edit" ? `edit-${dialog.user.id ?? "unknown"}` : "create"}
          mode={dialog.type}
          labels={labels}
          statusOptions={staffStatusOptions}
          user={dialog.type === "edit" ? dialog.user : undefined}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmitCreate={createOperator}
          onSubmitUpdate={(payload, password) => {
            if (dialog.type !== "edit") return Promise.resolve();
            return updateOperatorWithPassword(dialog.user, payload, password);
          }}
        />
      ) : null}

      {dialog?.type === "block" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          title={labels.blockTitle}
          message={labels.blockConfirm}
          confirmLabel={labels.blockAction}
          onCancel={() => setDialog(null)}
          onConfirm={runConfirmedAction}
        />
      ) : null}

      {dialog?.type === "unblock" ? (
        <ConfirmDialog
          loading={submitting}
          title={labels.unblockTitle}
          message={labels.unblockConfirm}
          confirmLabel={labels.unblockAction}
          onCancel={() => setDialog(null)}
          onConfirm={runConfirmedAction}
        />
      ) : null}
    </section>
  );
}

function OperatorsTable({
  rows,
  labels,
  onEdit,
  onBlock,
  onUnblock,
}: {
  rows: User[];
  labels: OperatorLabels;
  onEdit: (row: User) => void;
  onBlock: (row: User) => void;
  onUnblock: (row: User) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]">
      <div className="admin-table-scroll artistbor-people-data-table overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-artistbor-accent" role="region" tabIndex={0} aria-label={labels.title}>
        <table aria-label={labels.title} className="w-full min-w-[1156px] border-separate border-spacing-0">
          <colgroup>
            <col className="w-14" />
            <col className="w-[340px]" />
            <col className="w-[280px]" />
            <col className="w-[140px]" />
            <col className="w-[190px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr className="h-11 bg-[#f8fafc] dark:bg-white/[0.03]">
              <OperatorsTableHead label="Public ID" sortable />
              <OperatorsTableHead label={labels.operator} sortable />
              <OperatorsTableHead label={labels.contact} />
              <OperatorsTableHead label={labels.status} />
              <OperatorsTableHead label={labels.createdAt} sortable />
              <OperatorsTableHead label={labels.actions} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id ?? "operator"}-${index}`} className="h-16 transition hover:bg-[#fffaf3] dark:hover:bg-amber-500/[0.04]">
                <td className="whitespace-nowrap border-b border-artistbor-border px-3.5 py-[9px] align-middle text-[13px] font-semibold text-artistbor-secondary">
                  {row.public_id ?? "—"}
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <OperatorIdentityCell user={row} labels={labels} />
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <OperatorContactCell user={row} />
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <OperatorStatusPill user={row} labels={labels} />
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle text-[13px] font-medium text-[#475569] dark:border-white/10 dark:text-slate-300">
                  {formatOperatorDate(row.created_at)}
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <div className="flex items-center justify-end gap-1.5">
                    <OperatorTableActionButton label={labels.editTitle} onClick={() => onEdit(row)}>
                      <Pencil className="size-4" />
                    </OperatorTableActionButton>
                    {isBlockedUser(row) ? (
                      <OperatorTableActionButton tone="success" label={labels.unblockAction} onClick={() => onUnblock(row)}>
                        <Unlock className="size-4" />
                      </OperatorTableActionButton>
                    ) : (
                      <OperatorTableActionButton tone="danger" label={labels.blockAction} onClick={() => onBlock(row)}>
                        <Ban className="size-4" />
                      </OperatorTableActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OperatorsTableHead({
  label,
  sortable,
  align = "left",
}: {
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "border-b border-[#e6ebf2] px-3.5 py-0 text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <span className={cn("inline-flex items-center gap-1.5", align === "right" && "justify-end")}>
        {label}
        {sortable ? <ArrowDownUp className="size-3 text-[#94a3b8]" /> : null}
      </span>
    </th>
  );
}

function OperatorIdentityCell({ user, labels }: { user: User; labels: OperatorLabels }) {
  const name = getOperatorName(user, labels);
  const initials = getOperatorInitials(name);
  const avatarTone = getOperatorAvatarTone(user.id ?? name);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1", avatarTone)}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
          {name}
        </p>
      </div>
    </div>
  );
}

function OperatorContactCell({ user }: { user: User }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
        {formatPhone(user.phone) || "—"}
      </p>
      {user.email ? (
        <p className="truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
          {user.email}
        </p>
      ) : null}
    </div>
  );
}

function OperatorStatusPill({ user, labels }: { user: User; labels: OperatorLabels }) {
  const status = getOperatorStatusDisplay(user, labels);

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]",
        status.tone === "danger"
          ? "bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-500/10 dark:text-rose-300"
          : status.tone === "neutral"
            ? "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
            : "bg-[#dcfce7] text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-300",
      )}
    >
      {status.label}
    </span>
  );
}

function OperatorTableActionButton({
  label,
  children,
  tone = "default",
  onClick,
}: {
  label: string;
  children: ReactNode;
  tone?: "default" | "danger" | "success";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-[10px] border bg-white transition hover:bg-[#f8fafc] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
        tone === "danger"
          ? "border-[#fecaca] text-[#f43f5e] hover:border-rose-300 dark:border-rose-500/30 dark:text-rose-300"
          : tone === "success"
            ? "border-[#bbf7d0] text-[#10b981] hover:border-emerald-300 dark:border-emerald-500/30 dark:text-emerald-300"
            : "border-[#e6ebf2] text-[#475569] hover:border-[#cbd5e1] dark:border-white/10 dark:text-slate-300",
      )}
    >
      {children}
    </button>
  );
}

function StaffDrawer({
  mode,
  labels,
  statusOptions = [],
  user,
  loading,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: {
  mode: "create" | "edit";
  labels: OperatorLabels;
  statusOptions?: { label: string; value: string }[];
  user?: User;
  loading: boolean;
  onClose: () => void;
  onSubmitCreate?: (payload: CreateStaffPayload) => Promise<void>;
  onSubmitUpdate?: (payload: UpdateStaffPayload, password?: string) => Promise<void>;
}) {
  const [values, setValues] = useState({
    phone: formatPhoneInput(user?.phone),
    password: "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    email: user?.email ?? "",
    status: user?.status === undefined ? "" : String(user.status),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = mode === "create" ? "operator-create-form" : "operator-edit-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const requiredFields =
      mode === "create"
        ? ["phone", "password", "first_name"]
        : ["phone", "first_name", "status"];
    const nextErrors = validateRequired(values, requiredFields, labels.requiredField);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (mode === "create") {
      await onSubmitCreate?.({
        phone: normalizePhoneForApi(values.phone),
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name || undefined,
        email: values.email || undefined,
        role: 20,
      });
      return;
    }

    await onSubmitUpdate?.({
      first_name: values.first_name,
      last_name: values.last_name || undefined,
      phone: normalizePhoneForApi(values.phone),
      email: values.email || undefined,
      role: 20,
      status: Number(values.status),
    }, values.password.trim() || undefined);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      size="min(100vw, 480px)"
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName="artistbor-application-drawer"
      classNames={adminDrawerClassNames}
      title={<span className="truncate text-lg font-bold text-slate-950 dark:text-white">{mode === "create" ? labels.createTitle : labels.editTitle}</span>}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <DrawerActionButton
            icon={<X className="size-4" />}
            label={labels.cancel}
            onClick={onClose}
          />
          <DrawerActionButton
            form={formId}
            icon={mode === "create" ? <Plus className="size-4" /> : <Pencil className="size-4" />}
            label={loading ? labels.saving : labels.save}
            loading={loading}
            tone="save"
            type="submit"
          />
        </div>
      }
      styles={adminDrawerStyles}
    >
      <form id={formId} onSubmit={submit} className="space-y-5 p-4">
        <div className="grid gap-4">
          <FormField compact autoComplete="off" label={labels.phone} required type="tel" value={values.phone} error={errors.phone} placeholder="+998 XX XXX XX XX" onChange={(phone) => setValues((current) => ({ ...current, phone: formatPhoneInput(phone) }))} />
          {mode === "create" ? (
            <FormField compact autoComplete="new-password" label={labels.password} type="password" required value={values.password} error={errors.password} onChange={(password) => setValues((current) => ({ ...current, password }))} />
          ) : null}
          <FormField compact autoComplete="off" label={labels.firstName} required value={values.first_name} error={errors.first_name} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
          <FormField compact autoComplete="off" label={labels.lastName} value={values.last_name} error={errors.last_name} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
          {mode === "edit" ? (
            <FormField
              compact
              label={labels.status}
              type="select"
              required
              value={values.status}
              error={errors.status}
              options={statusOptions}
              onChange={(status) => setValues((current) => ({ ...current, status }))}
            />
          ) : null}
          <FormField compact autoComplete="off" label="Email" value={values.email} onChange={(email) => setValues((current) => ({ ...current, email }))} />
          {mode === "edit" ? (
            <FormField compact autoComplete="new-password" label={labels.newPassword} type="password" value={values.password} error={errors.password} onChange={(password) => setValues((current) => ({ ...current, password }))} />
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}

function DrawerActionButton({
  icon,
  label,
  loading,
  tone = "default",
  ...buttonProps
}: {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  tone?: "default" | "save";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? "button"}
      disabled={loading || buttonProps.disabled}
      className={tone === "save" ? adminPrimaryActionButtonClass : adminDangerActionButtonClass}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function validateRequired(values: Record<string, string>, keys: string[], message: string) {
  const errors: Record<string, string> = {};
  for (const key of keys) {
    if (!values[key]) errors[key] = message;
  }
  return errors;
}

function isBlockedUser(user: User) {
  const status = String(user.status ?? "").toLowerCase();
  return status.includes("block") || status === "20";
}

function getOperatorStatusDisplay(user: User, labels: OperatorLabels) {
  const status = getDashboardStatus("account", user.status ?? user.status_label, labels.locale);
  return { label: status.label, tone: status.tone };
}

function getOperatorName(user: User, labels: OperatorLabels) {
  const fromParts = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fromParts || user.email || formatPhone(user.phone) || `${labels.operator} ${user.public_id ?? "—"}`;
}

function getOperatorInitials(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "O";
}

function getOperatorAvatarTone(seed: unknown) {
  const tones = [
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20",
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
  ];
  const text = String(seed ?? "");
  const hash = Array.from(text).reduce((total, char) => total + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}

function formatOperatorDate(value: unknown) {
  const date = toOperatorDate(value);
  if (!date) return "—";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function toOperatorDate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value.trim());
    if (Number.isFinite(parsed)) return new Date(parsed);
  }

  return null;
}

type OperatorLabels = ReturnType<typeof getOperatorLabels>;

function getStaffStatusOptions(labels: OperatorLabels) {
  return [
    { label: labels.activeStatus, value: "10" },
    { label: labels.inactiveStatus, value: "9" },
    { label: labels.blockedStatus, value: "20" },
    { label: labels.deletedStatus, value: "0" },
  ];
}

function getOperatorLabels(locale: string) {
  const language = locale === "ru" ? "ru" : "uz";
  const accountStatus = (value: number) => getDashboardStatus("account", value, language).label;
  const notification = (key: Parameters<typeof getDashboardNotification>[0]) =>
    getDashboardNotification(key, language);

  if (locale === "ru") {
    return {
      locale: language as Locale,
      actionFailed: "Не удалось выполнить действие",
      actions: "Действия",
      activeStatus: accountStatus(10),
      all: "Все",
      blockAction: "Заблокировать",
      blockConfirm: "Подтвердите блокировку оператора.",
      blocked: notification("operatorBlocked"),
      blockedStatus: accountStatus(20),
      blockTitle: "Блокировка оператора",
      cancel: "Закрыть",
      clear: "Сбросить",
      contact: "Контакт",
      createAction: "Создать оператора",
      createFailed: "Не удалось создать оператора",
      created: notification("operatorCreated"),
      createdAt: "Создан",
      createTitle: "Создание оператора",
      custom: "Настроить",
      dateFilter: "Дата",
      dateFrom: "Дата с",
      dateTo: "Дата до",
      deletedStatus: accountStatus(0),
      description: "Просмотр, создание, редактирование и блокировка операторов.",
      editTitle: "Редактирование оператора",
      eyebrow: "Операторы",
      firstName: "Имя",
      inactiveStatus: accountStatus(9),
      lastName: "Фамилия",
      loadFailed: "Не удалось загрузить операторов",
      newPassword: "Новый пароль",
      newest: "Новые",
      oldest: "Старые",
      operator: "Оператор",
      password: "Пароль",
      phone: "Телефон",
      requiredField: "Обязательное поле",
      save: "Сохранить",
      saving: "Сохранение...",
      search: "Поиск",
      searchPlaceholder: "Имя, телефон или email",
      status: "Статус",
      title: "Операторы",
      unblockAction: "Разблокировать",
      unblockConfirm: "Подтвердите разблокировку оператора.",
      unblocked: notification("operatorUnblocked"),
      unblockTitle: "Разблокировка",
      updated: notification("operatorUpdated"),
      updatedWithPassword: notification("operatorUpdatedWithPassword"),
      updateFailed: "Не удалось обновить",
    };
  }

  return {
    locale: language as Locale,
    actionFailed: "Amal bajarilmadi",
    actions: "Amallar",
    activeStatus: accountStatus(10),
    all: "Barchasi",
    blockAction: "Bloklash",
    blockConfirm: "Operatorni bloklashni tasdiqlaysizmi?",
    blocked: notification("operatorBlocked"),
    blockedStatus: accountStatus(20),
    blockTitle: "Operatorni bloklash",
    cancel: "Yopish",
    clear: "Tozalash",
    contact: "Aloqa",
    createAction: "Operator yaratish",
    createFailed: "Operator yaratilmadi",
    created: notification("operatorCreated"),
    createdAt: "Yaratilgan",
    createTitle: "Operator yaratish",
    custom: "Sozlash",
    dateFilter: "Sana",
    dateFrom: "Sanadan",
    dateTo: "Sanagacha",
    deletedStatus: accountStatus(0),
    description: "Operatorlarni ko'rish, yaratish, tahrirlash va bloklash.",
    editTitle: "Operatorni tahrirlash",
    eyebrow: "Operatorlar",
    firstName: "Ism",
    inactiveStatus: accountStatus(9),
    lastName: "Familiya",
    loadFailed: "Operatorlar yuklanmadi",
    newPassword: "Yangi parol",
    newest: "Yangilari",
    oldest: "Eng eskilari",
    operator: "Operator",
    password: "Parol",
    phone: "Telefon",
    requiredField: "Majburiy maydon",
    save: "Saqlash",
    saving: "Saqlanmoqda...",
    search: "Qidiruv",
    searchPlaceholder: "Ism, telefon yoki email",
    status: "Holat",
    title: "Operatorlar",
    unblockAction: "Blokdan chiqarish",
    unblockConfirm: "Operatorni blokdan chiqarishni tasdiqlaysizmi?",
    unblocked: notification("operatorUnblocked"),
    unblockTitle: "Blokdan chiqarish",
    updated: notification("operatorUpdated"),
    updatedWithPassword: notification("operatorUpdatedWithPassword"),
    updateFailed: "Yangilash bajarilmadi",
  };
}
