"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { DetailGrid } from "@/components/admin/detail-grid";
import { Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField, type FormFieldOption } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import type { ListResult, UnknownRecord } from "@/types/api";
import { isRecord, toDisplay } from "@/lib/utils";

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
}) {
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<TFilters>(initialFilters);
  const [rows, setRows] = useState<TItem[]>([]);
  const [meta, setMeta] = useState<ListResult<TItem>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState<TItem>>(null);
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
      setError(caught instanceof Error ? caught.message : "Ma'lumot yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters, list]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRows]);

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
      toast.error(caught instanceof Error ? caught.message : "Detail yuklanmadi");
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
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-amber-400/25 transition hover:bg-amber-300"
        >
          <Plus className="size-4" />
          Yangi qo&apos;shish
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {filterFields.map((field) => (
            <FormField
              key={field.name}
              label={field.label}
              type={field.type ?? "text"}
              options={field.options}
              placeholder={field.placeholder}
              value={String((draftFilters as Record<string, unknown>)[field.name] ?? "")}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, [field.name]: value }))
              }
            />
          ))}
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
              <ActionButton label="Ko'rish" onClick={() => void openDetail("view", row)}>
                <Eye className="size-4" />
              </ActionButton>
              <ActionButton label="Tahrirlash" onClick={() => void openDetail("edit", row)}>
                <Pencil className="size-4" />
              </ActionButton>
              {restore ? (
                <ActionButton label="Tiklash" onClick={() => setDialog({ type: "restore", item: row })}>
                  <RotateCcw className="size-4" />
                </ActionButton>
              ) : null}
              {extraRowActions?.(row)}
              <ActionButton danger label="O'chirish" onClick={() => setDialog({ type: "delete", item: row })}>
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
        <FormModal
          title={`${title}: yaratish`}
          fields={createFields}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await create(payload as TCreate);
              toast.success("Yaratildi");
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Yaratilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "edit" ? (
        <FormModal
          title={`${title}: tahrirlash`}
          fields={updateFields}
          initial={dialog.item}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.item.id) return;
            setSubmitting(true);
            try {
              await update(dialog.item.id, payload as TUpdate);
              toast.success("Yangilandi");
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Yangilanmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "view" ? (
        <Modal title={`${title}: tafsilotlar`} onClose={() => setDialog(null)}>
          <DetailGrid record={dialog.item as UnknownRecord} />
        </Modal>
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          message="Yozuvni o'chirishni tasdiqlaysizmi?"
          confirmLabel="O'chirish"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            if (!dialog.item.id) return;
            setSubmitting(true);
            try {
              await remove(dialog.item.id);
              toast.success("Ochirildi");
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "O'chirish bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "restore" && restore ? (
        <ConfirmDialog
          loading={submitting}
          message="Yozuvni tiklashni tasdiqlaysizmi?"
          confirmLabel="Tiklash"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            if (!dialog.item.id) return;
            setSubmitting(true);
            try {
              await restore(dialog.item.id);
              toast.success("Tiklandi");
              setDialog(null);
              await fetchRows();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Tiklash bajarilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {submitting && !dialog ? <LoadingState label="Amal bajarilmoqda..." /> : null}
    </section>
  );
}

function FormModal<TPayload extends object>({
  title,
  fields,
  initial,
  loading,
  onClose,
  onSubmit,
}: {
  title: string;
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !values[field.name]) nextErrors[field.name] = "Majburiy maydon";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit(buildPayload(fields, values) as TPayload);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              <FormField
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
            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-lg shadow-amber-400/25 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
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
      className={`rounded-xl border p-2 transition ${
        danger
          ? "border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
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
