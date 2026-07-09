"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Select } from "antd";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import {
  adminActionButtonClass,
  adminActionButtonLargeClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField, type FormFieldOption } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  categoriesApi,
  type CategoryCreatePayload,
  type CategoryFilters,
  type CategoryUpdatePayload,
} from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn, toDisplay } from "@/lib/utils";
import type { Category } from "@/types/api";

type DialogState =
  | { type: "create"; parentId?: number }
  | { type: "edit"; category: Category }
  | { type: "delete"; category: Category }
  | { type: "restore"; category: Category }
  | null;

const initialFilters: CategoryFilters = {
  name: "",
  status: "",
};

export default function CategoriesPage() {
  const { locale, t } = useI18n();
  const labels = getLabels(locale);
  const [filters, setFilters] = useState<CategoryFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<CategoryFilters>(initialFilters);
  const [rows, setRows] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toast = useToast();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await categoriesApi.list(filters);
      setRows(result.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed]);

  const fetchAllCategories = useCallback(async () => {
    try {
      const result = await categoriesApi.list({});
      setAllCategories(result.items);
    } catch {
      setAllCategories([]);
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([fetchRows(), fetchAllCategories()]);
  }, [fetchAllCategories, fetchRows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAllCategories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAllCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => (sameFilters(current, draftFilters) ? current : draftFilters));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const hierarchy = useMemo(
    () => buildCategoryHierarchy(rows, allCategories, hasActiveFilters(filters)),
    [allCategories, filters, rows],
  );

  const openEdit = async (category: Category) => {
    if (!category.id) return;
    setSubmitting(true);
    try {
      const detail = await categoriesApi.detail(category.id);
      setDialog({ type: "edit", category: detail });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const deleteCategory = async () => {
    if (dialog?.type !== "delete" || !dialog.category.id) return;
    setSubmitting(true);
    try {
      await categoriesApi.delete(dialog.category.id);
      toast.success(t("crud.deleted"));
      setDialog(null);
      await refetch();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("crud.deleteFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const restoreCategory = async () => {
    if (dialog?.type !== "restore" || !dialog.category.id) return;
    setSubmitting(true);
    try {
      await categoriesApi.restore(dialog.category.id);
      toast.success(t("crud.restored"));
      setDialog(null);
      await refetch();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("crud.restoreFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[2px] text-[#f97316]">
            {labels.eyebrow}
          </p>
          <h1 className="mt-2 text-[30px] font-bold leading-9 tracking-[-0.02em] text-[#0f172a] dark:text-white">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-[22px] text-[#64748b] dark:text-slate-400">
            {labels.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className={cn(adminActionButtonLargeClass, "w-full md:w-auto")}
        >
          <Plus className="size-4" />
          {t("actions.create")}
        </button>
      </div>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="artistbor-table-filter-shell overflow-x-auto"
      >
        <div className="artistbor-table-filter-panel flex min-h-[52px] min-w-[620px] items-center gap-2.5 py-2">
          <Input
            allowClear
            prefix={<Search className="size-4 text-[#94a3b8]" />}
            value={draftFilters.name ?? ""}
            placeholder={labels.searchPlaceholder}
            onChange={(event) => setDraftFilters((current) => ({ ...current, name: event.target.value }))}
            className={cn(
              "artistbor-filter-search !h-[38px] !rounded-[11px] !border-[#e6ebf2] !bg-white !text-[13px] !font-medium dark:!border-white/10 dark:!bg-white/[0.03] dark:!text-white",
              draftFilters.name && "artistbor-filter-search-active",
            )}
          />
          <Select
            className="artistbor-compact-select !h-[38px] !w-[220px] shrink-0"
            value={draftFilters.status ?? ""}
            onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
            options={[
              { label: labels.statusAll, value: "" },
              { label: labels.active, value: "1" },
              { label: labels.inactive, value: "0" },
            ]}
          />
          <Button
            htmlType="button"
            className="artistbor-filter-reset !h-[38px] !w-28 shrink-0 !rounded-[11px] !border-[#e6ebf2] !bg-white !px-3 !text-sm !font-bold !text-[#475569] hover:!border-[#cbd5e1] hover:!bg-[#f8fafc] dark:!border-white/10 dark:!bg-white/[0.03] dark:!text-slate-200"
            icon={<RotateCcw className="size-4" />}
            onClick={resetFilters}
          >
            {t("actions.clear")}
          </Button>
        </div>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : hierarchy.roots.length === 0 ? (
        <EmptyState />
      ) : (
        <CategoryHierarchyTable
          expandedIds={expandedIds}
          labels={labels}
          roots={hierarchy.roots}
          childrenByParent={hierarchy.childrenByParent}
          onCreateChild={(category) => setDialog({ type: "create", parentId: category.id })}
          onDelete={(category) => setDialog({ type: "delete", category })}
          onEdit={(category) => void openEdit(category)}
          onExpand={toggleExpanded}
          onRestore={(category) => setDialog({ type: "restore", category })}
        />
      )}

      {dialog?.type === "create" ? (
        <CategoryFormDrawer
          allCategories={allCategories}
          initialParentId={dialog.parentId}
          labels={labels}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await categoriesApi.create(payload);
              toast.success(t("crud.created"));
              setDialog(null);
              await refetch();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t("crud.createFailed"));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "edit" ? (
        <CategoryFormDrawer
          allCategories={allCategories}
          category={dialog.category}
          labels={labels}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.category.id) return;
            setSubmitting(true);
            try {
              await categoriesApi.update(dialog.category.id, payload);
              toast.success(t("crud.updated"));
              setDialog(null);
              await refetch();
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t("crud.updateFailed"));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          message={t("crud.deleteConfirm")}
          confirmLabel={t("actions.delete")}
          onCancel={() => setDialog(null)}
          onConfirm={deleteCategory}
        />
      ) : null}

      {dialog?.type === "restore" ? (
        <ConfirmDialog
          loading={submitting}
          message={t("crud.restoreConfirm")}
          confirmLabel={t("actions.restore")}
          onCancel={() => setDialog(null)}
          onConfirm={restoreCategory}
        />
      ) : null}
    </section>
  );
}

function CategoryHierarchyTable({
  childrenByParent,
  expandedIds,
  labels,
  roots,
  onCreateChild,
  onDelete,
  onEdit,
  onExpand,
  onRestore,
}: {
  childrenByParent: Map<number, Category[]>;
  expandedIds: Set<number>;
  labels: ReturnType<typeof getLabels>;
  roots: Category[];
  onCreateChild: (category: Category) => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onExpand: (id: number) => void;
  onRestore: (category: Category) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e6ebf2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0">
          <colgroup>
            <col className="w-12" />
            <col className="w-16" />
            <col className="w-[340px]" />
            <col className="w-[240px]" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
            <col className="w-[170px]" />
          </colgroup>
          <thead>
            <tr className="h-11 bg-[#f8fafc] text-left dark:bg-white/[0.03]">
              <TableHead className="w-12" />
              <TableHead>ID</TableHead>
              <TableHead>{labels.name}</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>{labels.status}</TableHead>
              <TableHead>{labels.sortOrder}</TableHead>
              <TableHead className="text-right">{labels.actions}</TableHead>
            </tr>
          </thead>
          <tbody>
            {roots.map((root) => {
              const rootId = root.id;
              const children = rootId ? childrenByParent.get(rootId) ?? [] : [];
              const expanded = Boolean(rootId && expandedIds.has(rootId));

              return (
                <CategoryRowGroup
                  key={String(root.id)}
                  category={root}
                  childrenRows={children}
                  expanded={expanded}
                  labels={labels}
                  onCreateChild={onCreateChild}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onExpand={onExpand}
                  onRestore={onRestore}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryRowGroup({
  category,
  childrenRows,
  expanded,
  labels,
  onCreateChild,
  onDelete,
  onEdit,
  onExpand,
  onRestore,
}: {
  category: Category;
  childrenRows: Category[];
  expanded: boolean;
  labels: ReturnType<typeof getLabels>;
  onCreateChild: (category: Category) => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onExpand: (id: number) => void;
  onRestore: (category: Category) => void;
}) {
  return (
    <>
      <CategoryTableRow
        category={category}
        childCount={childrenRows.length}
        expanded={expanded}
        labels={labels}
        root
        onCreateChild={onCreateChild}
        onDelete={onDelete}
        onEdit={onEdit}
        onExpand={onExpand}
        onRestore={onRestore}
      />
      {expanded ? (
        <tr className="bg-[#f8fafc]/70 dark:bg-white/[0.02]">
          <td colSpan={7} className="border-b border-[#edf2f7] px-3.5 py-2.5 dark:border-white/10">
            <div className="overflow-hidden rounded-xl border border-[#e6ebf2] bg-white dark:border-white/10 dark:bg-slate-950">
              <table className="w-full min-w-[1040px] border-separate border-spacing-0">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-16" />
                  <col className="w-[340px]" />
                  <col className="w-[240px]" />
                  <col className="w-[140px]" />
                  <col className="w-[120px]" />
                  <col className="w-[170px]" />
                </colgroup>
                <tbody>
                  {childrenRows.map((child) => (
                    <CategoryTableRow
                      key={String(child.id)}
                      category={child}
                      childCount={0}
                      expanded={false}
                      labels={labels}
                      nested
                      onCreateChild={onCreateChild}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onExpand={onExpand}
                      onRestore={onRestore}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CategoryTableRow({
  category,
  childCount,
  expanded,
  labels,
  nested,
  root,
  onCreateChild,
  onDelete,
  onEdit,
  onExpand,
  onRestore,
}: {
  category: Category;
  childCount: number;
  expanded: boolean;
  labels: ReturnType<typeof getLabels>;
  nested?: boolean;
  root?: boolean;
  onCreateChild: (category: Category) => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onExpand: (id: number) => void;
  onRestore: (category: Category) => void;
}) {
  const canExpand = root && Boolean(category.id) && childCount > 0;

  return (
    <tr
      className={cn(
        "h-16 transition hover:bg-[#fffaf3] dark:hover:bg-amber-500/[0.04]",
        nested && "h-[60px] bg-[#f8fafc]/60 dark:bg-white/[0.02]",
      )}
    >
      <TableCell className="w-12">
        {canExpand ? (
          <button
            type="button"
            onClick={() => category.id && onExpand(category.id)}
            className="grid size-8 cursor-pointer place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
            aria-label={expanded ? labels.collapseSubcategories : labels.expandSubcategories}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : nested ? (
          <span className="ml-3 block h-px w-5 bg-[#cbd5e1] dark:bg-white/20" />
        ) : null}
      </TableCell>
      <TableCell className="font-semibold text-[#64748b] dark:text-slate-400">{toDisplay(category.id)}</TableCell>
      <TableCell>
        <div className="min-w-0">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">
              {localizedName(category, labels.locale)}
            </p>
          {nested ? (
            <p className="truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
              {labels.subcategory}
            </p>
          ) : childCount ? (
            <p className="truncate text-xs font-medium leading-4 text-[#64748b] dark:text-slate-400">
              {labels.childrenCount(childCount)}
            </p>
          ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="truncate font-medium text-[#334155] dark:text-slate-200">{category.slug ?? "—"}</span>
      </TableCell>
      <TableCell>
        <CategoryStatusPill category={category} labels={labels} />
      </TableCell>
      <TableCell className="font-medium text-[#475569] dark:text-slate-300">{toDisplay(category.sort_order)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {root ? (
            <IconButton label={labels.createSubcategory} onClick={() => onCreateChild(category)}>
              <Plus className="size-4" />
            </IconButton>
          ) : null}
          <IconButton label={labels.edit} onClick={() => onEdit(category)}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label={labels.restore} onClick={() => onRestore(category)}>
            <RotateCcw className="size-4" />
          </IconButton>
          <IconButton danger label={labels.delete} onClick={() => onDelete(category)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </TableCell>
    </tr>
  );
}

function CategoryStatusPill({
  category,
  labels,
}: {
  category: Category;
  labels: ReturnType<typeof getLabels>;
}) {
  const active = String(category.status ?? "1") !== "0";

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold",
        active
          ? "bg-[#dcfce7] text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-300"
          : "bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-500/10 dark:text-rose-300",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {active ? labels.active : labels.inactive}
    </span>
  );
}

function CategoryFormDrawer({
  allCategories,
  category,
  initialParentId,
  labels,
  loading,
  onClose,
  onSubmit,
}: {
  allCategories: Category[];
  category?: Category;
  initialParentId?: number;
  labels: ReturnType<typeof getLabels>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CategoryCreatePayload | CategoryUpdatePayload) => Promise<void>;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    name_uz: category?.name_uz ?? "",
    name_ru: category?.name_ru ?? "",
    name_en: category?.name_en ?? "",
    slug: category?.slug ?? "",
    parent_id: parentValue(category?.parent_id ?? initialParentId),
    icon: category?.icon ?? "",
    sort_order: category?.sort_order === undefined ? "" : String(category.sort_order),
    status: category?.status === undefined ? "" : String(category.status),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = category ? "category-edit-form" : "category-create-form";
  const parentOptions = parentSelectOptions(allCategories, category, labels);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.name_uz) nextErrors.name_uz = t("common.requiredField");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit(buildCategoryPayload(values, Boolean(category)));
  };

  return (
    <AdminDrawer
      title={category ? t("crud.updateTitle", { title: labels.title }) : t("crud.createTitle", { title: labels.title })}
      onClose={onClose}
      footer={
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
            form={formId}
            disabled={loading}
            className={adminPrimaryActionButtonClass}
          >
            {category ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {loading ? t("crud.saving") : t("actions.save")}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField compact label={labels.nameUz} required value={values.name_uz} error={errors.name_uz} onChange={(name_uz) => setValues((current) => ({ ...current, name_uz }))} />
          <FormField compact label={labels.nameRu} value={values.name_ru} onChange={(name_ru) => setValues((current) => ({ ...current, name_ru }))} />
          <FormField compact label={labels.nameEn} value={values.name_en} onChange={(name_en) => setValues((current) => ({ ...current, name_en }))} />
          {category ? (
            <FormField compact label="Slug" value={values.slug} onChange={(slug) => setValues((current) => ({ ...current, slug }))} />
          ) : null}
          <FormField
            compact
            label={labels.parent}
            type="select"
            value={values.parent_id}
            options={parentOptions}
            placeholder={labels.noParent}
            onChange={(parent_id) => setValues((current) => ({ ...current, parent_id }))}
          />
          <FormField compact label="Icon" value={values.icon} onChange={(icon) => setValues((current) => ({ ...current, icon }))} />
          <FormField compact label={labels.sortOrder} type="number" value={values.sort_order} onChange={(sort_order) => setValues((current) => ({ ...current, sort_order }))} />
          <FormField compact label={labels.status} type="select" value={values.status} options={[{ label: labels.active, value: 1 }, { label: labels.inactive, value: 0 }]} onChange={(status) => setValues((current) => ({ ...current, status }))} />
        </div>
      </form>
    </AdminDrawer>
  );
}

function TableHead({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-[#e6ebf2] px-3.5 py-0 text-left text-[10px] font-bold uppercase leading-3 tracking-[1.2px] text-[#64748b] dark:border-white/10 dark:text-slate-400", className)}>
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("max-w-[340px] border-b border-[#edf2f7] px-3.5 py-[9px] align-middle text-[13px] text-[#334155] dark:border-white/10 dark:text-slate-100", className)}>{children}</td>;
}

function IconButton({
  children,
  danger,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 cursor-pointer place-items-center rounded-[10px] border bg-white transition dark:bg-white/[0.03]",
        danger
          ? "border-[#fecaca] text-[#f43f5e] hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          : "border-[#e6ebf2] text-[#475569] hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]",
      )}
    >
      {children}
    </button>
  );
}

function buildCategoryHierarchy(rows: Category[], allCategories: Category[], includeParentsForFilteredChildren: boolean) {
  const allById = new Map(allCategories.map((category) => [category.id, category]).filter(([id]) => typeof id === "number") as Array<[number, Category]>);
  const rootMap = new Map<number, Category>();
  const childrenByParent = new Map<number, Category[]>();

  for (const category of rows) {
    const parentId = parentIdValue(category);
    if (parentId === null) {
      if (category.id) rootMap.set(category.id, category);
      continue;
    }

    const current = childrenByParent.get(parentId) ?? [];
    current.push(category);
    childrenByParent.set(parentId, sortCategories(current));

    if (includeParentsForFilteredChildren) {
      const parent = allById.get(parentId);
      if (parent?.id) rootMap.set(parent.id, parent);
    }
  }

  return {
    roots: sortCategories(Array.from(rootMap.values())),
    childrenByParent,
  };
}

function parentSelectOptions(
  categories: Category[],
  current: Category | undefined,
  labels: ReturnType<typeof getLabels>,
): FormFieldOption[] {
  const currentId = current?.id;
  return sortCategories(categories)
    .filter((category) => isRootCategory(category))
    .filter((category) => category.id !== undefined && category.id !== currentId)
    .map((category) => ({
      label: localizedName(category, labels.locale),
      value: category.id as number,
    }));
}

function buildCategoryPayload(
  values: {
    name_uz: string;
    name_ru: string;
    name_en: string;
    slug: string;
    parent_id: string;
    icon: string;
    sort_order: string;
    status: string;
  },
  includeSlug: boolean,
): CategoryCreatePayload | CategoryUpdatePayload {
  const payload: CategoryUpdatePayload = {
    name_uz: values.name_uz,
  };

  if (values.name_ru) payload.name_ru = values.name_ru;
  if (values.name_en) payload.name_en = values.name_en;
  if (includeSlug && values.slug) payload.slug = values.slug;
  if (values.parent_id) payload.parent_id = Number(values.parent_id);
  if (values.icon) payload.icon = values.icon;
  if (values.sort_order) payload.sort_order = Number(values.sort_order);
  if (values.status !== "") payload.status = Number(values.status);

  return payload;
}

function sameFilters(left: CategoryFilters, right: CategoryFilters) {
  return String(left.name ?? "") === String(right.name ?? "") && String(left.status ?? "") === String(right.status ?? "");
}

function hasActiveFilters(filters: CategoryFilters) {
  return Boolean(String(filters.name ?? "").trim() || String(filters.status ?? "").trim());
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) => {
    const leftOrder = Number(left.sort_order ?? 0);
    const rightOrder = Number(right.sort_order ?? 0);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(localizedName(left, "uz")).localeCompare(String(localizedName(right, "uz")));
  });
}

function isRootCategory(category: Category) {
  return parentIdValue(category) === null;
}

function parentIdValue(category: Category) {
  return category.parent_id === null || category.parent_id === undefined ? null : Number(category.parent_id);
}

function parentValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function getLabels(locale: string) {
  if (locale === "ru") {
    return {
      actions: "Действия",
      active: "Активная",
      childrenCount: (count: number) => `${count} подкат.`,
      collapseSubcategories: "Свернуть подкатегории",
      createSubcategory: "Создать подкатегорию",
      delete: "Удалить",
      description: "Просмотр, добавление и сортировка категорий услуг.",
      detailFailed: "Не удалось загрузить детали",
      edit: "Редактировать",
      expandSubcategories: "Развернуть подкатегории",
      eyebrow: "Категории",
      inactive: "Неактивная",
      loadFailed: "Не удалось загрузить категории",
      locale: "ru",
      name: "Название",
      nameEn: "Название EN",
      namePlaceholder: "Название категории",
      nameRu: "Название RU",
      nameUz: "Название UZ",
      noParent: "Без родителя",
      parent: "Родительская категория",
      restore: "Восстановить",
      searchPlaceholder: "Поиск...",
      sortOrder: "Порядок",
      status: "Статус",
      statusAll: "Статус: Все",
      subcategory: "Подкатегория",
      title: "Категории",
    };
  }

  return {
    actions: "Amallar",
    active: "Faol",
    childrenCount: (count: number) => `${count} ta subcategory`,
    collapseSubcategories: "Subcategorylarni yopish",
    createSubcategory: "Subcategory yaratish",
    delete: "O'chirish",
    description: "Xizmat kategoriyalarini ko'rish, qo'shish va tartiblash.",
    detailFailed: "Detail yuklanmadi",
    edit: "Tahrirlash",
    expandSubcategories: "Subcategorylarni ochish",
    eyebrow: "Kategoriyalar",
    inactive: "Faol emas",
    loadFailed: "Kategoriyalar yuklanmadi",
    locale: "uz",
    name: "Nomi",
    nameEn: "Nomi EN",
    namePlaceholder: "Kategoriya nomi",
    nameRu: "Nomi RU",
    nameUz: "Nomi UZ",
    noParent: "Asosiy category",
    parent: "Parent category",
    restore: "Tiklash",
    searchPlaceholder: "Qidirish...",
    sortOrder: "Tartib",
    status: "Holat",
    statusAll: "Holat: Barchasi",
    subcategory: "Subcategory",
    title: "Kategoriyalar",
  };
}

function localizedName(record: Pick<Category, "name_uz" | "name_ru" | "name_en">, locale: string) {
  if (locale === "ru") return record.name_ru || record.name_uz || record.name_en || "—";
  if (locale === "en") return record.name_en || record.name_uz || record.name_ru || "—";
  return record.name_uz || record.name_ru || record.name_en || "—";
}
