"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminActionButtonLargeClass,
  adminPrimaryActionButtonClass,
} from "@/components/admin/admin-action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField, type FormFieldOption } from "@/components/ui/form-field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  districtsApi,
  regionsApi,
  type DistrictFilters,
  type DistrictPayload,
  type RegionFilters,
  type RegionPayload,
} from "@/lib/api/admin-content";
import {
  buildDistrictPayload,
  buildRegionPayload,
  emptyLocationFormValues,
  type LocationFormValues,
} from "@/lib/location-management";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getDashboardNotification, getDashboardStatus } from "@/lib/i18n/dashboard-copy";
import { useLatestRequest } from "@/lib/use-latest-request";
import { cn, toDisplay } from "@/lib/utils";
import type { District, Region } from "@/types/api";

type LocationKind = "region" | "district";
type LocationTab = "regions" | "districts";
type LocationRecord = Region | District;

type DialogState =
  | { type: "create"; kind: LocationKind; regionId?: number }
  | { type: "edit"; kind: LocationKind; record: LocationRecord }
  | { type: "delete"; kind: LocationKind; record: LocationRecord }
  | null;

const initialRegionFilters: RegionFilters = { name: "", status: "" };
const initialDistrictFilters: DistrictFilters = { name: "", region_id: "", status: "" };

