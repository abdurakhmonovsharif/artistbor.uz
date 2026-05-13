"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { Eye, Pencil, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import {
  adminActionButtonClass,
  adminActionButtonLargeClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid } from "@/components/admin/detail-grid";
import { Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField, type FormFieldOption } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { ListResult, UnknownRecord } from "@/types/api";
import { cn, isRecord, toDisplay } from "@/lib/utils";

type FieldKind = "text" | "number" | "textarea" | "select";

export type CrudField<TPayload extends object> = {
  name: keyof TPayload & string;
  label: string;
  type?: FieldKind;
  required?: boolean;
  options?: FormFieldOption[];
  createOnly?: boolean;
  updateOnly?: boolean;
};

export type FilterField<TFilters extends object> = {
  name: keyof TFilters & string;
  label: string;
  type?: "text" | "number" | "select";
  placeholder?: string;
  options?: FormFieldOption[];
  hideLabel?: boolean;
  compact?: boolean;
  prefixIcon?: ReactNode;
};

type DialogState<TItem extends object> =
  | { type: "create" }
  | { type: "edit"; item: TItem }
  | { type: "view"; item: TItem }
  | { type: "delete"; item: TItem }
  | { type: "restore"; item: TItem }
  | null;

export function CrudPage<TItem extends { id?: number }, TFilters extends object, TCreate extends object, TUpdate extends object>({
  title,
  eyebrow,
  description,
  columns,
  filterFields,
  createFields,
  updateFields,
  initialFilters,
  pagination,
  list,
  detail,
  create,
  update,
  remove,
  restore,
  extraRowActions,
  filterFormClassName,
  filterGridClassName,
  filterActionsClassName,
  inlineFilterActions,
  autoApplyFilters,
  filterDebounceMs = 400,
  showFilterSearchButton = true,
  showFilterSettingsButton,
}: {
  title: string;
  eyebrow: string;
  description: string;
  columns: DataTableColumn<TItem>[];
  filterFields: FilterField<TFilters>[];
  createFields: CrudField<TCreate>[];
  updateFields: CrudField<TUpdate>[];
  initialFilters: TFilters;
  pagination?: { limit: number };
  list: (filters: TFilters) => Promise<ListResult<TItem>>;
  detail?: (id: number) => Promise<TItem>;
  create: (payload: TCreate) => Promise<unknown>;
  update: (id: number, payload: TUpdate) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  restore?: (id: number) => Promise<unknown>;
  extraRowActions?: (row: TItem) => React.ReactNode;
  filterFormClassName?: string;
  filterGridClassName?: string;
  filterActionsClassName?: string;
  inlineFilterActions?: boolean;
  autoApplyFilters?: boolean;
  filterDebounceMs?: number;
  showFilterSearchButton?: boolean;
  showFilterSettingsButton?: boolean;
}) {
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<TFilters>(initialFilters);
  const [rows, setRows] = useState<TItem[]>([]);
  const [meta, setMeta] = useState<ListResult<TItem>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState<TItem>>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { t } = useI18n();
  const toast = useToast();

  const page = Number((filters as Record<string, unknown>).page ?? 1);
  const pageSize = Number((filters as Record<string, unknown>).limit ?? pagination?.limit ?? 20);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await list(filters);
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("crud.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filters, list, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRows]);

  useEffect(() => {
    if (!autoApplyFilters) return;

    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const currentLimit = Number((current as Record<string, unknown>).limit ?? pagination?.limit ?? 20);
        const nextFilters = {
          ...draftFilters,
          ...(pagination ? { page: 1, limit: currentLimit } : {}),
        } as TFilters;

        return areFiltersEqual(current, nextFilters) ? current : nextFilters;
      });
    }, filterDebounceMs);

    return () => window.clearTimeout(timer);
  }, [autoApplyFilters, draftFilters, filterDebounceMs, pagination]);

  const openDetail = async (type: "view" | "edit", row: TItem) => {
    if (!row.id) return;
    if (!detail) {
      setDialog({ type, item: row });
      return;
    }
    setSubmitting(true);
    try {
      const item = await detail(row.id);
      setDialog({ type, item });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("crud.detailFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    const currentLimit = Number((filters as Record<string, unknown>).limit ?? pagination?.limit ?? 20);
    setFilters({
      ...draftFilters,
      ...(pagination ? { page: 1, limit: currentLimit } : {}),
    });
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const changePage = (nextPage: number) => {
    setFilters((current) => ({ ...current, page: nextPage, limit: Number((current as Record<string, unknown>).limit ?? pagination?.limit ?? 20) }) as TFilters);
  };

  const changePageSize = (nextLimit: number) => {
    setDraftFilters((current) => ({ ...current, limit: nextLimit }) as TFilters);
    setFilters((current) => ({ ...current, page: 1, limit: nextLimit }) as TFilters);
  };

  const filterActions = (
    <div
      className={cn(
        inlineFilterActions ? "flex flex-wrap justify-end gap-2" : "mt-4 flex flex-wrap justify-end gap-3",
        filterActionsClassName,
      )}
    >
      <button
        type="button"
        onClick={resetFilters}
        className={cn(
          "inline-flex items-center justify-center gap-2 border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm shadow-slate-950/[0.02] transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.05]",
          inlineFilterActions ? "h-10 rounded-lg px-4" : "rounded-2xl px-5 py-3",
          showFilterSettingsButton && !mobileFiltersOpen && "hidden md:inline-flex",
        )}
      >
        <RotateCcw className="size-4" />
        {t("actions.clear")}
      </button>
      {showFilterSearchButton ? (
        <button
          type="submit"
          className={cn(
            "inline-flex items-center gap-2 bg-slate-950 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950",
            inlineFilterActions ? "h-10 rounded-lg px-4" : "rounded-2xl px-5 py-3",
            showFilterSettingsButton && !mobileFiltersOpen && "hidden md:inline-flex",
          )}
        >
          <Search className="size-4" />
          {t("actions.search")}
        </button>
      ) : null}
      {showFilterSettingsButton ? (
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((current) => !current)}
          className={cn(
            "inline-flex items-center justify-center border border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-950/[0.02] transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.05] md:hidden",
            inlineFilterActions ? "size-10 rounded-lg" : "size-11 rounded-2xl",
          )}
          aria-label="Filter settings"
          aria-expanded={mobileFiltersOpen}
        >
          <SlidersHorizontal className="size-4" />
        </button>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className={adminActionButtonLargeClass}
        >
          <Plus className="size-4" />
          {t("actions.create")}
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]",
          filterFormClassName,
        )}
      >
        <div
          className={cn(
            "grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111827] md:grid-cols-3",
            filterGridClassName,
          )}
        >
          {filterFields.map((field) => (
            <div
              key={field.name}
              className={cn(showFilterSettingsButton && !mobileFiltersOpen && "hidden md:block")}
            >
              <FormField
                label={field.label}
                type={field.type ?? "text"}
                options={field.options}
                placeholder={field.placeholder}
                hideLabel={field.hideLabel}
                compact={field.compact}
                prefixIcon={field.prefixIcon}
                value={String((draftFilters as Record<string, unknown>)[field.name] ?? "")}
                onChange={(value) =>
                  setDraftFilters((current) => ({ ...current, [field.name]: value }))
                }
              />
            </div>
          ))}
          {inlineFilterActions ? filterActions : null}
        </div>
        {inlineFilterActions ? null : filterActions}
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
              <ActionButton label={t("actions.view")} onClick={() => void openDetail("view", row)}>
                <Eye className="size-4" />
              </ActionButton>
              <ActionButton label={t("actions.edit")} onClick={() => void openDetail("edit", row)}>
                <Pencil className="size-4" />
              </ActionButton>
              {restore ? (
                <ActionButton label={t("actions.restore")} onClick={() => setDialog({ type: "restore", item: row })}>
                  <RotateCcw className="size-4" />
                </ActionButton>
              ) : null}
              {extraRowActions?.(row)}
              <ActionButton danger label={t("actions.delete")} onClick={() => setDialog({ type: "delete", item: row })}>
                <Trash2 className="size-4" />
              </ActionButton>
            </div>
          )}
        />
      )}

      {pagination ? (
        <Pagination
          meta={meta}
          page={page}
          pageSize={pageSize}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      ) : null}

      {dialog?.type === "create" ? (
        <FormDrawer
          mode="create"
          title={t("crud.createTitle", { title })}
          fields={createFields}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await create(payload as TCreate);
              toast.success(t("crud.created"));
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t("crud.createFailed"));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "edit" ? (
        <FormDrawer
          mode="edit"
          title={t("crud.updateTitle", { title })}
          fields={updateFields}
          initial={dialog.item}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.item.id) return;
            setSubmitting(true);
            try {
              await update(dialog.item.id, payload as TUpdate);
              toast.success(t("crud.updated"));
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t("crud.updateFailed"));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "view" ? (
        <AdminDrawer title={t("crud.detailsTitle", { title })} onClose={() => setDialog(null)} size="min(100vw, 720px)">
          <div className="p-4">
            <DetailGrid record={dialog.item as UnknownRecord} />
          </div>
        </AdminDrawer>
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          message={t("crud.deleteConfirm")}
          confirmLabel={t("actions.delete")}
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            if (!dialog.item.id) return;
            setSubmitting(true);
            try {
              await remove(dialog.item.id);
              toast.success(t("crud.deleted"));
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t("crud.deleteFailed"));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "restore" && restore ? (
        <ConfirmDialog
          loading={submitting}
          message={t("crud.restoreConfirm")}
          confirmLabel={t("actions.restore")}
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            if (!dialog.item.id) return;
            setSubmitting(true);
            try {
              await restore(dialog.item.id);
              toast.success(t("crud.restored"));
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t("crud.restoreFailed"));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {submitting && !dialog ? <LoadingState label={t("crud.actionInProgress")} /> : null}
    </section>
  );
}

function FormDrawer<TPayload extends object>({
  title,
  mode,
  fields,
  initial,
  loading,
  onClose,
  onSubmit,
}: {
  title: string;
  mode: "create" | "edit";
  fields: CrudField<TPayload>[];
  initial?: object;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: TPayload) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, initialValue(initial, field.name)])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useI18n();
  const formId = "crud-drawer-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !values[field.name]) {
        nextErrors[field.name] = t("common.requiredField");
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit(buildPayload(fields, values) as TPayload);
  };

  return (
    <AdminDrawer
      title={title}
      onClose={onClose}
      footer={<CrudFormActions form={formId} loading={loading} mode={mode} onClose={onClose} />}
    >
      <form id={formId} onSubmit={submit} className="space-y-5 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              <FormField
                compact
                label={field.label}
                type={
                  field.type === "textarea"
                    ? "textarea"
                    : field.type === "number"
                      ? "number"
                      : field.type === "select"
                        ? "select"
                        : "text"
                }
                options={field.options}
                value={values[field.name] ?? ""}
                required={field.required}
                error={errors[field.name]}
                rows={4}
                onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
              />
            </div>
          ))}
        </div>
      </form>
    </AdminDrawer>
  );
}

