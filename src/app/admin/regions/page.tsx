"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ListTree } from "lucide-react";
import { CrudPage, type CrudField, type FilterField } from "@/components/admin/crud-page";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Modal } from "@/components/ui/modal";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  districtsApi,
  regionsApi,
  type DistrictFilters,
  type DistrictPayload,
  type RegionFilters,
  type RegionPayload,
} from "@/lib/api/admin-content";
import { cn } from "@/lib/utils";
import type { District, Region } from "@/types/api";

type Tab = "regions" | "districts";

const regionColumns: DataTableColumn<Region>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "name_uz", label: "Nomi UZ" },
  { key: "name_ru", label: "Nomi RU" },
  { key: "name_en", label: "Nomi EN" },
  { key: "status", label: "Holat", kind: "status" },
  { key: "sort_order", label: "Tartib", kind: "number" },
];

const districtColumns: DataTableColumn<District>[] = [
  { key: "id", label: "ID", kind: "number" },
  { key: "region_id", label: "Region ID", kind: "number" },
  { key: "name_uz", label: "Nomi UZ" },
  { key: "name_ru", label: "Nomi RU" },
  { key: "name_en", label: "Nomi EN" },
  { key: "status", label: "Holat", kind: "status" },
  { key: "sort_order", label: "Tartib", kind: "number" },
];

const regionFilters: FilterField<RegionFilters>[] = [
  { name: "name", label: "Nomi", placeholder: "Viloyat nomi" },
  { name: "status", label: "Holat", type: "number" },
];

const districtFilters: FilterField<DistrictFilters>[] = [
  { name: "region_id", label: "Region ID", type: "number" },
  { name: "name", label: "Nomi", placeholder: "Tuman nomi" },
  { name: "status", label: "Holat", type: "number" },
];

const regionFields: CrudField<RegionPayload>[] = [
  { name: "name_uz", label: "Nomi UZ", required: true },
  { name: "name_ru", label: "Nomi RU" },
  { name: "name_en", label: "Nomi EN" },
  { name: "sort_order", label: "Tartib", type: "number" },
  { name: "status", label: "Holat", type: "number" },
];

export default function RegionsPage() {
  const [tab, setTab] = useState<Tab>("regions");
  const [regionOptions, setRegionOptions] = useState<{ label: string; value: number }[]>([]);
  const [districtModal, setDistrictModal] = useState<{
    title: string;
    loading: boolean;
    error: string | null;
    rows: District[];
  } | null>(null);
  const toast = useToast();

  const loadRegionsForSelect = useCallback(async () => {
    try {
      const result = await regionsApi.list({});
      setRegionOptions(
        result.items
          .filter((region): region is Region & { id: number } => typeof region.id === "number")
          .map((region) => ({
            label: region.name_uz || region.name_ru || region.name_en || `Region #${region.id}`,
            value: region.id,
          })),
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Viloyatlar yuklanmadi");
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRegionsForSelect();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRegionsForSelect]);

  const districtFields = useMemo<CrudField<DistrictPayload>[]>(
    () => [
      {
        name: "region_id",
        label: "Viloyat",
        type: "select",
        required: true,
        options: regionOptions,
      },
      { name: "name_uz", label: "Nomi UZ", required: true },
      { name: "name_ru", label: "Nomi RU" },
      { name: "name_en", label: "Nomi EN" },
      { name: "sort_order", label: "Tartib", type: "number" },
      { name: "status", label: "Holat", type: "number" },
    ],
    [regionOptions],
  );

  const openRegionDistricts = async (region: Region) => {
    if (!region.id) return;
    setDistrictModal({
      title: `${region.name_uz || `Region #${region.id}`} tumanlari`,
      loading: true,
      error: null,
      rows: [],
    });
    try {
      const result = await regionsApi.districts(region.id);
      setDistrictModal({
        title: `${region.name_uz || `Region #${region.id}`} tumanlari`,
        loading: false,
        error: null,
        rows: result.items,
      });
    } catch (caught) {
      setDistrictModal({
        title: `${region.name_uz || `Region #${region.id}`} tumanlari`,
        loading: false,
        error: caught instanceof Error ? caught.message : "Tumanlar yuklanmadi",
        rows: [],
      });
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
          Hududlar
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Hududlar
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Viloyatlar va tumanlarni boshqarish, qidirish va yangilash.
        </p>
      </div>

      <div className="inline-flex rounded-[22px] border border-slate-100 bg-white p-1 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950">
        <TabButton active={tab === "regions"} onClick={() => setTab("regions")}>
          <Building2 className="size-4" />
          Hududlar
        </TabButton>
        <TabButton active={tab === "districts"} onClick={() => setTab("districts")}>
          <ListTree className="size-4" />
          Tumanlar
        </TabButton>
      </div>

      {tab === "regions" ? (
        <CrudPage<Region, RegionFilters, RegionPayload, RegionPayload>
          title="Viloyatlar"
          eyebrow="Viloyatlar"
          description="Viloyatlar ro'yxatini ko'rish, qo'shish va tahrirlash."
          columns={regionColumns}
          filterFields={regionFilters}
          createFields={regionFields}
          updateFields={regionFields}
          initialFilters={{ name: "", status: "" }}
          list={regionsApi.list}
          detail={regionsApi.detail}
          create={regionsApi.create}
          update={regionsApi.update}
          remove={regionsApi.delete}
          extraRowActions={(region) => (
            <button
              type="button"
              title="Tumanlar"
              aria-label="Tumanlar"
              onClick={() => void openRegionDistricts(region)}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:text-slate-300"
            >
              <ListTree className="size-4" />
            </button>
          )}
        />
      ) : (
        <CrudPage<District, DistrictFilters, DistrictPayload, DistrictPayload>
          title="Tumanlar"
          eyebrow="Tumanlar"
          description="Tumanlarni viloyat bo'yicha boshqarish."
          columns={districtColumns}
          filterFields={districtFilters}
          createFields={districtFields}
          updateFields={districtFields}
          initialFilters={{ region_id: "", name: "", status: "" }}
          list={districtsApi.list}
          detail={districtsApi.detail}
          create={districtsApi.create}
          update={districtsApi.update}
          remove={districtsApi.delete}
        />
      )}

      {districtModal ? (
        <Modal title={districtModal.title} onClose={() => setDistrictModal(null)} width="max-w-5xl">
          {districtModal.loading ? (
            <LoadingState label="Tumanlar yuklanmoqda..." />
          ) : districtModal.error ? (
            <ErrorState message={districtModal.error} />
          ) : (
            <DataTable
              columns={districtColumns}
              rows={districtModal.rows}
              getRowKey={(row, index) => row.id ?? index}
            />
          )}
        </Modal>
      ) : null}
    </section>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-[18px] px-5 py-3 text-sm font-black transition",
        active
          ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
          : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
