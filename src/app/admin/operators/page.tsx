"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Ban, Pencil, Plus, Search, Unlock } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { FallbackPagination, Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  staffApi,
  type CreateStaffPayload,
  type StaffFilters,
  type UpdateStaffPayload,
} from "@/lib/api/admin-content";
import type { ListResult, User } from "@/types/api";

type DialogState =
  | { type: "create" }
  | { type: "edit"; user: User }
  | { type: "block"; user: User }
  | { type: "unblock"; user: User }
  | null;

const limit = 20;
const operatorRole = 20;

const staffStatusOptions = [
  { label: "Faol", value: "10" },
  { label: "Nofaol", value: "9" },
  { label: "Bloklangan", value: "20" },
  { label: "O'chirilgan", value: "0" },
];

const columns: DataTableColumn<User>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "first_name", label: "Ism" },
  { key: "last_name", label: "Familiya" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "Email" },
  { key: "status", label: "Holat", render: (row) => formatStaffStatus(row.status) },
  { key: "created_at", label: "Yaratilgan", kind: "date" },
];

const initialFilters: StaffFilters = {
  role: operatorRole,
  status: "",
  search: "",
  page: 1,
  limit,
};

export default function OperatorsPage() {
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
      setError(caught instanceof Error ? caught.message : "Operatorlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
        toast.success("Operator bloklandi");
      } else {
        await staffApi.unblock(dialog.user.id);
        toast.success("Operator blokdan chiqarildi");
      }
      setDialog(null);
      await fetchStaff();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Amal bajarilmadi");
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
            Operatorlar
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            Operatorlar
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Operatorlarni ko&apos;rish, yaratish, tahrirlash va bloklash.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-amber-400/25 transition hover:bg-amber-300"
        >
          <Plus className="size-4" />
          Operator yaratish
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            label="Qidiruv"
            value={draftFilters.search ?? ""}
            placeholder="Ism, telefon yoki email"
            onChange={(value) => setDraftFilters((current) => ({ ...current, search: value }))}
          />
          <FormField
            label="Holat"
            type="select"
            value={draftFilters.status ?? ""}
            options={staffStatusOptions}
            onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))}
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
              <IconButton label="Tahrirlash" onClick={() => setDialog({ type: "edit", user: row })}>
                <Pencil className="size-4" />
              </IconButton>
              {isBlockedUser(row) ? (
                <IconButton label="Blokdan chiqarish" onClick={() => setDialog({ type: "unblock", user: row })}>
                  <Unlock className="size-4" />
                </IconButton>
              ) : (
                <IconButton danger label="Bloklash" onClick={() => setDialog({ type: "block", user: row })}>
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

      {dialog?.type === "create" ? (
        <StaffFormModal
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await staffApi.create(payload);
              toast.success("Operator yaratildi");
              setDialog(null);
              await fetchStaff();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Operator yaratilmadi");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "edit" ? (
        <EditUserModal
          user={dialog.user}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.user.id) return;
            setSubmitting(true);
            try {
              await staffApi.update(dialog.user.id, payload);
              toast.success("Operator yangilandi");
              setDialog(null);
              await fetchStaff();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Yangilash bajarilmadi");
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
          title="Operatorni bloklash"
          message="Operatorni bloklashni tasdiqlaysizmi?"
          confirmLabel="Bloklash"
          onCancel={() => setDialog(null)}
          onConfirm={runConfirmedAction}
        />
      ) : null}

      {dialog?.type === "unblock" ? (
        <ConfirmDialog
          loading={submitting}
          title="Blokdan chiqarish"
          message="Operatorni blokdan chiqarishni tasdiqlaysizmi?"
          confirmLabel="Blokdan chiqarish"
          onCancel={() => setDialog(null)}
          onConfirm={runConfirmedAction}
        />
      ) : null}
    </section>
  );
}

function StaffFormModal({
  loading,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStaffPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    phone: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateRequired(values, ["phone", "password", "first_name"]);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      phone: values.phone,
      password: values.password,
      first_name: values.first_name,
      last_name: values.last_name || undefined,
      email: values.email || undefined,
      role: 20,
    });
  };

  return (
    <Modal title="Operator yaratish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Telefon" required value={values.phone} error={errors.phone} onChange={(phone) => setValues((current) => ({ ...current, phone }))} />
          <FormField label="Parol" type="password" required value={values.password} error={errors.password} onChange={(password) => setValues((current) => ({ ...current, password }))} />
          <FormField label="Ism" required value={values.first_name} error={errors.first_name} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
          <FormField label="Familiya" value={values.last_name} error={errors.last_name} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
          <FormField label="Email" value={values.email} onChange={(email) => setValues((current) => ({ ...current, email }))} />
        </div>
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  loading,
  onClose,
  onSubmit,
}: {
  user: User;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateStaffPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    status: user.status === undefined ? "" : String(user.status),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateRequired(values, ["first_name", "phone", "status"]);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      first_name: values.first_name,
      last_name: values.last_name || undefined,
      phone: values.phone,
      email: values.email || undefined,
      role: 20,
      status: Number(values.status),
    });
  };

  return (
    <Modal title="Operatorni tahrirlash" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Ism" required value={values.first_name} error={errors.first_name} onChange={(first_name) => setValues((current) => ({ ...current, first_name }))} />
          <FormField label="Familiya" value={values.last_name} onChange={(last_name) => setValues((current) => ({ ...current, last_name }))} />
          <FormField label="Telefon" required value={values.phone} error={errors.phone} onChange={(phone) => setValues((current) => ({ ...current, phone }))} />
          <FormField label="Email" value={values.email} onChange={(email) => setValues((current) => ({ ...current, email }))} />
          <FormField
            label="Holat"
            type="select"
            required
            value={values.status}
            error={errors.status}
            options={staffStatusOptions}
            onChange={(status) => setValues((current) => ({ ...current, status }))}
          />
        </div>
        <FormActions loading={loading} onClose={onClose} />
      </form>
    </Modal>
  );
}

function FormActions({ loading, onClose }: { loading: boolean; onClose: () => void }) {
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
        className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-lg shadow-amber-400/25 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saqlanmoqda..." : "Saqlash"}
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

function validateRequired(values: Record<string, string>, keys: string[]) {
  const errors: Record<string, string> = {};
  for (const key of keys) {
    if (!values[key]) errors[key] = "Majburiy maydon";
  }
  return errors;
}

function isBlockedUser(user: User) {
  const status = String(user.status ?? "").toLowerCase();
  return status.includes("block") || status === "20";
}

function formatStaffStatus(value: User["status"]) {
  const status = String(value ?? "");
  const labels: Record<string, string> = {
    "0": "O'chirilgan",
    "9": "Nofaol",
    "10": "Faol",
    "20": "Bloklangan",
  };
  return labels[status] ?? (status || "—");
}
