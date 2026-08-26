"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, Percent, RefreshCw, RotateCcw, Save, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { adminConfigApi, type AdminConfigItem } from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { getDashboardNotification } from "@/lib/i18n/dashboard-copy";
import { cn, isRecord } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

type ConfigKey = "order.advance_percent" | "order.advance_deadline_minutes" | "commission.default_percent";

type ConfigDefinition = {
  key: ConfigKey;
  defaultValue: string;
  icon: LucideIcon;
  inputMode: "decimal" | "numeric";
  max?: number;
  min: number;
  step: string;
  unit: string;
};

const configDefinitions: ConfigDefinition[] = [
  {
    key: "order.advance_percent",
    defaultValue: "30",
    icon: Percent,
    inputMode: "decimal",
    max: 100,
    min: 0,
    step: "0.1",
    unit: "%",
  },
  {
    key: "order.advance_deadline_minutes",
    defaultValue: "30",
    icon: Clock3,
    inputMode: "numeric",
    min: 1,
    step: "1",
    unit: "min",
  },
  {
    key: "commission.default_percent",
    defaultValue: "15",
    icon: Percent,
    inputMode: "decimal",
    max: 100,
    min: 0,
    step: "0.1",
    unit: "%",
  },
];

type ConfigValues = Record<ConfigKey, string>;
type ConfigErrors = Partial<Record<ConfigKey, string>>;

const initialValues = buildDefaultValues();

