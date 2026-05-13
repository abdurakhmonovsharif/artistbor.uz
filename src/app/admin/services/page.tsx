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
import {
  adminActionButtonClass,
  adminActionButtonLargeClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import {
  AdminFilterForm,
  adminFilterActionClass,
  adminFilterControlClass,
} from "@/components/admin/admin-filter-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField, type FormFieldOption } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  categoriesApi,
  servicesApi,
  type ServiceCreatePayload,
  type ServiceFilters,
  type ServiceUpdatePayload,
} from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn, toDisplay } from "@/lib/utils";
import type { Category, Service } from "@/types/api";

type DialogState =
  | { type: "create"; parentId?: number }
  | { type: "edit"; service: Service }
  | { type: "delete"; service: Service }
  | null;

const initialFilters: ServiceFilters = {
  name: "",
  category_id: "",
  sort_order: "",
  status: "",
};

export default function ServicesPage() {
  const { locale, t } = useI18n();
  const labels = getLabels(locale);
  const toast = useToast();
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [filters, setFilters] = useState<ServiceFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ServiceFilters>(initialFilters);
  const [rows, setRows] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const loadCategories = useCallback(async () => {
    try {
      const result = await categoriesApi.list({});
      setCategoryOptions(
        result.items
          .filter((category): category is Category & { id: number } => typeof category.id === "number")
          .map((category) => ({
            label: localizedCategoryName(category, locale) || `${getLabels(locale).category} #${category.id}`,
            value: String(category.id),
          })),
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : getLabels(locale).categoriesLoadFailed);
    }
  }, [locale, toast]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await servicesApi.list(filters);
      setRows(result.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filters, labels.loadFailed]);

  const fetchAllServices = useCallback(async () => {
    try {
      const result = await servicesApi.list({});
      setAllServices(result.items);
    } catch {
      setAllServices([]);
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([fetchRows(), fetchAllServices()]);
  }, [fetchAllServices, fetchRows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
      void fetchAllServices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAllServices, loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => (sameFilters(current, draftFilters) ? current : draftFilters));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const hierarchy = useMemo(
    () => buildServiceHierarchy(rows, allServices, hasActiveFilters(filters)),
    [allServices, filters, rows],
  );

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteService = async () => {
    if (dialog?.type !== "delete" || !dialog.service.id) return;
    setSubmitting(true);
    try {
      await servicesApi.delete(dialog.service.id);
      toast.success(t("crud.deleted"));
      setDialog(null);
      await refetch();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("crud.deleteFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            {labels.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {labels.pageDescription}
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

      <AdminFilterForm
        onSubmit={(event) => event.preventDefault()}
        gridClassName="md:grid-cols-[minmax(180px,1.2fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_minmax(140px,0.65fr)_auto] md:items-center"
        mobileLabel={t("actions.search")}
      >
        <Input
          allowClear
          prefix={<Search className="size-4 text-slate-400" />}
          value={draftFilters.name ?? ""}
          placeholder={labels.searchPlaceholder}
          onChange={(event) => setDraftFilters((current) => ({ ...current, name: event.target.value }))}
          className={`${adminFilterControlClass} h-10`}
        />
        <Select
          allowClear
          className={`${adminFilterControlClass} h-10`}
          value={draftFilters.category_id || undefined}
          placeholder={labels.categoryAll}
          onChange={(category_id) => setDraftFilters((current) => ({ ...current, category_id: category_id ?? "" }))}
          options={categoryOptions}
        />
        <Select
          className={`${adminFilterControlClass} h-10`}
          value={draftFilters.status ?? ""}
          onChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
          options={[
            { label: labels.statusAll, value: "" },
            { label: labels.active, value: "1" },
            { label: labels.inactive, value: "0" },
          ]}
        />
        <Input
          type="number"
          value={draftFilters.sort_order ?? ""}
          placeholder={labels.sortOrderPlaceholder}
          onChange={(event) => setDraftFilters((current) => ({ ...current, sort_order: event.target.value }))}
          className={`${adminFilterControlClass} h-10`}
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
      ) : hierarchy.roots.length === 0 ? (
        <EmptyState />
      ) : (
        <ServiceHierarchyTable
          childrenByParent={hierarchy.childrenByParent}
          expandedIds={expandedIds}
          labels={labels}
          roots={hierarchy.roots}
          onCreateChild={(service) => service.id && setDialog({ type: "create", parentId: service.id })}
          onDelete={(service) => setDialog({ type: "delete", service })}
          onEdit={(service) => setDialog({ type: "edit", service })}
          onExpand={toggleExpanded}
        />
      )}

      {dialog?.type === "create" ? (
        <ServiceFormDrawer
          allServices={allServices}
          initialParentId={dialog.parentId}
          labels={labels}
          loading={submitting}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              await servicesApi.create(payload as ServiceCreatePayload);
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
        <ServiceFormDrawer
          allServices={allServices}
          labels={labels}
          loading={submitting}
          service={dialog.service}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (!dialog.service.id) return;
            setSubmitting(true);
            try {
              await servicesApi.update(dialog.service.id, payload as ServiceUpdatePayload);
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
          onConfirm={deleteService}
        />
      ) : null}
    </section>
  );
}

function ServiceHierarchyTable({
  childrenByParent,
  expandedIds,
  labels,
  roots,
  onCreateChild,
  onDelete,
  onEdit,
  onExpand,
}: {
  childrenByParent: Map<number, Service[]>;
  expandedIds: Set<number>;
  labels: ReturnType<typeof getLabels>;
  roots: Service[];
  onCreateChild: (service: Service) => void;
  onDelete: (service: Service) => void;
  onEdit: (service: Service) => void;
  onExpand: (id: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111827]">
      <div className="admin-table-scroll overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="h-11 border-b border-slate-200 bg-slate-50 text-left dark:border-white/10 dark:bg-white/[0.03]">
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
            {roots.map((root, index) => {
              const rootId = root.id;
              const children = rootId ? childrenByParent.get(rootId) ?? [] : [];
              const expanded = Boolean(rootId && expandedIds.has(rootId));

              return (
                <ServiceRowGroup
                  key={String(root.id ?? `root-${index}`)}
                  childrenRows={children}
                  expanded={expanded}
                  labels={labels}
                  onCreateChild={onCreateChild}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onExpand={onExpand}
                  service={root}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServiceRowGroup({
  childrenRows,
  expanded,
  labels,
  service,
  onCreateChild,
  onDelete,
  onEdit,
  onExpand,
}: {
  childrenRows: Service[];
  expanded: boolean;
  labels: ReturnType<typeof getLabels>;
  service: Service;
  onCreateChild: (service: Service) => void;
  onDelete: (service: Service) => void;
  onEdit: (service: Service) => void;
  onExpand: (id: number) => void;
}) {
  return (
    <>
      <ServiceTableRow
        childCount={childrenRows.length}
        expanded={expanded}
        labels={labels}
        onCreateChild={onCreateChild}
        onDelete={onDelete}
        onEdit={onEdit}
        onExpand={onExpand}
        root
        service={service}
      />
      {expanded ? (
        <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.02]">
          <td colSpan={7} className="px-3 py-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111827]">
              <table className="w-full border-collapse">
                <tbody>
                  {childrenRows.map((child, index) => (
                    <ServiceTableRow
                      key={String(child.id ?? `child-${index}`)}
                      childCount={0}
                      expanded={false}
                      labels={labels}
                      nested
                      onCreateChild={onCreateChild}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onExpand={onExpand}
                      service={child}
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

function ServiceTableRow({
  childCount,
  expanded,
  labels,
  nested,
  root,
  service,
  onCreateChild,
  onDelete,
  onEdit,
  onExpand,
}: {
  childCount: number;
  expanded: boolean;
  labels: ReturnType<typeof getLabels>;
  nested?: boolean;
  root?: boolean;
  service: Service;
  onCreateChild: (service: Service) => void;
  onDelete: (service: Service) => void;
  onEdit: (service: Service) => void;
  onExpand: (id: number) => void;
}) {
  const canExpand = root && Boolean(service.id) && childCount > 0;

  return (
    <tr
      className={cn(
        "h-16 border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-white/[0.035]",
        nested && "h-14 bg-slate-50/70 dark:bg-white/[0.02]",
      )}
    >
      <TableCell className="w-12">
        {canExpand ? (
          <button
            type="button"
            onClick={() => service.id && onExpand(service.id)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
            aria-label={expanded ? labels.collapseSubservices : labels.expandSubservices}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : nested ? (
          <span className="ml-3 block h-px w-5 bg-slate-300 dark:bg-white/20" />
        ) : null}
      </TableCell>
      <TableCell>{toDisplay(service.id)}</TableCell>
      <TableCell>
        <div className={cn("min-w-0", nested && "pl-5")}>
          <p className="line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">
            {localizedName(service, labels.locale)}
          </p>
          {nested ? (
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {labels.subservice}
            </p>
          ) : childCount ? (
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {labels.childrenCount(childCount)}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{service.slug ?? "—"}</TableCell>
      <TableCell>
        <StatusBadge value={service.status} />
      </TableCell>
      <TableCell>{toDisplay(service.sort_order)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {root ? (
            <IconButton label={labels.createSubservice} onClick={() => onCreateChild(service)}>
              <Plus className="size-4" />
            </IconButton>
          ) : null}
          <IconButton label={labels.edit} onClick={() => onEdit(service)}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton danger label={labels.delete} onClick={() => onDelete(service)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </TableCell>
    </tr>
  );
}

function ServiceFormDrawer({
  allServices,
  initialParentId,
  labels,
  loading,
  service,
  onClose,
  onSubmit,
}: {
  allServices: Service[];
  initialParentId?: number;
  labels: ReturnType<typeof getLabels>;
  loading: boolean;
  service?: Service;
  onClose: () => void;
  onSubmit: (payload: ServiceCreatePayload | ServiceUpdatePayload) => Promise<void>;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    name_uz: service?.name_uz ?? "",
    name_ru: service?.name_ru ?? "",
    name_en: service?.name_en ?? "",
    slug: service?.slug ?? "",
    parent_id: parentValue(service?.parent_id ?? initialParentId),
    description_uz: service?.description_uz ?? "",
    description_ru: service?.description_ru ?? "",
    description_en: service?.description_en ?? "",
    sort_order: service?.sort_order === undefined ? "" : String(service.sort_order),
    status: service?.status === undefined ? "" : String(service.status),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = service ? "service-edit-form" : "service-create-form";
  const parentOptions = parentSelectOptions(allServices, service, labels);
  const parentService = initialParentId ? allServices.find((item) => item.id === initialParentId) : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.name_uz) nextErrors.name_uz = t("common.requiredField");
    if (!service && !values.slug) nextErrors.slug = t("common.requiredField");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onSubmit(buildServicePayload(values));
  };

  return (
    <AdminDrawer
      title={service ? t("crud.updateTitle", { title: labels.title }) : t("crud.createTitle", { title: labels.title })}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className={adminActionButtonClass}
          >
            <X className="size-4" />
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className={adminPrimaryActionButtonClass}
          >
            {service ? <Pencil className="size-4" /> : <Plus className="size-4" />}
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
          <FormField compact label="Slug" required={!service} value={values.slug} error={errors.slug} onChange={(slug) => setValues((current) => ({ ...current, slug }))} />
          {service ? (
            <FormField
              compact
              label={labels.parent}
              type="select"
              value={values.parent_id}
              options={parentOptions}
              placeholder={labels.noParent}
              onChange={(parent_id) => setValues((current) => ({ ...current, parent_id }))}
            />
          ) : initialParentId ? (
            <div className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {labels.parent}
              </span>
              <div className="flex h-10 items-center rounded-lg border border-slate-200/90 bg-slate-50 px-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-white">
                {parentService ? localizedName(parentService, labels.locale) : `#${initialParentId}`}
              </div>
            </div>
          ) : null}
          <FormField compact label={labels.sortOrder} type="number" value={values.sort_order} onChange={(sort_order) => setValues((current) => ({ ...current, sort_order }))} />
          <FormField compact label={labels.status} type="select" value={values.status} options={[{ label: labels.active, value: 1 }, { label: labels.inactive, value: 0 }]} onChange={(status) => setValues((current) => ({ ...current, status }))} />
          <div className="md:col-span-2">
            <FormField compact label={labels.descriptionUz} type="textarea" value={values.description_uz} rows={4} onChange={(description_uz) => setValues((current) => ({ ...current, description_uz }))} />
          </div>
          <div className="md:col-span-2">
            <FormField compact label={labels.descriptionRu} type="textarea" value={values.description_ru} rows={4} onChange={(description_ru) => setValues((current) => ({ ...current, description_ru }))} />
          </div>
          <div className="md:col-span-2">
            <FormField compact label={labels.descriptionEn} type="textarea" value={values.description_en} rows={4} onChange={(description_en) => setValues((current) => ({ ...current, description_en }))} />
          </div>
        </div>
      </form>
    </AdminDrawer>
  );
}

function TableHead({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400", className)}>
      {children}
    </th>
  );
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("max-w-[300px] px-3 py-2 align-middle text-sm text-slate-700 dark:text-slate-100", className)}>{children}</td>;
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
        "grid size-8 cursor-pointer place-items-center rounded-lg border transition",
        danger
          ? "border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          : "border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300",
      )}
    >
      {children}
    </button>
  );
}

function buildServiceHierarchy(rows: Service[], allServices: Service[], includeParentsForFilteredChildren: boolean) {
  const allById = new Map(allServices.map((service) => [service.id, service]).filter(([id]) => typeof id === "number") as Array<[number, Service]>);
  const rootMap = new Map<number, Service>();
  const childrenByParent = new Map<number, Service[]>();

  for (const service of rows) {
    const parentId = parentIdValue(service);
    if (parentId === null) {
      if (service.id) rootMap.set(service.id, service);
      continue;
    }

    const current = childrenByParent.get(parentId) ?? [];
    current.push(service);
    childrenByParent.set(parentId, sortServices(current));

    if (includeParentsForFilteredChildren) {
      const parent = allById.get(parentId);
      if (parent?.id) rootMap.set(parent.id, parent);
    }
  }

  return {
    roots: sortServices(Array.from(rootMap.values())),
    childrenByParent,
  };
}

function parentSelectOptions(
  services: Service[],
  current: Service | undefined,
  labels: ReturnType<typeof getLabels>,
): FormFieldOption[] {
  const currentId = current?.id;
  return sortServices(services)
    .filter((service) => parentIdValue(service) === null)
    .filter((service) => service.id !== undefined && service.id !== currentId)
    .map((service) => ({
      label: localizedName(service, labels.locale),
      value: service.id as number,
    }));
}

function buildServicePayload(values: {
  name_uz: string;
  name_ru: string;
  name_en: string;
  slug: string;
  parent_id: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  sort_order: string;
  status: string;
}): ServiceCreatePayload | ServiceUpdatePayload {
  const payload: ServiceUpdatePayload = {
    name_uz: values.name_uz,
  };

  if (values.name_ru) payload.name_ru = values.name_ru;
  if (values.name_en) payload.name_en = values.name_en;
  if (values.slug) payload.slug = values.slug;
  if (values.parent_id) payload.parent_id = Number(values.parent_id);
  if (values.description_uz) payload.description_uz = values.description_uz;
  if (values.description_ru) payload.description_ru = values.description_ru;
  if (values.description_en) payload.description_en = values.description_en;
  if (values.sort_order) payload.sort_order = Number(values.sort_order);
  if (values.status !== "") payload.status = Number(values.status);

  return payload;
}

function sameFilters(left: ServiceFilters, right: ServiceFilters) {
  return (
    String(left.name ?? "") === String(right.name ?? "") &&
    String(left.category_id ?? "") === String(right.category_id ?? "") &&
    String(left.sort_order ?? "") === String(right.sort_order ?? "") &&
    String(left.status ?? "") === String(right.status ?? "")
  );
}

function hasActiveFilters(filters: ServiceFilters) {
  return Boolean(
    String(filters.name ?? "").trim() ||
      String(filters.category_id ?? "").trim() ||
      String(filters.sort_order ?? "").trim() ||
      String(filters.status ?? "").trim(),
  );
}

function sortServices(services: Service[]) {
  return [...services].sort((left, right) => {
    const leftOrder = Number(left.sort_order ?? 0);
    const rightOrder = Number(right.sort_order ?? 0);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(localizedName(left, "uz")).localeCompare(String(localizedName(right, "uz")));
  });
}

function parentIdValue(service: Service) {
  return service.parent_id === null || service.parent_id === undefined ? null : Number(service.parent_id);
}

function parentValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function getLabels(locale: string) {
  if (locale === "ru") {
    return {
      actions: "Действия",
      active: "Активный",
      categoriesLoadFailed: "Не удалось загрузить категории",
      category: "Категория",
      categoryAll: "Категория: Все",
      childrenCount: (count: number) => `${count} подусл.`,
      collapseSubservices: "Свернуть подуслуги",
      createSubservice: "Создать подуслугу",
      delete: "Удалить",
      descriptionEn: "Описание EN",
      descriptionRu: "Описание RU",
      descriptionUz: "Описание UZ",
      edit: "Редактировать",
      expandSubservices: "Развернуть подуслуги",
      eyebrow: "Услуги",
      inactive: "Неактивный",
      loadFailed: "Не удалось загрузить услуги",
      locale: "ru",
      name: "Название",
      nameEn: "Название EN",
      nameRu: "Название RU",
      nameUz: "Название UZ",
      noParent: "Без родителя",
      pageDescription: "Просмотр, добавление и редактирование услуг артистов.",
      parent: "Родительская услуга",
      searchPlaceholder: "Поиск...",
      sortOrder: "Порядок",
      sortOrderPlaceholder: "Порядок",
      status: "Статус",
      statusAll: "Статус: Все",
      subservice: "Подуслуга",
      title: "Услуги",
    };
  }

  return {
    actions: "Amallar",
    active: "Faol",
    categoriesLoadFailed: "Kategoriyalar yuklanmadi",
    category: "Kategoriya",
    categoryAll: "Kategoriya: Barchasi",
    childrenCount: (count: number) => `${count} ta subservice`,
    collapseSubservices: "Subservicelarni yopish",
    createSubservice: "Subservice yaratish",
    delete: "O'chirish",
    descriptionEn: "Tavsif EN",
    descriptionRu: "Tavsif RU",
    descriptionUz: "Tavsif UZ",
    edit: "Tahrirlash",
    expandSubservices: "Subservicelarni ochish",
    eyebrow: "Xizmatlar",
    inactive: "Faol emas",
    loadFailed: "Xizmatlar yuklanmadi",
    locale: "uz",
    name: "Nomi",
    nameEn: "Nomi EN",
    nameRu: "Nomi RU",
    nameUz: "Nomi UZ",
    noParent: "Asosiy service",
    pageDescription: "Sanatkorlar taklif qiladigan xizmatlarni ko'rish, qo'shish va tahrirlash.",
    parent: "Parent service",
    searchPlaceholder: "Qidirish...",
    sortOrder: "Tartib",
    sortOrderPlaceholder: "Tartib raqami",
    status: "Holat",
    statusAll: "Holat: Barchasi",
    subservice: "Subservice",
    title: "Xizmatlar",
  };
}

function localizedCategoryName(record: Pick<Category, "name_uz" | "name_ru" | "name_en">, locale: string) {
  if (locale === "ru") return record.name_ru || record.name_uz || record.name_en || "";
  if (locale === "en") return record.name_en || record.name_uz || record.name_ru || "";
  return record.name_uz || record.name_ru || record.name_en || "";
}

function localizedName(record: Pick<Service, "name_uz" | "name_ru" | "name_en">, locale: string) {
  if (locale === "ru") return record.name_ru || record.name_uz || record.name_en || "—";
  if (locale === "en") return record.name_en || record.name_uz || record.name_ru || "—";
  return record.name_uz || record.name_ru || record.name_en || "—";
}
