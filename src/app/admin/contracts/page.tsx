"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import { Eye, RotateCcw } from "lucide-react";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ContractFileActions } from "@/components/admin/contracts/contract-file-actions";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState, ErrorState, InlineLoadingState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { contractsApi, type ContractFilters } from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getDashboardStatus } from "@/lib/i18n/dashboard-copy";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLatestRequest } from "@/lib/use-latest-request";
import { normalizeDate, toDisplay } from "@/lib/utils";
import type { ListResult, OrderContract } from "@/types/api";

const initialFilters: ContractFilters = { page: 1, per_page: 20 };
const SEARCH_DEBOUNCE_MS = 2_000;

export default function ContractsPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getLabels(locale), [locale]);
  const statusOptions = useMemo(() => [
    "draft",
    "pending_signatures",
    "partially_signed",
    "signed",
    "cancelled",
  ].map((value) => ({ value, label: getDashboardStatus("contract", value, locale).label })), [locale]);
  const [filters, setFilters] = useState<ContractFilters>(initialFilters);
  const [draft, setDraft] = useState<ContractFilters>(initialFilters);
  const [rows, setRows] = useState<OrderContract[]>([]);
  const [meta, setMeta] = useState<ListResult<OrderContract>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<OrderContract | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequestId = useRef(0);
  const toast = useToast();
  const startRequest = useLatestRequest(filters);
  const debouncedSearch = useDebouncedValue(draft.q ?? "", SEARCH_DEBOUNCE_MS);

  const load = useCallback(async () => {
    const isLatest = startRequest();
    setLoading(true);
    setError("");
    try {
      const result = await contractsApi.list(filters);
      if (!isLatest()) return;
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (!isLatest()) return;
      setError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [filters, labels.loadFailed, startRequest]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const q = debouncedSearch.trim();
        if ((current.q ?? "") === q) return current;
        return { ...current, q, page: 1 };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch]);

  const openDetail = async (row: OrderContract) => {
    const id = contractId(row);
    if (!id) return;
    const requestId = ++detailRequestId.current;
    setSelected(row);
    setDetailLoading(true);
    try {
      const detail = await contractsApi.detail(id);
      if (detailRequestId.current !== requestId) return;
      setSelected((current) => current && contractId(current) === id ? { ...row, ...detail } : current);
    } catch (caught) {
      if (detailRequestId.current !== requestId) return;
      toast.error(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      if (detailRequestId.current === requestId) setDetailLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<OrderContract>[]>(() => [
    { key: "contract_number", label: labels.contract, render: (row) => <p className="font-bold text-slate-950 dark:text-white">{toDisplay(row.contract_number)}</p> },
    { key: "order_public_id", label: labels.order, render: (row) => <span className="font-bold text-slate-950 dark:text-white">{toDisplay(row.order_public_id)}</span> },
    { key: "status", label: labels.status, render: (row) => <StatusBadge value={row.status} fieldKey="contract_status" /> },
    { key: "signatures", label: labels.signatures, render: (row) => <SignatureSummary contract={row} labels={labels} /> },
    { key: "created_at", label: labels.createdAt, render: (row) => <span className="whitespace-nowrap">{normalizeDate(row.created_at)}</span> },
  ], [labels]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    commitSearch();
  };

  function commitSearch() {
    setFilters((current) => ({ ...current, q: draft.q?.trim() ?? "", page: 1 }));
  }

  function updateFilter<Key extends keyof ContractFilters>(key: Key, value: ContractFilters[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader eyebrow={labels.eyebrow} title={labels.title} description={labels.description} />
      <form onSubmit={submit} className="artistbor-table-filter-shell artistbor-responsive-filter-shell">
        <div className="artistbor-table-filter-panel artistbor-responsive-filter-panel grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <input type="search" aria-label={labels.search} className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm md:col-span-2" placeholder={labels.search} value={draft.q ?? ""} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitSearch(); } }} />
          <Select
            className="artistbor-table-filter-control h-10 min-w-0"
            value={draft.status || undefined}
            placeholder={labels.allStatuses}
            aria-label={labels.allStatuses}
            onChange={(value) => updateFilter("status", value)}
            options={statusOptions}
          />
          <input className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm" placeholder={labels.artistId} value={draft.artist_id ?? ""} onChange={(event) => updateFilter("artist_id", event.target.value)} />
          <input className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm" placeholder={labels.clientId} value={draft.client_id ?? ""} onChange={(event) => updateFilter("client_id", event.target.value)} />
          <input type="date" aria-label={labels.dateFrom} className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm" value={draft.date_from ?? ""} onChange={(event) => updateFilter("date_from", event.target.value)} />
          <input type="date" aria-label={labels.dateTo} className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm" value={draft.date_to ?? ""} onChange={(event) => updateFilter("date_to", event.target.value)} />
          <div className="flex md:col-span-4 xl:col-span-7 xl:justify-end"><button type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); }} className="admin-filter-action artistbor-table-filter-control inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold"><RotateCcw className="size-4" />{labels.reset}</button></div>
        </div>
      </form>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : rows.length === 0 ? <EmptyState /> : <DataTable columns={columns} rows={rows} getRowKey={(row, index) => contractId(row) ?? index} actions={(row) => <div className="flex justify-end gap-2"><ContractFileActions compact contractId={contractId(row)} contractNumber={row.contract_number} disabled={!hasContractFile(row)} labels={labels.fileActions} /><button type="button" className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:text-slate-300" aria-label={labels.viewDetails} onClick={() => void openDetail(row)}><Eye className="size-4" /></button></div>} />}
      <Pagination meta={meta} page={filters.page ?? 1} pageSize={filters.per_page ?? 20} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} onPageSizeChange={(per_page) => setFilters((current) => ({ ...current, page: 1, per_page }))} />
      {selected ? <AdminDrawer size="min(100vw, 680px)" title={selected.contract_number || labels.detailTitle} onClose={() => { detailRequestId.current += 1; setDetailLoading(false); setSelected(null); }} footer={<ContractFileActions contractId={contractId(selected)} contractNumber={selected.contract_number} disabled={!hasContractFile(selected)} labels={labels.fileActions} />}><div className="space-y-4 p-4">{detailLoading ? <InlineLoadingState /> : null}<ContractDetail contract={selected} labels={labels} /></div></AdminDrawer> : null}
    </section>
  );
}

