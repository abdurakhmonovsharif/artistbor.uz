"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Drawer, Input, Select } from "antd";
import { Ban, Pencil, Plus, RotateCcw, Search, Unlock, X } from "lucide-react";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import {
  adminActionButtonLargeClass,
  adminDangerActionButtonClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
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
  page: 1,
  limit,
};

export default function OperatorsPage() {
  const { locale, t } = useI18n();
  const labels = getOperatorLabels(locale);
  const staffStatusOptions = getStaffStatusOptions(labels);
  const columns = getStaffColumns(labels);
  const [filters, setFilters] = useState<StaffFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<StaffFilters>(initialFilters);
  const [rows, setRows] = useState<User[]>([]);
  const [meta, setMeta] = useState<ListResult<User>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await staffApi.list({ ...filters, role: operatorRole });
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : getOperatorLabels(locale).loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStaff();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStaff]);

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
        await staffApi.block(dialog.user.id);
        toast.success(labels.blocked);
      } else {
        await staffApi.unblock(dialog.user.id);
        toast.success(labels.unblocked);
      }
      setDialog(null);
      await fetchStaff();
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
      await fetchStaff();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const updateOperator = async (user: User, payload: UpdateStaffPayload) => {
    if (!user.id) return;
    setSubmitting(true);
    try {
      await staffApi.update(user.id, payload);
      toast.success(labels.updated);
      setDialog(null);
      await fetchStaff();
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
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className={adminActionButtonLargeClass}
        >
          <Plus className="size-4" />
          {labels.createAction}
        </button>
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
            options={[{ label: `${labels.status}: ${labels.all}`, value: "" }, ...staffStatusOptions]}
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
          onSubmitUpdate={(payload) => {
            if (dialog.type !== "edit") return Promise.resolve();
            return updateOperator(dialog.user, payload);
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
  onSubmitUpdate?: (payload: UpdateStaffPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    phone: user?.phone ?? "",
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
        phone: values.phone,
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
      phone: values.phone,
      email: values.email || undefined,
      role: 20,
      status: Number(values.status),
    });
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
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
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
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 64, padding: "0 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
    >
      <form id={formId} onSubmit={submit} className="space-y-5 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField compact autoComplete="off" label={labels.phone} required value={values.phone} error={errors.phone} onChange={(phone) => setValues((current) => ({ ...current, phone }))} />
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
          <FormField compact autoComplete="off" className="md:col-span-2" label="Email" value={values.email} onChange={(email) => setValues((current) => ({ ...current, email }))} />
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

function formatStaffStatus(value: User["status"], labels: OperatorLabels) {
  const status = String(value ?? "");
  const statusLabels: Record<string, string> = {
    "0": labels.deletedStatus,
    "9": labels.inactiveStatus,
    "10": labels.activeStatus,
    "20": labels.blockedStatus,
  };
  return statusLabels[status] ?? (status || "—");
}

type OperatorLabels = ReturnType<typeof getOperatorLabels>;

function getStaffColumns(labels: OperatorLabels): DataTableColumn<User>[] {
  return [
    { key: "id", label: "ID", kind: "number" },
    { key: "first_name", label: labels.firstName },
    { key: "last_name", label: labels.lastName },
    { key: "phone", label: labels.phone },
    { key: "email", label: "Email" },
    { key: "status", label: labels.status, render: (row) => formatStaffStatus(row.status, labels) },
    { key: "created_at", label: labels.createdAt, kind: "date" },
  ];
}

function getStaffStatusOptions(labels: OperatorLabels) {
  return [
    { label: labels.activeStatus, value: "10" },
    { label: labels.inactiveStatus, value: "9" },
    { label: labels.blockedStatus, value: "20" },
    { label: labels.deletedStatus, value: "0" },
  ];
}

function getOperatorLabels(locale: string) {
  if (locale === "ru") {
    return {
      actionFailed: "Не удалось выполнить действие",
      activeStatus: "Активный",
      all: "Все",
      blockAction: "Заблокировать",
      blockConfirm: "Подтвердите блокировку оператора.",
      blocked: "Оператор заблокирован",
      blockedStatus: "Заблокирован",
      blockTitle: "Блокировка оператора",
      cancel: "Отмена",
      createAction: "Создать оператора",
      createFailed: "Не удалось создать оператора",
      created: "Оператор создан",
      createdAt: "Создан",
      createTitle: "Создание оператора",
      deletedStatus: "Удален",
      description: "Просмотр, создание, редактирование и блокировка операторов.",
      editTitle: "Редактирование оператора",
      eyebrow: "Операторы",
      firstName: "Имя",
      inactiveStatus: "Неактивный",
      lastName: "Фамилия",
      loadFailed: "Не удалось загрузить операторов",
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
      unblocked: "Оператор разблокирован",
      unblockTitle: "Разблокировка",
      updated: "Оператор обновлен",
      updateFailed: "Не удалось обновить",
    };
  }

  return {
    actionFailed: "Amal bajarilmadi",
    activeStatus: "Faol",
    all: "Barchasi",
    blockAction: "Bloklash",
    blockConfirm: "Operatorni bloklashni tasdiqlaysizmi?",
    blocked: "Operator bloklandi",
    blockedStatus: "Bloklangan",
    blockTitle: "Operatorni bloklash",
    cancel: "Bekor qilish",
    createAction: "Operator yaratish",
    createFailed: "Operator yaratilmadi",
    created: "Operator yaratildi",
    createdAt: "Yaratilgan",
    createTitle: "Operator yaratish",
    deletedStatus: "O'chirilgan",
    description: "Operatorlarni ko'rish, yaratish, tahrirlash va bloklash.",
    editTitle: "Operatorni tahrirlash",
    eyebrow: "Operatorlar",
    firstName: "Ism",
    inactiveStatus: "Nofaol",
    lastName: "Familiya",
    loadFailed: "Operatorlar yuklanmadi",
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
    unblocked: "Operator blokdan chiqarildi",
    unblockTitle: "Blokdan chiqarish",
    updated: "Operator yangilandi",
    updateFailed: "Yangilash bajarilmadi",
  };
}
