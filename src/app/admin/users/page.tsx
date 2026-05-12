"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Input, Select } from "antd";
import { Ban, Pencil, RotateCcw, Search, Unlock, X } from "lucide-react";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import {
  adminActionButtonClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
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
  page: 1,
  limit,
};

export default function UsersPage() {
  const { locale, t } = useI18n();
  const labels = getUserLabels(locale);
  const userStatusOptions = getUserStatusOptions(labels);
  const columns = getUserColumns(labels);
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<UserFilters>(initialFilters);
  const [rows, setRows] = useState<User[]>([]);
  const [meta, setMeta] = useState<ListResult<User>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await usersApi.list({ ...filters, role: clientRole });
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : getUserLabels(locale).loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

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
      await fetchUsers();
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
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            {labels.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            {labels.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {labels.description}
          </p>
        </div>
      </div>

      <AdminFilterForm
        onSubmit={applyFilters}
        gridClassName="md:grid-cols-[minmax(180px,1.2fr)_minmax(150px,0.75fr)_auto] md:items-center"
        mobileLabel={t("actions.search")}
      >
          <Input
            allowClear
            prefix={<Search className="size-4 text-slate-400" />}
            value={draftFilters.search ?? ""}
            placeholder={labels.searchPlaceholder}
            onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
            className={`${adminFilterControlClass} h-10`}
          />
          <Select
            className={`${adminFilterControlClass} h-10`}
            value={draftFilters.status ?? ""}
            onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
            options={[{ label: `${labels.status}: ${labels.all}`, value: "" }, ...userStatusOptions]}
          />
          <Button
            htmlType="button"
            className={`${adminFilterActionClass} h-10`}
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            {t("actions.clear")}
          </Button>
      </AdminFilterForm>

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
              <IconButton label={t("actions.edit")} onClick={() => setDialog({ type: "edit", user: row })}>
                <Pencil className="size-4" />
              </IconButton>
              {isBlockedUser(row) ? (
                <IconButton label={labels.unblockAction} onClick={() => setDialog({ type: "unblock", user: row })}>
                  <Unlock className="size-4" />
                </IconButton>
              ) : (
                <IconButton danger label={labels.blockAction} onClick={() => setDialog({ type: "block", user: row })}>
                  <Ban className="size-4" />
                </IconButton>
              )}
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
              await fetchUsers();
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
    phone: user.phone ?? "",
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
      phone: values.phone,
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
          <FormField compact label={labels.firstName} required value={values.first_name} error={errors.first_name} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
          <FormField compact label={labels.lastName} value={values.last_name} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
          <FormField compact label={labels.phone} required value={values.phone} error={errors.phone} onChange={(phone) => setValues((current) => ({ ...current, phone }))} />
          <FormField compact label="Email" value={values.email} onChange={(email) => setValues((current) => ({ ...current, email }))} />
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

function IconButton({
  label,
  children,
  danger,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-2 transition ${
        danger
          ? "border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
      }`}
    >
      {children}
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

function formatUserStatus(value: User["status"], labels: UserLabels) {
  const status = String(value ?? "");
  const statusLabels: Record<string, string> = {
    "0": labels.deletedStatus,
    "9": labels.inactiveStatus,
    "10": labels.activeStatus,
    "20": labels.blockedStatus,
  };
  return statusLabels[status] ?? (status || "—");
}

type UserLabels = ReturnType<typeof getUserLabels>;

function getUserColumns(labels: UserLabels): DataTableColumn<User>[] {
  return [
    { key: "id", label: "ID", kind: "number" },
    { key: "first_name", label: labels.firstName },
    { key: "last_name", label: labels.lastName },
    { key: "phone", label: labels.phone },
    { key: "email", label: "Email" },
    { key: "status", label: labels.status, render: (row) => formatUserStatus(row.status, labels) },
    { key: "created_at", label: labels.createdAt, kind: "date" },
  ];
}

function getUserStatusOptions(labels: UserLabels) {
  return [
    { label: labels.activeStatus, value: "10" },
    { label: labels.inactiveStatus, value: "9" },
    { label: labels.blockedStatus, value: "20" },
    { label: labels.deletedStatus, value: "0" },
  ];
}

function getUserLabels(locale: string) {
  if (locale === "ru") {
    return {
      actionFailed: "Не удалось выполнить действие",
      activeStatus: "Активный",
      all: "Все",
      blockAction: "Заблокировать",
      blockConfirm: "Подтвердите блокировку пользователя.",
      blocked: "Пользователь заблокирован",
      blockedStatus: "Заблокирован",
      blockTitle: "Блокировка пользователя",
      cancel: "Отмена",
      createdAt: "Создан",
      deletedStatus: "Удален",
      description: "Просмотр, редактирование и блокировка обычных клиентских пользователей.",
      editTitle: "Редактирование пользователя",
      eyebrow: "Пользователи",
      firstName: "Имя",
      inactiveStatus: "Неактивный",
      lastName: "Фамилия",
      loadFailed: "Не удалось загрузить пользователей",
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
      unblocked: "Пользователь разблокирован",
      unblockTitle: "Разблокировка",
      updated: "Пользователь обновлен",
    };
  }

  return {
    actionFailed: "Amal bajarilmadi",
    activeStatus: "Faol",
    all: "Barchasi",
    blockAction: "Bloklash",
    blockConfirm: "Foydalanuvchini bloklashni tasdiqlaysizmi?",
    blocked: "Foydalanuvchi bloklandi",
    blockedStatus: "Bloklangan",
    blockTitle: "Foydalanuvchini bloklash",
    cancel: "Bekor qilish",
    createdAt: "Yaratilgan",
    deletedStatus: "O'chirilgan",
    description: "Oddiy mijoz foydalanuvchilarni ko'rish, tahrirlash va bloklash.",
    editTitle: "Foydalanuvchini tahrirlash",
    eyebrow: "Foydalanuvchilar",
    firstName: "Ism",
    inactiveStatus: "Nofaol",
    lastName: "Familiya",
    loadFailed: "Foydalanuvchilar yuklanmadi",
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
    unblocked: "Foydalanuvchi blokdan chiqarildi",
    unblockTitle: "Blokdan chiqarish",
    updated: "Foydalanuvchi yangilandi",
  };
}