function ContractDetail({ contract, labels }: { contract: OrderContract; labels: ReturnType<typeof getLabels> }) {
  const { locale } = useI18n();
  const status = getDashboardStatus("contract", contract.status, locale).label;
  return <><div className="grid gap-3 sm:grid-cols-2"><Info label={labels.contract} value={toDisplay(contract.contract_number)} /><Info label={labels.order} value={toDisplay(contract.order_public_id)} /><Info label={labels.status} value={status} /><Info label={labels.createdAt} value={normalizeDate(contract.created_at)} /><Info label={labels.generatedAt} value={normalizeDate(contract.generated_at)} /><Info label={labels.fileSize} value={formatBytes(contract.file_size)} /></div><section className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"><h2 className="text-sm font-bold text-slate-950 dark:text-white">{labels.signatures}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><SignatureCard label={labels.artist} signature={contract.signatures?.artist} /><SignatureCard label={labels.client} signature={contract.signatures?.client} /></div></section></>;
}
function SignatureSummary({ contract, labels }: { contract: OrderContract; labels: ReturnType<typeof getLabels> }) { return <div className="space-y-1 text-xs"><p>{labels.artist}: <strong>{contract.signatures?.artist?.signed ? labels.signed : labels.waiting}</strong></p><p>{labels.client}: <strong>{contract.signatures?.client?.signed ? labels.signed : labels.waiting}</strong></p></div>; }
function SignatureCard({ label, signature }: { label: string; signature?: { signed?: boolean; signed_at?: number | null } }) { return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{signature?.signed ? "✓" : "—"} {signature?.signed ? normalizeDate(signature.signed_at) : ""}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p></div>; }
function contractId(contract: OrderContract) { return contract.contract_id ?? contract.id; }
function hasContractFile(contract: OrderContract) { return contract.has_file !== false && (Boolean(contract.file_url) || Boolean(contract.file_size) || contract.status !== "draft"); }
function formatBytes(value?: number | null) { if (!value || value < 1) return "—"; if (value < 1024) return `${value} B`; return `${(value / 1024).toFixed(1)} KB`; }
function getLabels(locale: string) { return locale === "ru" ? { eyebrow: "Документы", title: "Договоры", description: "Договоры заказов, статусы подписей и защищенная загрузка PDF.", loadFailed: "Не удалось загрузить договоры", search: "CNT-000001 или ORD-1024", allStatuses: "Все статусы", artistId: "ID артиста", clientId: "ID клиента", dateFrom: "Дата с", dateTo: "Дата по", reset: "Сбросить", contract: "Договор", order: "Заказ", status: "Статус", signatures: "Подписи", createdAt: "Создан", generatedAt: "PDF создан", fileSize: "Размер файла", artist: "Артист", client: "Клиент", signed: "Подписано", waiting: "Ожидается", viewDetails: "Детали", detailTitle: "Договор", statuses: { draft: "Черновик", pending: "Ожидает подписей", partial: "Частично подписан", signed: "Подписан", cancelled: "Отменен" }, fileActions: { view: "Открыть PDF", download: "Скачать PDF", failed: "Не удалось загрузить PDF" } } : { eyebrow: "Hujjatlar", title: "Shartnomalar", description: "Buyurtma shartnomalari, imzo holatlari va token bilan himoyalangan PDF yuklash.", loadFailed: "Shartnomalar yuklanmadi", search: "CNT-000001 yoki ORD-1024", allStatuses: "Barcha holatlar", artistId: "Sanatkor ID", clientId: "Mijoz ID", dateFrom: "Boshlanish sanasi", dateTo: "Tugash sanasi", reset: "Tozalash", contract: "Shartnoma", order: "Buyurtma", status: "Holat", signatures: "Imzolar", createdAt: "Yaratilgan", generatedAt: "PDF yaratilgan", fileSize: "Fayl hajmi", artist: "Sanatkor", client: "Mijoz", signed: "Imzolangan", waiting: "Kutilmoqda", viewDetails: "Tafsilotlar", detailTitle: "Shartnoma", statuses: { draft: "Qoralama", pending: "Imzo kutilmoqda", partial: "Qisman imzolangan", signed: "Imzolangan", cancelled: "Bekor qilingan" }, fileActions: { view: "PDF ko‘rish", download: "PDF yuklab olish", failed: "PDF yuklanmadi" } }; }
