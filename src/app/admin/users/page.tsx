"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { Button, Input, Select } from "antd";
import { ArrowDownUp, Ban, Pencil, RotateCcw, Search, Unlock, X } from "lucide-react";
import {
  adminActionButtonClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import {
  DateFilterSelect,
  getDateFilterPatch,
  inferDateFilterMode,
  type DateFilterValue,
} from "@/components/admin/date-filter-select";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  usersApi,
  type UpdateUserPayload,
  type UserFilters,
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
  | { type: "edit"; user: User }
  | { type: "block"; user: User }
  | { type: "unblock"; user: User }
  | null;

const limit = 20;
const clientRole = 10;

const initialFilters: UserFilters = {
  role: clientRole,
  status: "",
  search: "",
  date_from: "",
  date_to: "",
  sort: "-created_at",
  page: 1,
  limit,
};

function getUserDrawerInputClassName(error?: string) {
  return cn(
    "!h-10 !rounded-xl !bg-[#f8fafc] !px-3 !py-0 !text-[13px] !font-bold !text-[#475569]",
    "!shadow-none transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "placeholder:!text-[#94a3b8] hover:!border-[#e6ebf2] hover:!bg-[#f8fafc]",
    "dark:!bg-white/[0.035] dark:!text-slate-200 dark:placeholder:!text-slate-500 dark:hover:!bg-white/[0.035]",
    error
      ? "!border-rose-300 focus:!border-rose-400 focus:!ring-0 dark:!border-rose-500/40 dark:focus:!border-rose-400/60"
      : "!border-[#e6ebf2] focus:!border-orange-500/45 focus:!ring-0 dark:!border-white/10 dark:focus:!border-amber-300/50",
  );
}

function getUserDrawerSelectClassName(error?: string) {
  return cn(
    getUserDrawerInputClassName(error),
    "!appearance-none !pr-9",
  );
}

function formatPhoneInput(value: unknown) {
  return formatPhone(value);
}

export default function UsersPage() {
  const { locale, t } = useI18n();
  const labels = getUserLabels(locale);
  const userStatusOptions = getUserStatusOptions(labels);
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<UserFilters>(initialFilters);
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

  const fetchUsers = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startListRequest();
    if (!background) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await usersApi.list({ ...filters, role: clientRole });
      if (!isLatestRequest()) return;
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : getUserLabels(locale).loadFailed;
      if (background) toast.error(message);
      else setError(message);
    } finally {
      if (isLatestRequest()) setLoading(false);
    }
  }, [filters, locale, startListRequest, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextLimit = Number(current.limit) || limit;
        const next: UserFilters = {
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

  const changeDraftFilter = (next: Partial<UserFilters>) => {
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
        await usersApi.block(dialog.user.id);
        toast.success(labels.blocked);
      } else {
        await usersApi.unblock(dialog.user.id);
        toast.success(labels.unblocked);
      }
      setDialog(null);
      void fetchUsers({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.actionFailed);
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
      <AdminPageHeader eyebrow={labels.eyebrow} title={labels.title} description={labels.description} />

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
            className="artistbor-compact-select artistbor-table-filter-control !h-10 !w-[180px] shrink-0 md:justify-self-start"
            value={draftFilters.status ?? ""}
            onChange={(status) => changeDraftFilter({ status })}
            options={[{ label: `${labels.status}: ${labels.all}`, value: "" }, ...userStatusOptions]}
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
        <UsersTable
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

      {dialog?.type === "edit" ? (
        <EditUserDrawer
          labels={labels}
          statusOptions={userStatusOptions}
          user={dialog.user}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.user.id) return;
            setSubmitting(true);
            try {
              await usersApi.update(dialog.user.id, payload);
              toast.success(labels.updated);
              setDialog(null);
              void fetchUsers({ background: true });
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t("crud.updateFailed"));
            } finally {
              setSubmitting(false);
            }
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

function UsersTable({
  rows,
  labels,
  onEdit,
  onBlock,
  onUnblock,
}: {
  rows: User[];
  labels: UserLabels;
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
              <UsersTableHead label="Public ID" sortable />
              <UsersTableHead label={labels.user} sortable />
              <UsersTableHead label={labels.contact} />
              <UsersTableHead label={labels.status} />
              <UsersTableHead label={labels.createdAt} sortable />
              <UsersTableHead label={labels.actions} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id ?? "user"}-${index}`} className="h-16 transition hover:bg-[#fffaf3] dark:hover:bg-amber-500/[0.04]">
                <td className="whitespace-nowrap border-b border-artistbor-border px-3.5 py-[9px] align-middle text-[13px] font-semibold text-artistbor-secondary">
                  {row.public_id ?? "—"}
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <UserIdentityCell user={row} labels={labels} />
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <UserContactCell user={row} />
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <UserStatusPill user={row} labels={labels} />
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle text-[13px] font-medium text-[#475569] dark:border-white/10 dark:text-slate-300">
                  {formatUserDate(row.created_at)}
                </td>
                <td className="border-b border-[#edf2f7] px-3.5 py-[9px] align-middle dark:border-white/10">
                  <div className="flex items-center justify-end gap-1.5">
                    <UserTableActionButton label={labels.editTitle} onClick={() => onEdit(row)}>
                      <Pencil className="size-4" />
                    </UserTableActionButton>
                    {isBlockedUser(row) ? (
                      <UserTableActionButton tone="success" label={labels.unblockAction} onClick={() => onUnblock(row)}>
                        <Unlock className="size-4" />
                      </UserTableActionButton>
                    ) : (
                      <UserTableActionButton tone="danger" label={labels.blockAction} onClick={() => onBlock(row)}>
                        <Ban className="size-4" />
                      </UserTableActionButton>
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

function UsersTableHead({
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

function UserIdentityCell({ user, labels }: { user: User; labels: UserLabels }) {
  const name = getUserName(user, labels);

  return (
    <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
      {name}
    </p>
  );
}

function UserContactCell({ user }: { user: User }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
        {formatPhone(user.phone) || "—"}
      </p>
      <p className="truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
        {user.email || "—"}
      </p>
    </div>
  );
}

function UserStatusPill({ user, labels }: { user: User; labels: UserLabels }) {
  const status = getUserStatusDisplay(user, labels);

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

function UserTableActionButton({
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

function EditUserDrawer({
  labels,
  statusOptions,
  user,
  loading,
  onClose,
  onSubmit,
}: {
  labels: UserLabels;
  statusOptions: { label: string; value: string }[];
  user: User;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateUserPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: formatPhoneInput(user.phone),
    email: user.email ?? "",
    status: user.status === undefined ? "" : String(user.status),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = "user-edit-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateRequired(values, ["first_name", "phone", "status"], labels.requiredField);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      first_name: values.first_name,
      last_name: values.last_name || undefined,
      phone: normalizePhoneForApi(values.phone),
      email: values.email || undefined,
      status: Number(values.status),
    });
  };

  return (
    <AdminDrawer
      title={labels.editTitle}
      onClose={onClose}
      footer={<FormActions labels={labels} loading={loading} onClose={onClose} form={formId} />}
    >
      <form id={formId} onSubmit={submit} className="space-y-5 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField compact label={labels.firstName} required value={values.first_name} error={errors.first_name} inputClassName={getUserDrawerInputClassName(errors.first_name)} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
          <FormField compact label={labels.lastName} value={values.last_name} inputClassName={getUserDrawerInputClassName()} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
          <FormField compact label={labels.phone} required type="tel" value={values.phone} error={errors.phone} placeholder="+998 XX XXX XX XX" inputClassName={getUserDrawerInputClassName(errors.phone)} onChange={(phone) => setValues((current) => ({ ...current, phone: formatPhoneInput(phone) }))} />
          <FormField compact label="Email" value={values.email} inputClassName={getUserDrawerInputClassName()} onChange={(email) => setValues((current) => ({ ...current, email }))} />
          <FormField
            compact
            label={labels.status}
            type="select"
            required
            value={values.status}
            error={errors.status}
            options={statusOptions}
            inputClassName={getUserDrawerSelectClassName(errors.status)}
            onChange={(status) => setValues((current) => ({ ...current, status }))}
          />
        </div>
      </form>
    </AdminDrawer>
  );
}

function FormActions({
  labels,
  form,
  loading,
  onClose,
}: {
  labels: UserLabels;
  form?: string;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onClose}
        className={adminActionButtonClass}
      >
        <X className="size-4" />
        {labels.cancel}
      </button>
      <button
        type="submit"
        form={form}
        disabled={loading}
        className={adminPrimaryActionButtonClass}
      >
        <Pencil className="size-4" />
        {loading ? labels.saving : labels.save}
      </button>
    </div>
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

function getUserStatusDisplay(user: User, labels: UserLabels) {
  const status = getDashboardStatus("account", user.status ?? user.status_label, labels.locale);
  return { label: status.label, tone: status.tone };
}

function getUserName(user: User, labels: UserLabels) {
  const fromParts = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fromParts || user.email || formatPhone(user.phone) || `${labels.user} ${user.public_id ?? "—"}`;
}

function formatUserDate(value: unknown) {
  const date = toDate(value);
  if (!date) return "—";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function toDate(value: unknown) {
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

type UserLabels = ReturnType<typeof getUserLabels>;

function getUserStatusOptions(labels: UserLabels) {
  return [
    { label: labels.activeStatus, value: "10" },
    { label: labels.inactiveStatus, value: "9" },
    { label: labels.blockedStatus, value: "20" },
    { label: labels.deletedStatus, value: "0" },
  ];
}

function getUserLabels(locale: string) {
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
      blockConfirm: "Подтвердите блокировку пользователя.",
      blocked: notification("userBlocked"),
      blockedStatus: accountStatus(20),
      blockTitle: "Блокировка пользователя",
      cancel: "Закрыть",
      clear: "Сбросить",
      contact: "Контакт",
      createdAt: "Создан",
      custom: "Настроить",
      dateFrom: "Дата с",
      dateFilter: "Дата",
      dateTo: "Дата до",
      deletedStatus: accountStatus(0),
      description: "Просмотр, редактирование и блокировка обычных клиентских пользователей.",
      editTitle: "Редактирование пользователя",
      eyebrow: "Пользователи",
      firstName: "Имя",
      inactiveStatus: accountStatus(9),
      lastName: "Фамилия",
      loadFailed: "Не удалось загрузить пользователей",
      newest: "Новые",
      oldest: "Старые",
      phone: "Телефон",
      requiredField: "Обязательное поле",
      save: "Сохранить",
      saving: "Сохранение...",
      search: "Поиск",
      searchPlaceholder: "Имя, телефон или email",
      status: "Статус",
      title: "Пользователи",
      unblockAction: "Разблокировать",
      unblockConfirm: "Подтвердите разблокировку пользователя.",
      unblocked: notification("userUnblocked"),
      unblockTitle: "Разблокировка",
      updated: notification("userUpdated"),
      user: "Пользователь",
    };
  }

  return {
    locale: language as Locale,
    actionFailed: "Amal bajarilmadi",
    actions: "Amallar",
    activeStatus: accountStatus(10),
    all: "Barchasi",
    blockAction: "Bloklash",
    blockConfirm: "Foydalanuvchini bloklashni tasdiqlaysizmi?",
    blocked: notification("userBlocked"),
    blockedStatus: accountStatus(20),
    blockTitle: "Foydalanuvchini bloklash",
    cancel: "Yopish",
    clear: "Tozalash",
    contact: "Aloqa",
    createdAt: "Yaratilgan",
    custom: "Sozlash",
    dateFrom: "Sanadan",
    dateFilter: "Sana",
    dateTo: "Sanagacha",
    deletedStatus: accountStatus(0),
    description: "Oddiy mijoz foydalanuvchilarni ko'rish, tahrirlash va bloklash.",
    editTitle: "Foydalanuvchini tahrirlash",
    eyebrow: "Foydalanuvchilar",
    firstName: "Ism",
    inactiveStatus: accountStatus(9),
    lastName: "Familiya",
    loadFailed: "Foydalanuvchilar yuklanmadi",
    newest: "Yangilari",
    oldest: "Eng eskilari",
    phone: "Telefon",
    requiredField: "Majburiy maydon",
    save: "Saqlash",
    saving: "Saqlanmoqda...",
    search: "Qidiruv",
    searchPlaceholder: "Ism, telefon yoki email",
    status: "Holat",
    title: "Foydalanuvchilar",
    unblockAction: "Blokdan chiqarish",
    unblockConfirm: "Foydalanuvchini blokdan chiqarishni tasdiqlaysizmi?",
    unblocked: notification("userUnblocked"),
    unblockTitle: "Blokdan chiqarish",
    updated: notification("userUpdated"),
    user: "Foydalanuvchi",
  };
}