export default function RegionsPage() {
  const { locale, t } = useI18n();
  const labels = getLabels(locale);
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<LocationTab>("regions");
  const [regionFilters, setRegionFilters] = useState<RegionFilters>(initialRegionFilters);
  const [regionDraftFilters, setRegionDraftFilters] = useState<RegionFilters>(initialRegionFilters);
  const [districtFilters, setDistrictFilters] = useState<DistrictFilters>(initialDistrictFilters);
  const [districtDraftFilters, setDistrictDraftFilters] = useState<DistrictFilters>(initialDistrictFilters);
  const [regions, setRegions] = useState<Region[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [districtsError, setDistrictsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const startRegionsRequest = useLatestRequest(regionFilters);
  const startAllRegionsRequest = useLatestRequest();
  const startDistrictsRequest = useLatestRequest(districtFilters);

  const fetchRegions = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startRegionsRequest();
    if (!background) {
      setRegionsLoading(true);
      setRegionsError(null);
    }

    try {
      const result = await regionsApi.list({ ...regionFilters, page: 1, limit: 1000 });
      if (!isLatestRequest()) return;
      setRegions(result.items);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : labels.loadRegionsFailed;
      if (background) toast.error(message);
      else setRegionsError(message);
    } finally {
      if (isLatestRequest()) setRegionsLoading(false);
    }
  }, [labels.loadRegionsFailed, regionFilters, startRegionsRequest, toast]);

  const fetchDistricts = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startDistrictsRequest();
    if (!background) {
      setDistrictsLoading(true);
      setDistrictsError(null);
    }

    try {
      const result = await districtsApi.list({ ...districtFilters, page: 1, limit: 1000 });
      if (!isLatestRequest()) return;
      setDistricts(result.items);
    } catch (caught) {
      if (!isLatestRequest()) return;
      const message = caught instanceof Error ? caught.message : labels.loadDistrictsFailed;
      if (background) toast.error(message);
      else setDistrictsError(message);
    } finally {
      if (isLatestRequest()) setDistrictsLoading(false);
    }
  }, [districtFilters, labels.loadDistrictsFailed, startDistrictsRequest, toast]);

  const fetchAllRegions = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const isLatestRequest = startAllRegionsRequest();
    try {
      const result = await regionsApi.list({ page: 1, limit: 1000 });
      if (!isLatestRequest()) return;
      setAllRegions(result.items);
    } catch (caught) {
      if (!isLatestRequest() || !background) return;
      toast.error(caught instanceof Error ? caught.message : labels.loadRegionsFailed);
    }
  }, [labels.loadRegionsFailed, startAllRegionsRequest, toast]);

  const refreshAll = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    await Promise.all([fetchRegions({ background }), fetchAllRegions({ background }), fetchDistricts({ background })]);
  }, [fetchAllRegions, fetchDistricts, fetchRegions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRegions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRegions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDistricts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDistricts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAllRegions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAllRegions]);

  const sortedRegions = useMemo(() => sortLocations(regions), [regions]);
  const sortedAllRegions = useMemo(() => sortLocations(allRegions), [allRegions]);
  const sortedDistricts = useMemo(() => sortLocations(districts), [districts]);
  const regionNameById = useMemo(
    () => new Map(sortedAllRegions.flatMap((region) => region.id ? [[region.id, locationName(region, locale)] as const] : [])),
    [locale, sortedAllRegions],
  );
  const regionOptions = useMemo<FormFieldOption[]>(
    () => sortedAllRegions
      .filter((region): region is Region & { id: number } => Boolean(region.id))
      .map((region) => ({ label: locationName(region, locale), value: region.id })),
    [locale, sortedAllRegions],
  );

  const applyRegionFilters = (event: FormEvent) => {
    event.preventDefault();
    setRegionFilters({ ...regionDraftFilters });
  };

  const applyDistrictFilters = (event: FormEvent) => {
    event.preventDefault();
    setDistrictFilters({ ...districtDraftFilters });
  };

  const openEdit = async (kind: LocationKind, record: LocationRecord) => {
    if (!record.id) return;
    setSubmitting(true);
    try {
      const detail = kind === "region"
        ? await regionsApi.detail(record.id)
        : await districtsApi.detail(record.id);
      setDialog({ type: "edit", kind, record: detail });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.detailFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const saveLocation = async (kind: LocationKind, payload: RegionPayload | DistrictPayload) => {
    if (!dialog || (dialog.type !== "create" && dialog.type !== "edit")) return;
    setSubmitting(true);
    try {
      if (kind === "region") {
        if (dialog.type === "create") await regionsApi.create(payload as RegionPayload);
        else if (dialog.record.id) await regionsApi.update(dialog.record.id, payload as RegionPayload);
      } else if (dialog.type === "create") {
        await districtsApi.create(payload as DistrictPayload);
      } else if (dialog.record.id) {
        await districtsApi.update(dialog.record.id, payload as DistrictPayload);
      }

      toast.success(dialog.type === "create" ? labels.created : labels.updated);
      setDialog(null);
      await refreshAll({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.saveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLocation = async () => {
    if (dialog?.type !== "delete" || !dialog.record.id) return;
    setSubmitting(true);
    try {
      if (dialog.kind === "region") await regionsApi.delete(dialog.record.id);
      else await districtsApi.delete(dialog.record.id);
      toast.success(labels.deleted);
      setDialog(null);
      await refreshAll({ background: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.deleteFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const isRegionsTab = activeTab === "regions";

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        actions={(
          <>
          <button
            type="button"
            onClick={() => void refreshAll({ background: false })}
            disabled={regionsLoading || districtsLoading || submitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e6ebf2] bg-white px-4 text-sm font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]"
          >
            <RefreshCw className="size-4" />
            {t("actions.refresh")}
          </button>
          <button
            type="button"
            onClick={() => setDialog({ type: "create", kind: isRegionsTab ? "region" : "district" })}
            disabled={submitting}
            className={cn(adminActionButtonLargeClass, "w-full md:w-auto")}
          >
            <Plus className="size-4" />
            {isRegionsTab ? labels.addRegion : labels.addDistrict}
          </button>
          </>
        )}
      />

      <div className="rounded-2xl border border-[#e6ebf2] bg-white p-2 dark:border-white/10 dark:bg-slate-950" role="tablist" aria-label={labels.tabsLabel}>
        <LocationTabButton active={isRegionsTab} icon={<MapPinned className="size-4" />} label={labels.regions} onClick={() => setActiveTab("regions")} />
        <LocationTabButton active={!isRegionsTab} icon={<Building2 className="size-4" />} label={labels.districts} onClick={() => setActiveTab("districts")} />
      </div>

      {isRegionsTab ? (
        <>
          <LocationFilters
            filters={regionDraftFilters}
            labels={labels}
            onChange={(next) => setRegionDraftFilters((current) => ({ ...current, ...next }))}
            onReset={() => {
              setRegionDraftFilters(initialRegionFilters);
              setRegionFilters(initialRegionFilters);
            }}
            onSubmit={applyRegionFilters}
          />
          <RegionTable
            error={regionsError}
            labels={labels}
            loading={regionsLoading}
            onDelete={(record) => setDialog({ type: "delete", kind: "region", record })}
            onEdit={(record) => void openEdit("region", record)}
            onCreateDistrict={(region) => setDialog({ type: "create", kind: "district", regionId: region.id })}
            rows={sortedRegions}
            submitting={submitting}
          />
        </>
      ) : (
        <>
          <LocationFilters
            filters={districtDraftFilters}
            labels={labels}
            regionOptions={regionOptions}
            onChange={(next) => setDistrictDraftFilters((current) => ({ ...current, ...next }))}
            onReset={() => {
              setDistrictDraftFilters(initialDistrictFilters);
              setDistrictFilters(initialDistrictFilters);
            }}
            onSubmit={applyDistrictFilters}
          />
          <DistrictTable
            error={districtsError}
            labels={labels}
            loading={districtsLoading}
            onDelete={(record) => setDialog({ type: "delete", kind: "district", record })}
            onEdit={(record) => void openEdit("district", record)}
            regionNameById={regionNameById}
            rows={sortedDistricts}
            submitting={submitting}
          />
        </>
      )}

      {dialog?.type === "create" || dialog?.type === "edit" ? (
        <LocationFormDrawer
          key={`${dialog.type}-${dialog.kind}-${dialog.type === "edit" ? dialog.record.id ?? "unknown" : dialog.regionId ?? "new"}`}
          initialRegionId={dialog.type === "create" ? dialog.regionId : undefined}
          kind={dialog.kind}
          labels={labels}
          loading={submitting}
          record={dialog.type === "edit" ? dialog.record : undefined}
          regionOptions={regionOptions}
          onClose={() => setDialog(null)}
          onSubmit={(payload) => void saveLocation(dialog.kind, payload)}
        />
      ) : null}

      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          loading={submitting}
          title={dialog.kind === "region" ? labels.deleteRegionTitle : labels.deleteDistrictTitle}
          message={dialog.kind === "region" ? labels.deleteRegionMessage : labels.deleteDistrictMessage}
          confirmLabel={t("actions.delete")}
          onCancel={() => setDialog(null)}
          onConfirm={deleteLocation}
        />
      ) : null}
    </section>
  );
}

function LocationFilters({
  filters,
  labels,
  onChange,
  onReset,
  onSubmit,
  regionOptions,
}: {
  filters: RegionFilters | DistrictFilters;
  labels: ReturnType<typeof getLabels>;
  onChange: (next: Partial<DistrictFilters>) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent) => void;
  regionOptions?: FormFieldOption[];
}) {
  const statusOptions = [
    { label: labels.allStatuses, value: "" },
    { label: labels.active, value: "1" },
    { label: labels.inactive, value: "0" },
  ];

  return (
    <form onSubmit={onSubmit} className="artistbor-table-filter-shell artistbor-responsive-filter-shell">
      <div className={cn("artistbor-table-filter-panel artistbor-responsive-filter-panel grid gap-3 md:items-center", regionOptions ? "md:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]" : "md:grid-cols-[minmax(0,1fr)_220px_auto_auto]")}>
        <FormField
          compact
          hideLabel
          label={labels.search}
          value={filters.name ?? ""}
          placeholder={labels.searchPlaceholder}
          prefixIcon={<Search className="size-4" />}
          onChange={(name) => onChange({ name })}
        />
        {regionOptions ? (
          <FormField
            compact
            hideLabel
            label={labels.region}
            type="select"
            value={(filters as DistrictFilters).region_id ?? ""}
            options={[{ label: labels.allRegions, value: "" }, ...regionOptions]}
            onChange={(region_id) => onChange({ region_id })}
          />
        ) : null}
        <FormField
          compact
          hideLabel
          label={labels.status}
          type="select"
          value={filters.status ?? ""}
          options={statusOptions}
          onChange={(status) => onChange({ status })}
        />
        <button type="submit" className="admin-filter-action artistbor-table-filter-control h-10 w-28 shrink-0">
          <Search className="size-4" />
          {labels.searchAction}
        </button>
        <button type="button" onClick={onReset} className="admin-filter-action artistbor-filter-reset artistbor-table-filter-control h-10 w-28 shrink-0">
          <RotateCcw className="size-4" />
          {labels.clearAction}
        </button>
      </div>
    </form>
  );
}

function RegionTable({
  error,
  labels,
  loading,
  onCreateDistrict,
  onDelete,
  onEdit,
  rows,
  submitting,
}: {
  error: string | null;
  labels: ReturnType<typeof getLabels>;
  loading: boolean;
  onCreateDistrict: (record: Region) => void;
  onDelete: (record: Region) => void;
  onEdit: (record: Region) => void;
  rows: Region[];
  submitting: boolean;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!rows.length) return <EmptyState title={labels.noRegions} />;

  return (
    <LocationTableFrame ariaLabel={labels.regions}>
      <thead>
        <tr>
          <LocationTableHead>{labels.id}</LocationTableHead>
          <LocationTableHead>{labels.nameUz}</LocationTableHead>
          <LocationTableHead>{labels.nameRu}</LocationTableHead>
          <LocationTableHead>{labels.nameEn}</LocationTableHead>
          <LocationTableHead>{labels.sortOrder}</LocationTableHead>
          <LocationTableHead>{labels.status}</LocationTableHead>
          <LocationTableHead align="right">{labels.actions}</LocationTableHead>
        </tr>
      </thead>
      <tbody>
        {rows.map((region) => (
          <tr key={region.id ?? locationName(region, "uz")}>
            <LocationTableCell>{toDisplay(region.id)}</LocationTableCell>
            <LocationTableCell strong>{toDisplay(region.name_uz)}</LocationTableCell>
            <LocationTableCell>{toDisplay(region.name_ru)}</LocationTableCell>
            <LocationTableCell>{toDisplay(region.name_en)}</LocationTableCell>
            <LocationTableCell>{toDisplay(region.sort_order ?? 0)}</LocationTableCell>
            <LocationTableCell><LocationStatus status={region.status} labels={labels} /></LocationTableCell>
            <LocationTableCell align="right">
              <div className="flex justify-end gap-1.5">
                <LocationAction label={labels.addDistrict} onClick={() => onCreateDistrict(region)} disabled={submitting}><Plus className="size-4" /></LocationAction>
                <LocationAction label={labels.edit} onClick={() => onEdit(region)} disabled={submitting}><Pencil className="size-4" /></LocationAction>
                <LocationAction danger label={labels.delete} onClick={() => onDelete(region)} disabled={submitting}><Trash2 className="size-4" /></LocationAction>
              </div>
            </LocationTableCell>
          </tr>
        ))}
      </tbody>
    </LocationTableFrame>
  );
}

function DistrictTable({
  error,
  labels,
  loading,
  onDelete,
  onEdit,
  regionNameById,
  rows,
  submitting,
}: {
  error: string | null;
  labels: ReturnType<typeof getLabels>;
  loading: boolean;
  onDelete: (record: District) => void;
  onEdit: (record: District) => void;
  regionNameById: Map<number, string>;
  rows: District[];
  submitting: boolean;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!rows.length) return <EmptyState title={labels.noDistricts} />;

  return (
    <LocationTableFrame ariaLabel={labels.districts}>
      <thead>
        <tr>
          <LocationTableHead>{labels.id}</LocationTableHead>
          <LocationTableHead>{labels.region}</LocationTableHead>
          <LocationTableHead>{labels.nameUz}</LocationTableHead>
          <LocationTableHead>{labels.nameRu}</LocationTableHead>
          <LocationTableHead>{labels.nameEn}</LocationTableHead>
          <LocationTableHead>{labels.sortOrder}</LocationTableHead>
          <LocationTableHead>{labels.status}</LocationTableHead>
          <LocationTableHead align="right">{labels.actions}</LocationTableHead>
        </tr>
      </thead>
      <tbody>
        {rows.map((district) => (
          <tr key={district.id ?? locationName(district, "uz")}>
            <LocationTableCell>{toDisplay(district.id)}</LocationTableCell>
            <LocationTableCell>{district.region_id ? regionNameById.get(district.region_id) ?? `#${district.region_id}` : "—"}</LocationTableCell>
            <LocationTableCell strong>{toDisplay(district.name_uz)}</LocationTableCell>
            <LocationTableCell>{toDisplay(district.name_ru)}</LocationTableCell>
            <LocationTableCell>{toDisplay(district.name_en)}</LocationTableCell>
            <LocationTableCell>{toDisplay(district.sort_order ?? 0)}</LocationTableCell>
            <LocationTableCell><LocationStatus status={district.status} labels={labels} /></LocationTableCell>
            <LocationTableCell align="right">
              <div className="flex justify-end gap-1.5">
                <LocationAction label={labels.edit} onClick={() => onEdit(district)} disabled={submitting}><Pencil className="size-4" /></LocationAction>
                <LocationAction danger label={labels.delete} onClick={() => onDelete(district)} disabled={submitting}><Trash2 className="size-4" /></LocationAction>
              </div>
            </LocationTableCell>
          </tr>
        ))}
      </tbody>
    </LocationTableFrame>
  );
}

function LocationFormDrawer({
  initialRegionId,
  kind,
  labels,
  loading,
  onClose,
  onSubmit,
  record,
  regionOptions,
}: {
  initialRegionId?: number;
  kind: LocationKind;
  labels: ReturnType<typeof getLabels>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: RegionPayload | DistrictPayload) => void;
  record?: LocationRecord;
  regionOptions: FormFieldOption[];
}) {
  const formId = `location-form-${kind}-${record?.id ?? "new"}`;
  const [values, setValues] = useState<LocationFormValues>(() => locationFormValues(record, initialRegionId));
  const [error, setError] = useState("");
  const isDistrict = kind === "district";
  const title = record ? (isDistrict ? labels.editDistrict : labels.editRegion) : (isDistrict ? labels.addDistrict : labels.addRegion);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = isDistrict ? buildDistrictPayload(values) : buildRegionPayload(values);
    if ("error" in result) {
      setError(locationFormError(result.error, labels));
      return;
    }
    setError("");
    onSubmit(result.payload);
  };

  return (
    <AdminDrawer
      size="min(100vw, 560px)"
      title={title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="h-10 rounded-xl border border-[#e6ebf2] bg-white px-4 text-sm font-bold text-[#475569] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]">{labels.cancel}</button>
          <button type="submit" form={formId} disabled={loading} className={cn(adminPrimaryActionButtonClass, "h-10 px-4 disabled:cursor-not-allowed disabled:opacity-60")}>{loading ? labels.saving : labels.save}</button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="text-sm font-medium leading-6 text-[#64748b] dark:text-slate-400">{isDistrict ? labels.districtFormDescription : labels.regionFormDescription}</p>
        {isDistrict ? (
          <FormField
            label={labels.region}
            required
            type="select"
            value={values.region_id}
            options={regionOptions}
            placeholder={labels.selectRegion}
            error={error === labels.regionRequired ? error : undefined}
            disabled={loading}
            onChange={(region_id) => setValues((current) => ({ ...current, region_id }))}
          />
        ) : null}
        <FormField
          label={labels.nameUz}
          required
          value={values.name_uz}
          error={error === labels.nameRequired ? error : undefined}
          disabled={loading}
          onChange={(name_uz) => setValues((current) => ({ ...current, name_uz }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={labels.nameRu} value={values.name_ru} disabled={loading} onChange={(name_ru) => setValues((current) => ({ ...current, name_ru }))} />
          <FormField label={labels.nameEn} value={values.name_en} disabled={loading} onChange={(name_en) => setValues((current) => ({ ...current, name_en }))} />
          <FormField label={labels.sortOrder} type="number" inputMode="numeric" value={values.sort_order} error={error === labels.sortOrderInvalid ? error : undefined} disabled={loading} onChange={(sort_order) => setValues((current) => ({ ...current, sort_order }))} />
          <FormField label={labels.status} type="select" value={values.status} options={[{ label: labels.active, value: "1" }, { label: labels.inactive, value: "0" }]} disabled={loading} onChange={(status) => setValues((current) => ({ ...current, status }))} />
        </div>
        {error && error !== labels.regionRequired && error !== labels.nameRequired && error !== labels.sortOrderInvalid ? <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p> : null}
      </form>
    </AdminDrawer>
  );
}

function LocationTabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition", active ? "bg-[#fff5eb] text-[#ea580c] dark:bg-amber-400/10 dark:text-amber-300" : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200")}
    >
      {icon}
      {label}
    </button>
  );
}

function LocationTableFrame({ ariaLabel, children }: { ariaLabel: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]">
      <div className="admin-table-scroll overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-artistbor-accent" role="region" tabIndex={0} aria-label={ariaLabel}>
        <table className="w-full min-w-[920px] border-separate border-spacing-0" aria-label={ariaLabel}>{children}</table>
      </div>
    </div>
  );
}

function LocationTableHead({ align, children }: { align?: "right"; children: React.ReactNode }) {
  return <th scope="col" className={cn("h-11 border-b border-[#edf2f7] bg-[#f8fafc] px-3.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400", align === "right" && "text-right")}>{children}</th>;
}

function LocationTableCell({ align, children, strong }: { align?: "right"; children: React.ReactNode; strong?: boolean }) {
  return <td className={cn("border-b border-[#edf2f7] px-3.5 py-3 text-[13px] font-medium text-[#475569] dark:border-white/10 dark:text-slate-300", strong && "font-bold text-[#0f172a] dark:text-white", align === "right" && "text-right")}>{children}</td>;
}

function LocationAction({ children, danger, disabled, label, onClick }: { children: React.ReactNode; danger?: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cn("grid size-8 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50", danger ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10" : "border-[#e6ebf2] text-[#64748b] hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-300")}>{children}</button>;
}

function LocationStatus({ labels, status }: { labels: ReturnType<typeof getLabels>; status: unknown }) {
  const active = Number(status ?? 1) === 1;
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]", active ? "border-emerald-400/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300" : "border-slate-400/30 bg-slate-50 text-slate-600 dark:bg-white/10 dark:text-slate-300")}>{active ? labels.active : labels.inactive}</span>;
}

function locationFormValues(record?: LocationRecord, initialRegionId?: number): LocationFormValues {
  return {
    ...emptyLocationFormValues,
    region_id: record && "region_id" in record && record.region_id ? String(record.region_id) : initialRegionId ? String(initialRegionId) : "",
    name_uz: record?.name_uz ?? "",
    name_ru: record?.name_ru ?? "",
    name_en: record?.name_en ?? "",
    sort_order: String(record?.sort_order ?? 0),
    status: String(record?.status ?? 1),
  };
}

function locationFormError(error: "regionRequired" | "nameRequired" | "sortOrderInvalid", labels: ReturnType<typeof getLabels>) {
  if (error === "regionRequired") return labels.regionRequired;
  if (error === "sortOrderInvalid") return labels.sortOrderInvalid;
  return labels.nameRequired;
}

function locationName(location: Region, locale: "uz" | "ru") {
  if (locale === "ru") return location.name_ru || location.name_uz || location.name_en || "—";
  return location.name_uz || location.name_ru || location.name_en || "—";
}

function sortLocations<T extends Region>(rows: T[]) {
  return rows.toSorted((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0) || Number(left.id ?? 0) - Number(right.id ?? 0));
}

function getLabels(locale: "uz" | "ru") {
  const active = getDashboardStatus("resource", 1, locale).label;
  const inactive = getDashboardStatus("resource", 0, locale).label;

  if (locale === "ru") {
    return {
      actions: "Действия",
      active,
      addDistrict: "Добавить район",
      addRegion: "Добавить регион",
      allRegions: "Все регионы",
      allStatuses: "Все статусы",
      cancel: "Отмена",
      clearAction: "Очистить",
      created: getDashboardNotification("locationCreated", "ru"),
      deleted: getDashboardNotification("locationDeleted", "ru"),
      delete: "Удалить",
      deleteDistrictMessage: "Район будет удален. Это действие влияет на выбор локации в мобильном приложении.",
      deleteDistrictTitle: "Удалить район?",
      deleteFailed: "Не удалось удалить локацию",
      deleteRegionMessage: "Регион можно удалить только когда в нем нет районов. Сначала удалите или перенесите районы.",
      deleteRegionTitle: "Удалить регион?",
      description: "Управляйте регионами и районами, которые мобильное приложение получает из API каталога.",
      detailFailed: "Не удалось загрузить детали локации",
      districts: "Районы",
      districtFormDescription: "Выберите регион и заполните отображаемые названия района.",
      edit: "Редактировать",
      editDistrict: "Редактировать район",
      editRegion: "Редактировать регион",
      eyebrow: "КАТАЛОГ",
      inactive,
      id: "ID",
      loadDistrictsFailed: "Не удалось загрузить районы",
      loadRegionsFailed: "Не удалось загрузить регионы",
      nameEn: "Название (EN)",
      nameRequired: "Введите название на узбекском языке.",
      nameRu: "Название (RU)",
      nameUz: "Название (UZ)",
      noDistricts: "Районы не найдены",
      noRegions: "Регионы не найдены",
      region: "Регион",
      regionFormDescription: "Заполните названия региона, порядок вывода и статус в мобильном каталоге.",
      regionRequired: "Выберите регион.",
      regions: "Регионы",
      save: "Сохранить",
      saveFailed: "Не удалось сохранить локацию",
      saving: "Сохранение...",
      search: "Поиск",
      searchAction: "Поиск",
      searchPlaceholder: "Поиск по названию",
      selectRegion: "Выберите регион",
      sortOrder: "Порядок",
      sortOrderInvalid: "Порядок должен быть целым числом 0 или больше.",
      status: "Статус",
      tabsLabel: "Управление локациями",
      title: "Регионы и районы",
      updated: getDashboardNotification("locationUpdated", "ru"),
    };
  }

  return {
    actions: "Amallar",
    active,
    addDistrict: "Tuman qo‘shish",
    addRegion: "Viloyat qo‘shish",
    allRegions: "Barcha viloyatlar",
    allStatuses: "Barcha holatlar",
    cancel: "Bekor qilish",
    clearAction: "Tozalash",
    created: getDashboardNotification("locationCreated", "uz"),
    deleted: getDashboardNotification("locationDeleted", "uz"),
    delete: "O‘chirish",
    deleteDistrictMessage: "Tuman o‘chiriladi. Bu mobil ilovadagi joylashuv tanloviga ta’sir qiladi.",
    deleteDistrictTitle: "Tumanni o‘chirish?",
    deleteFailed: "Joylashuvni o‘chirish bajarilmadi",
    deleteRegionMessage: "Viloyat faqat unda tumanlar bo‘lmasa o‘chiriladi. Avval tumanlarni o‘chiring yoki boshqa viloyatga o‘tkazing.",
    deleteRegionTitle: "Viloyatni o‘chirish?",
    description: "Mobile ilova katalog API’dan oladigan viloyat va tumanlarni boshqaring.",
    detailFailed: "Joylashuv tafsilotlari yuklanmadi",
    districts: "Tumanlar",
    districtFormDescription: "Viloyatni tanlang va tumanning ekranga chiqadigan nomlarini to‘ldiring.",
    edit: "Tahrirlash",
    editDistrict: "Tumanni tahrirlash",
    editRegion: "Viloyatni tahrirlash",
    eyebrow: "KATALOG",
    inactive,
    id: "ID",
    loadDistrictsFailed: "Tumanlar yuklanmadi",
    loadRegionsFailed: "Viloyatlar yuklanmadi",
    nameEn: "Nomi (EN)",
    nameRequired: "O‘zbekcha nomni kiriting.",
    nameRu: "Nomi (RU)",
    nameUz: "Nomi (UZ)",
    noDistricts: "Tumanlar topilmadi",
    noRegions: "Viloyatlar topilmadi",
    region: "Viloyat",
    regionFormDescription: "Viloyat nomlari, chiqish tartibi va mobile katalogdagi holatini to‘ldiring.",
    regionRequired: "Viloyatni tanlang.",
    regions: "Viloyatlar",
    save: "Saqlash",
    saveFailed: "Joylashuvni saqlash bajarilmadi",
    saving: "Saqlanmoqda...",
    search: "Qidirish",
    searchAction: "Qidirish",
    searchPlaceholder: "Nomi bo‘yicha qidirish",
    selectRegion: "Viloyatni tanlang",
    sortOrder: "Tartib",
    sortOrderInvalid: "Tartib 0 yoki undan katta butun son bo‘lishi kerak.",
    status: "Holat",
    tabsLabel: "Joylashuvlarni boshqarish",
    title: "Viloyatlar va tumanlar",
    updated: getDashboardNotification("locationUpdated", "uz"),
  };
}
