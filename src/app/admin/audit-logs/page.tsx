"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import { Eye, RotateCcw, Search } from "lucide-react";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState, ErrorState, InlineLoadingState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { auditLogsApi, type AuditLogFilters } from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useLatestRequest } from "@/lib/use-latest-request";
import { normalizeDate, toDisplay } from "@/lib/utils";
import type { AuditLogMeta, AuditLogRecord, ListResult, UnknownRecord } from "@/types/api";

const initialFilters: AuditLogFilters = { page: 1, per_page: 20 };

export default function AuditLogsPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getLabels(locale), [locale]);
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters);
  const [draft, setDraft] = useState<AuditLogFilters>(initialFilters);
  const [filterMeta, setFilterMeta] = useState<AuditLogMeta>({});
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [meta, setMeta] = useState<ListResult<AuditLogRecord>["meta"]>();
  const [selected, setSelected] = useState<AuditLogRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const detailRequestId = useRef(0);
  const toast = useToast();
  const startRequest = useLatestRequest(filters);

  const load = useCallback(async () => {
    const isLatest = startRequest();
    setLoading(true);
    setError("");
    try {
      const result = await auditLogsApi.list(filters);
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
      void auditLogsApi.meta().then(setFilterMeta).catch(() => setFilterMeta({}));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openDetail = async (row: AuditLogRecord) => {
    if (!row.id) return;
    const requestId = ++detailRequestId.current;
    setSelected(row);
    setDetailLoading(true);
    try {
      const detail = await auditLogsApi.detail(row.id);
      if (detailRequestId.current !== requestId) return;
      setSelected((current) => current?.id === row.id ? { ...row, ...detail } : current);
    } catch (caught) {
      if (detailRequestId.current !== requestId) return;
      toast.error(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      if (detailRequestId.current === requestId) setDetailLoading(false);
    }
  };

  const columns = useMemo<DataTableColumn<AuditLogRecord>[]>(() => [
    { key: "created_at", label: labels.date, render: (row) => <span className="whitespace-nowrap">{formatAuditDate(row)}</span> },
    { key: "admin_name", label: labels.admin, render: (row) => <div><p className="font-bold text-slate-950 dark:text-white">{toDisplay(row.admin_name)}</p><p className="text-xs text-slate-500 dark:text-slate-400">{toDisplay(row.admin_role_label ?? row.admin_role)} · {toDisplay(row.admin_public_id)}</p></div> },
    { key: "action", label: labels.action, render: (row) => <div><p className="font-bold text-slate-950 dark:text-white">{toDisplay(row.action_label ?? row.action)}</p><p className="font-mono text-xs text-slate-500 dark:text-slate-400">{toDisplay(row.method)} {toDisplay(row.route)}</p></div> },
    { key: "entity", label: labels.entity, render: (row) => <div><p className="font-bold text-slate-950 dark:text-white">{toDisplay(row.entity_public_id)}</p><p className="text-xs text-slate-500 dark:text-slate-400">{toDisplay(row.entity_type)}</p></div> },
    { key: "ip", label: "IP", render: (row) => <span className="font-mono text-xs">{toDisplay(row.ip)}</span> },
  ], [labels]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draft, page: 1, per_page: filters.per_page ?? 20 });
  };

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader eyebrow={labels.eyebrow} title={labels.title} description={labels.description} />
      <form onSubmit={submit} className="artistbor-table-filter-shell artistbor-responsive-filter-shell">
        <div className="artistbor-table-filter-panel artistbor-responsive-filter-panel grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <input className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm md:col-span-2" placeholder={labels.search} value={draft.q ?? ""} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} />
          <Select
            className="artistbor-table-filter-control h-10 min-w-0"
            value={draft.admin_id || undefined}
            placeholder={labels.allAdmins}
            aria-label={labels.allAdmins}
            onChange={(value) => setDraft((current) => ({ ...current, admin_id: value }))}
            options={filterMeta.admins?.map((admin) => ({ value: admin.admin_id, label: admin.admin_name }))}
          />
          <Select
            className="artistbor-table-filter-control h-10 min-w-0"
            value={draft.admin_role || undefined}
            placeholder={labels.allRoles}
            aria-label={labels.allRoles}
            onChange={(value) => setDraft((current) => ({ ...current, admin_role: value }))}
            options={filterMeta.roles?.map((role) => ({ value: role.value, label: role.label }))}
          />
          <Select
            className="artistbor-table-filter-control h-10 min-w-0"
            value={draft.action || undefined}
            placeholder={labels.allActions}
            aria-label={labels.allActions}
            onChange={(value) => setDraft((current) => ({ ...current, action: value }))}
            options={filterMeta.actions?.map((action) => ({ value: action.value, label: action.label }))}
          />
          <Select
            className="artistbor-table-filter-control h-10 min-w-0"
            value={draft.entity_type || undefined}
            placeholder={labels.allEntities}
            aria-label={labels.allEntities}
            onChange={(value) => setDraft((current) => ({ ...current, entity_type: value }))}
            options={filterMeta.entity_types?.map((entity) => ({ value: entity, label: entity }))}
          />
          <input className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm" placeholder="ORD-1024" value={draft.entity_id ?? ""} onChange={(event) => setDraft((current) => ({ ...current, entity_id: event.target.value }))} />
          <input type="date" className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm" aria-label={labels.dateFrom} value={draft.date_from ?? ""} onChange={(event) => setDraft((current) => ({ ...current, date_from: event.target.value }))} />
          <input type="date" className="artistbor-table-filter-control h-10 rounded-xl px-3 text-sm" aria-label={labels.dateTo} value={draft.date_to ?? ""} onChange={(event) => setDraft((current) => ({ ...current, date_to: event.target.value }))} />
          <div className="flex gap-2 md:col-span-4 xl:col-span-8 xl:justify-end">
            <button type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); }} className="admin-filter-action artistbor-table-filter-control inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold"><RotateCcw className="size-4" />{labels.reset}</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white hover:bg-amber-600"><Search className="size-4" />{labels.apply}</button>
          </div>
        </div>
      </form>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : rows.length === 0 ? <EmptyState /> : <DataTable columns={columns} rows={rows} getRowKey={(row, index) => row.id ?? index} actions={(row) => <button type="button" className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:text-slate-300" aria-label={labels.view} onClick={() => void openDetail(row)}><Eye className="size-4" /></button>} />}
      <Pagination meta={meta} page={filters.page ?? 1} pageSize={filters.per_page ?? 20} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} onPageSizeChange={(per_page) => setFilters((current) => ({ ...current, page: 1, per_page }))} />
      {selected ? <AdminDrawer size="min(100vw, 760px)" title={labels.detail} onClose={() => { detailRequestId.current += 1; setDetailLoading(false); setSelected(null); }}><div className="space-y-4 p-4">{detailLoading ? <InlineLoadingState /> : null}<AuditSummary record={selected} labels={labels} /><AuditDiff oldValues={selected.old_values} newValues={selected.new_values} labels={labels} /></div></AdminDrawer> : null}
    </section>
  );
}