export default function AdminSettingsPage() {
  const { locale } = useI18n();
  const labels = useMemo(() => getSettingsLabels(locale), [locale]);
  const toast = useToast();
  const [values, setValues] = useState<ConfigValues>(initialValues);
  const [savedValues, setSavedValues] = useState<ConfigValues>(initialValues);
  const [errors, setErrors] = useState<ConfigErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const dirty = useMemo(
    () => configDefinitions.some((item) => normalizeNumberString(values[item.key]) !== normalizeNumberString(savedValues[item.key])),
    [savedValues, values],
  );

  const loadConfigs = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await adminConfigApi.list();
      const nextValues = mergeConfigValues(response);
      setValues(nextValues);
      setSavedValues(nextValues);
      setErrors({});
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : labels.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    adminConfigApi
      .list()
      .then((response) => {
        if (!active) return;
        const nextValues = mergeConfigValues(response);
        setValues(nextValues);
        setSavedValues(nextValues);
        setErrors({});
      })
      .catch((caught) => {
        if (!active) return;
        setLoadError(caught instanceof Error ? caught.message : labels.loadFailed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [labels.loadFailed]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateConfigValues(values, labels);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const payload = {
        configs: configDefinitions.map((item) => ({
          key: item.key,
          value: normalizeNumberString(values[item.key]),
        })),
      };
      await adminConfigApi.update(payload);
      const nextSaved = payload.configs.reduce<ConfigValues>((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as ConfigValues);
      setValues(nextSaved);
      setSavedValues(nextSaved);
      toast.success(labels.saved);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : labels.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setValues(savedValues);
    setErrors({});
  };

  return (
    <section className="artistbor-admin-page w-full space-y-4">
      <AdminPageHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.description}
        actions={(
          <button
            type="button"
            onClick={() => void loadConfigs()}
            disabled={loading || saving}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-artistbor-border bg-artistbor-surface px-4 text-sm font-bold text-artistbor-secondary transition-colors duration-200 hover:border-artistbor-border-strong hover:bg-artistbor-surface-subtle hover:text-artistbor-primary disabled:cursor-not-allowed disabled:text-artistbor-muted"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {labels.refresh}
          </button>
        )}
      />

      <form
        onSubmit={submit}
        className="overflow-hidden rounded-[18px] border border-artistbor-border bg-artistbor-surface shadow-[var(--artistbor-surface-shadow)]"
      >
        <div className="border-b border-[#e6ebf2] bg-[#f8fafc] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-[#64748b] dark:text-slate-400" />
            <h2 className="text-[13px] font-black uppercase tracking-[1.2px] text-[#64748b] dark:text-slate-400">
              {labels.formTitle}
            </h2>
          </div>
        </div>

        {loadError ? (
          <div className="border-b border-[#fecaca] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {loadError}
          </div>
        ) : null}

        <div className="divide-y divide-[#edf2f7] dark:divide-white/10">
          {configDefinitions.map((item) => (
            <ConfigField
              key={item.key}
              definition={item}
              disabled={loading || saving}
              error={errors[item.key]}
              label={labels.fields[item.key].label}
              value={values[item.key]}
              onChange={(value) => {
                setValues((current) => ({ ...current, [item.key]: value }));
                setErrors((current) => ({ ...current, [item.key]: undefined }));
              }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-[#e6ebf2] px-4 py-3 dark:border-white/10 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || saving || loading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e6ebf2] bg-white px-4 text-sm font-bold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          >
            <RotateCcw className="size-4" />
            {labels.reset}
          </button>
          <button
            type="submit"
            disabled={!dirty || saving || loading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-black text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15"
          >
            <Save className="size-4" />
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </form>
    </section>
  );
}

function ConfigField({
  definition,
  disabled,
  error,
  label,
  value,
  onChange,
}: {
  definition: ConfigDefinition;
  disabled: boolean;
  error?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const Icon = definition.icon;
  const inputId = `config-${definition.key.replaceAll(".", "-")}`;

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
      <label htmlFor={inputId} className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#e6ebf2] bg-[#f8fafc] text-[#64748b] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          <Icon className="size-4" />
        </span>
        <span className="flex min-h-9 min-w-0 items-center">
          <span className="block text-[13px] font-semibold leading-[18px] text-[#0f172a] dark:text-white">{label}</span>
        </span>
      </label>
      <div>
        <div className="flex h-10 overflow-hidden rounded-xl border border-[#e6ebf2] bg-[#f8fafc] transition focus-within:border-orange-500/45 dark:border-white/10 dark:bg-white/[0.035]">
          <input
            id={inputId}
            type="number"
            inputMode={definition.inputMode}
            min={definition.min}
            max={definition.max}
            step={definition.step}
            disabled={disabled}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 text-[13px] font-bold text-[#475569] outline-none disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-200 dark:disabled:text-slate-500"
          />
          <span className="grid min-w-12 place-items-center border-l border-[#e6ebf2] px-3 text-xs font-black uppercase text-[#64748b] dark:border-white/10 dark:text-slate-400">
            {definition.unit}
          </span>
        </div>
        {error ? <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}

function buildDefaultValues(): ConfigValues {
  return configDefinitions.reduce<ConfigValues>((acc, item) => {
    acc[item.key] = item.defaultValue;
    return acc;
  }, {} as ConfigValues);
}

function mergeConfigValues(response: unknown): ConfigValues {
  const rows = extractConfigRows(response);
  const next = buildDefaultValues();

  for (const row of rows) {
    if (isConfigKey(row.key) && row.value !== undefined && row.value !== null && row.value !== "") {
      next[row.key] = String(row.value);
    }
  }

  return next;
}

function extractConfigRows(response: unknown): AdminConfigItem[] {
  if (Array.isArray(response)) return response.filter(isAdminConfigItem);
  if (isRecord(response) && Array.isArray(response.configs)) return response.configs.filter(isAdminConfigItem);
  return [];
}

function isAdminConfigItem(value: unknown): value is AdminConfigItem {
  return isRecord(value) && typeof value.key === "string" && "value" in value;
}

function isConfigKey(value: string): value is ConfigKey {
  return configDefinitions.some((item) => item.key === value);
}

function validateConfigValues(values: ConfigValues, labels: ReturnType<typeof getSettingsLabels>) {
  const errors: ConfigErrors = {};

  for (const item of configDefinitions) {
    const value = values[item.key].trim();
    const numberValue = Number(value);
    if (!value || !Number.isFinite(numberValue)) {
      errors[item.key] = labels.required;
      continue;
    }
    if (numberValue < item.min) {
      errors[item.key] = labels.minValue(item.min);
      continue;
    }
    if (item.max !== undefined && numberValue > item.max) {
      errors[item.key] = labels.maxValue(item.max);
      continue;
    }
    if (item.inputMode === "numeric" && !Number.isInteger(numberValue)) {
      errors[item.key] = labels.integerOnly;
    }
  }

  return errors;
}

function normalizeNumberString(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value.trim();
  return Number.isInteger(numberValue) ? String(numberValue) : String(numberValue);
}

function getSettingsLabels(locale: string) {
  if (locale === "ru") {
    return {
      eyebrow: "Система",
      description: "Управление авансом, сроком оплаты и комиссией платформы.",
      fields: {
        "commission.default_percent": {
          label: "Комиссия платформы",
        },
        "order.advance_deadline_minutes": {
          label: "Дедлайн аванса",
        },
        "order.advance_percent": {
          label: "Процент аванса",
        },
      },
      formTitle: "Платежные настройки",
      integerOnly: "Введите целое число",
      loadFailed: "Настройки не загрузились",
      maxValue: (value: number) => `Максимум ${value}`,
      minValue: (value: number) => `Минимум ${value}`,
      refresh: "Обновить",
      required: "Заполните поле",
      reset: "Сбросить",
      save: "Сохранить",
      saveFailed: "Настройки не сохранены",
      saved: getDashboardNotification("settingsSaved", "ru"),
      saving: "Сохранение...",
      title: "Настройки",
    };
  }

  return {
    eyebrow: "Tizim",
    description: "Avans, to'lov muddati va platforma komissiyasini boshqarish.",
    fields: {
      "commission.default_percent": {
        label: "Platforma komissiyasi",
      },
      "order.advance_deadline_minutes": {
        label: "Avans muddati",
      },
      "order.advance_percent": {
        label: "Avans foizi",
      },
    },
    formTitle: "To'lov sozlamalari",
    integerOnly: "Butun son kiriting",
    loadFailed: "Sozlamalar yuklanmadi",
    maxValue: (value: number) => `Maksimum ${value}`,
    minValue: (value: number) => `Minimum ${value}`,
    refresh: "Yangilash",
    required: "Maydonni to'ldiring",
    reset: "Qaytarish",
    save: "Saqlash",
    saveFailed: "Sozlamalar saqlanmadi",
    saved: getDashboardNotification("settingsSaved", "uz"),
    saving: "Saqlanmoqda...",
    title: "Sozlamalar",
  };
}