function CrudFormActions({
  form,
  loading,
  mode,
  onClose,
}: {
  form: string;
  loading?: boolean;
  mode: "create" | "edit";
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onClose}
        className={adminActionButtonClass}
      >
        <X className="size-4" />
        {t("actions.close")}
      </button>
      <button
        type="submit"
        form={form}
        disabled={loading}
        className={adminPrimaryActionButtonClass}
      >
        {mode === "create" ? <Plus className="size-4" /> : <Pencil className="size-4" />}
        {loading ? t("crud.saving") : t("actions.save")}
      </button>
    </div>
  );
}

function ActionButton({
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

function areFiltersEqual<TFilters extends object>(current: TFilters, next: TFilters) {
  const currentEntries = Object.entries(current);
  const nextEntries = Object.entries(next);
  if (currentEntries.length !== nextEntries.length) return false;

  return nextEntries.every(([key, value]) => Object.is((current as Record<string, unknown>)[key], value));
}

function initialValue(initial: object | undefined, key: string) {
  if (!initial || !isRecord(initial)) return "";
  const value = initial[key];
  if (value === null || value === undefined) return "";
  return toDisplay(value);
}

function buildPayload<TPayload extends object>(
  fields: CrudField<TPayload>[],
  values: Record<string, string>,
) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (value === "") continue;
    if (field.type === "number") {
      payload[field.name] = Number(value);
    } else if (field.type === "select") {
      const option = field.options?.find((item) => String(item.value) === String(value));
      payload[field.name] = option?.value ?? value;
    } else {
      payload[field.name] = value;
    }
  }
  return payload;
}