function AuditSummary({ record, labels }: { record: AuditLogRecord; labels: ReturnType<typeof getLabels> }) {
  return <div className="grid gap-3 sm:grid-cols-2"><Summary label={labels.admin} value={`${toDisplay(record.admin_name)} · ${toDisplay(record.admin_role_label ?? record.admin_role)}`} /><Summary label={labels.action} value={toDisplay(record.action_label ?? record.action)} /><Summary label={labels.entity} value={`${toDisplay(record.entity_type)} · ${toDisplay(record.entity_public_id)}`} /><Summary label="IP" value={toDisplay(record.ip)} /><Summary label={labels.route} value={`${toDisplay(record.method)} ${toDisplay(record.route)}`} /><Summary label={labels.date} value={formatAuditDate(record)} /></div>;
}

function AuditDiff({ oldValues, newValues, labels }: { oldValues?: UnknownRecord | null; newValues?: UnknownRecord | null; labels: ReturnType<typeof getLabels> }) {
  const keys = Array.from(new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})]));
  if (!keys.length) return <EmptyState title={labels.noChanges} />;
  return <section><h2 className="mb-3 text-sm font-bold text-slate-950 dark:text-white">{labels.changes}</h2><div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10"><div className="grid grid-cols-[minmax(100px,.7fr)_1fr_1fr] bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"><div className="p-3">{labels.field}</div><div className="border-l border-slate-200 p-3 dark:border-white/10">{labels.before}</div><div className="border-l border-slate-200 p-3 dark:border-white/10">{labels.after}</div></div>{keys.map((key) => <div key={key} className="grid grid-cols-[minmax(100px,.7fr)_1fr_1fr] border-t border-slate-200 text-sm dark:border-white/10"><div className="break-words p-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{key}</div><ValueCell value={oldValues?.[key]} /><ValueCell value={newValues?.[key]} /></div>)}</div></section>;
}

function ValueCell({ value }: { value: unknown }) { return <div className="overflow-x-auto border-l border-slate-200 p-3 font-mono text-xs text-slate-600 dark:border-white/10 dark:text-slate-300"><pre className="whitespace-pre-wrap">{formatJson(value)}</pre></div>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p></div>; }
function formatAuditDate(row: AuditLogRecord) { return row.created_at_iso || normalizeDate(row.created_at); }
function formatJson(value: unknown) { if (value === undefined) return "—"; if (typeof value === "string") return value; try { return JSON.stringify(value, null, 2); } catch { return String(value); } }
function getLabels(locale: string) { return locale === "ru" ? { eyebrow: "Безопасность", title: "Журнал аудита", description: "Неизменяемая история действий администраторов и измененных значений.", loadFailed: "Не удалось загрузить журнал аудита", search: "Имя, действие, объект или IP", allAdmins: "Все администраторы", allRoles: "Все роли", allActions: "Все действия", allEntities: "Все объекты", dateFrom: "Дата с", dateTo: "Дата по", reset: "Сбросить", apply: "Применить", date: "Дата", admin: "Администратор", action: "Действие", entity: "Объект", view: "Посмотреть", detail: "Запись аудита", route: "Маршрут", changes: "Измененные значения", noChanges: "Измененные значения отсутствуют", field: "Поле", before: "До", after: "После" } : { eyebrow: "Xavfsizlik", title: "Audit log", description: "Administrator amallari va o‘zgargan qiymatlarning o‘zgarmas tarixi.", loadFailed: "Audit log yuklanmadi", search: "Ism, amal, obyekt yoki IP", allAdmins: "Barcha adminlar", allRoles: "Barcha rollar", allActions: "Barcha amallar", allEntities: "Barcha obyektlar", dateFrom: "Boshlanish sanasi", dateTo: "Tugash sanasi", reset: "Tozalash", apply: "Qo‘llash", date: "Sana", admin: "Administrator", action: "Amal", entity: "Obyekt", view: "Ko‘rish", detail: "Audit yozuvi", route: "Route", changes: "O‘zgargan qiymatlar", noChanges: "O‘zgargan qiymatlar yo‘q", field: "Maydon", before: "Oldin", after: "Keyin" }; }
