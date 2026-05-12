"use client";

import { ChangeEvent, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export type FormFieldOption = {
  label: string;
  value: string | number;
};

export function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  error,
  options,
  rows = 3,
  hideLabel,
  compact,
  prefixIcon,
  className,
  autoComplete,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number" | "date" | "time" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  error?: string;
  options?: FormFieldOption[];
  rows?: number;
  hideLabel?: boolean;
  compact?: boolean;
  prefixIcon?: ReactNode;
  className?: string;
  autoComplete?: string;
}) {
  const { t } = useI18n();
  const hasPrefixIcon = Boolean(prefixIcon) && type !== "select" && type !== "textarea";
  const baseClass = cn(
    "w-full border bg-white px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/50 dark:bg-slate-900 dark:text-white dark:focus:border-white/20 dark:focus:ring-white/10",
    compact ? "h-10 rounded-lg py-2.5" : "rounded-2xl py-3",
    hasPrefixIcon && "pl-10",
    error ? "border-rose-300" : "border-slate-200/90 dark:border-white/10",
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => onChange(event.target.value);

  return (
    <label className={cn("block", className)}>
      <span
        className={cn(
          "mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400",
          hideLabel && "sr-only",
        )}
      >
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <span className="relative block">
        {hasPrefixIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400">
            {prefixIcon}
          </span>
        ) : null}
        {type === "textarea" ? (
          <textarea
            className={baseClass}
            value={value}
            onChange={handleChange}
            required={required}
            placeholder={placeholder}
            rows={rows}
          />
        ) : type === "select" ? (
          <select className={baseClass} value={value} onChange={handleChange} required={required}>
            <option value="">{placeholder ?? t("common.select")}</option>
            {options?.map((option) => (
              <option key={String(option.value)} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={baseClass}
            value={value}
            onChange={handleChange}
            required={required}
            placeholder={placeholder}
            type={type}
            autoComplete={autoComplete}
          />
        )}
      </span>
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-500">{error}</span> : null}
    </label>
  );
}
