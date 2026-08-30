"use client";

import { type ReactNode, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { getMonthlyOrderLimitMode, getQuotaPercent, type ArtistQuotaDetails, type MonthlyOrderLimitMode } from "@/lib/artist-quota";
import type { ArtistQuotaLabels, ArtistQuotaRow } from "./types";

export function ArtistQuotaDrawer({
  canEdit,
  details,
  error,
  labels,
  loading,
  open,
  row,
  saving,
  onClose,
  onSave,
}: {
  canEdit: boolean;
  details: ArtistQuotaDetails | null;
  error: string | null;
  labels: ArtistQuotaLabels;
  loading: boolean;
  open: boolean;
  row: ArtistQuotaRow | null;
  saving: boolean;
  onClose: () => void;
  onSave: (mode: MonthlyOrderLimitMode, customLimit: string) => Promise<void>;
}) {
  const initialMode = getMonthlyOrderLimitMode(row?.monthlyOrderLimit);
  const [mode, setMode] = useState<MonthlyOrderLimitMode>(initialMode);
  const [customLimit, setCustomLimit] = useState(initialMode === "custom" ? String(row?.monthlyOrderLimit) : "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const quota = details?.quota ?? row?.quota ?? null;

  const submit = async () => {
    if (mode === "custom" && (!/^\d+$/.test(customLimit) || Number(customLimit) <= 0)) {
      setValidationError(labels.customLimitHelp);
      return;
    }
    setValidationError(null);
    await onSave(mode, customLimit);
  };

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      size="min(100vw, 760px)"
      title={row ? `${labels.limit} · ${row.name}` : labels.limit}
      footer={canEdit ? <QuotaDrawerActions cancelLabel={labels.cancel} loading={saving} saveLabel={saving ? labels.saving : labels.save} onClose={onClose} onSave={() => void submit()} /> : undefined}
    >
      {row ? (
        <div className="space-y-3.5 p-4">
          <ArtistSummary quota={quota} row={row} />

          {loading ? <DrawerLoading label={labels.loading} /> : null}
          {error ? <DrawerError message={error} /> : null}

          {!loading && !error ? (
            <>
              <QuotaOverview quota={quota} labels={labels} />
              {details?.history.length ? <QuotaHistory history={details.history} labels={labels} /> : null}
            </>
          ) : null}

          {canEdit ? (
            <LimitEditor
              customLimit={customLimit}
              labels={labels}
              mode={mode}
              validationError={validationError}
              onCustomLimitChange={(value) => setCustomLimit(value.replace(/[^0-9]/g, ""))}
              onModeChange={setMode}
            />
          ) : null}

          {quota?.enforced === false ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-medium leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">{labels.limitOnlyCounts}</div> : null}
        </div>
      ) : null}
    </AdminDrawer>
  );
}

function ArtistSummary({ quota, row }: { quota: ArtistQuotaDetails["quota"]; row: ArtistQuotaRow }) {
  return (
    <section className="flex items-center gap-3">
      <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-base font-bold text-slate-400 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-500 dark:ring-white/10">
        {getInitials(row.name)}
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-slate-950 dark:text-white">{row.name}</h2>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{row.phone ?? "—"}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {row.status ? <span>{row.status}</span> : null}
          {quota?.period ? <span>{quota.period}</span> : null}
        </div>
      </div>
    </section>
  );
}

function QuotaOverview({ quota, labels }: { quota: ArtistQuotaDetails["quota"]; labels: ArtistQuotaLabels }) {
  const percent = getQuotaPercent(quota);
  const values = [
    [labels.limit, quota?.limit === 0 || quota?.unlimited ? labels.unlimited : count(quota?.limit)],
    [labels.used, count(quota?.used)],
    [labels.remaining, quota?.remaining === null ? labels.unlimited : count(quota?.remaining)],
    [labels.allTime, count(quota?.totalAllTime)],
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">{quota?.period ?? labels.period}</h3>
        {quota?.enforced === true ? <QuotaStatusBadge label={labels.enforcedActive} tone="success" /> : quota?.enforced === false ? <QuotaStatusBadge label={labels.countingOnly} tone="warning" /> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {values.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"><dt className="text-[10px] font-bold uppercase leading-3 tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 text-[13px] font-bold text-slate-950 dark:text-white">{value}</dd></div>)}
      </dl>
      {percent !== null ? <div className="mt-3"><div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400"><span>{labels.used}</span><span>{percent}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><span className={progressClass(percent)} style={{ width: `${Math.min(percent, 100)}%` }} /></div></div> : null}
    </section>
  );
}

function QuotaHistory({ history, labels }: { history: ArtistQuotaDetails["history"]; labels: ArtistQuotaLabels }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025]"><h3 className="text-sm font-bold text-slate-950 dark:text-white">{labels.history}</h3><ul className="mt-3 divide-y divide-slate-100 dark:divide-white/10">{history.map((item) => <li key={item.period} className="flex items-center justify-between py-2.5 text-[13px]"><span className="font-medium text-slate-500 dark:text-slate-400">{item.period}</span><span className="font-bold text-slate-950 dark:text-white">{count(item.count)}</span></li>)}</ul></section>;
}

function LimitEditor({
  customLimit,
  labels,
  mode,
  validationError,
  onCustomLimitChange,
  onModeChange,
}: {
  customLimit: string;
  labels: ArtistQuotaLabels;
  mode: MonthlyOrderLimitMode;
  validationError: string | null;
  onCustomLimitChange: (value: string) => void;
  onModeChange: (mode: MonthlyOrderLimitMode) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025]">
      <fieldset>
        <legend className="text-sm font-bold text-slate-950 dark:text-white">{labels.limit}</legend>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{labels.defaultLimitHelp}</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
          <LimitModeOption checked={mode === "default"} description={labels.defaultLimitHelp} label={labels.defaultLimit} onChange={() => onModeChange("default")} value="default" />
          <LimitModeOption checked={mode === "unlimited"} description={labels.unlimitedHelp} label={labels.unlimited} onChange={() => onModeChange("unlimited")} value="unlimited" />
          <LimitModeOption checked={mode === "custom"} description={labels.customLimitHelp} label={labels.customLimit} onChange={() => onModeChange("custom")} value="custom" />
        </div>
      </fieldset>
      {mode === "custom" ? <label className="mt-3 block"><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{labels.customLimit}</span><input aria-invalid={Boolean(validationError)} className="mt-1.5 h-10 w-full rounded-xl border border-artistbor-border bg-artistbor-surface-subtle px-3 text-[13px] font-semibold text-artistbor-primary outline-none transition-colors placeholder:text-artistbor-muted focus:border-artistbor-focus focus:bg-artistbor-surface focus:ring-0 [color-scheme:light] dark:[color-scheme:dark]" inputMode="numeric" min="1" onChange={(event) => onCustomLimitChange(event.target.value)} placeholder="20" type="number" value={customLimit} /></label> : null}
      {validationError ? <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">{validationError}</p> : null}
    </section>
  );
}

function LimitModeOption({ checked, description, label, onChange, value }: { checked: boolean; description: string; label: string; onChange: () => void; value: MonthlyOrderLimitMode }) {
  return <label className={`flex cursor-pointer items-start gap-3 border-b border-slate-200 px-3 py-3 last:border-b-0 dark:border-white/10 ${checked ? "bg-amber-50/70 dark:bg-amber-500/10" : "bg-white dark:bg-transparent"}`}><input className="mt-0.5 size-4 accent-amber-500" type="radio" name="quota-limit-mode" checked={checked} value={value} onChange={onChange} /><span><span className="block text-[13px] font-semibold text-slate-950 dark:text-white">{label}</span><span className="mt-0.5 block text-xs leading-4 text-slate-500 dark:text-slate-400">{description}</span></span></label>;
}

function QuotaDrawerActions({ cancelLabel, loading, saveLabel, onClose, onSave }: { cancelLabel: string; loading: boolean; saveLabel: string; onClose: () => void; onSave: () => void }) {
  return <div className="grid grid-cols-2 gap-2"><QuotaDrawerActionButton icon={<X className="size-4" />} label={cancelLabel} onClick={onClose} /><QuotaDrawerActionButton icon={<CheckCircle2 className="size-4" />} label={saveLabel} loading={loading} tone="save" onClick={onSave} /></div>;
}

function QuotaDrawerActionButton({ icon, label, loading, tone = "default", onClick }: { icon: ReactNode; label: string; loading?: boolean; tone?: "default" | "save"; onClick: () => void }) {
  const toneClass = tone === "save" ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10" : "border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10";
  return <button type="button" disabled={loading} onClick={onClick} className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70 dark:disabled:border-white/10 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500 ${toneClass}`}>{icon}<span className="truncate">{label}</span></button>;
}

function QuotaStatusBadge({ label, tone }: { label: string; tone: "success" | "warning" }) {
  const className = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300";
  return <span className={`inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em] ${className}`}>{label}</span>;
}

function DrawerLoading({ label }: { label: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-400">{label}</div>;
}

function DrawerError({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/[0.08] dark:text-rose-200">{message}</div>;
}

function progressClass(percent: number) {
  const color = percent >= 100 ? "bg-rose-500" : percent >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return `block h-full rounded-full ${color}`;
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

function count(value: number | null | undefined) {
  return typeof value === "number" ? new Intl.NumberFormat("uz-UZ").format(value) : "—";
}
