"use client";

import { ChangeEvent, type ReactNode, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
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
  inputClassName,
  selectIconClassName,
  autoComplete,
  disabled,
  onFocus,
  maxLength,
  showCount,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "tel" | "password" | "number" | "date" | "time" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  error?: string;
  options?: FormFieldOption[];
  rows?: number;
  hideLabel?: boolean;
  compact?: boolean;
  prefixIcon?: ReactNode;
  className?: string;
  inputClassName?: string;
  selectIconClassName?: string;
  autoComplete?: string;
  disabled?: boolean;
  onFocus?: () => void;
  maxLength?: number;
  showCount?: boolean;
}) {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const hasPrefixIcon = Boolean(prefixIcon) && type !== "select" && type !== "textarea";
  const isPassword = type === "password";
  const isCompactTextarea = compact && type === "textarea";
  const textLength = typeof value === "string" ? value.length : String(value).length;
  const baseClass = cn(
    "w-full border bg-white px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/50 dark:bg-slate-900 dark:text-white dark:focus:border-white/20 dark:focus:ring-white/10",
    compact && !isCompactTextarea ? "artistbor-table-filter-control h-10 rounded-xl py-2.5" : null,
    isCompactTextarea
      ? cn("min-h-[112px] rounded-xl py-3", showCount && maxLength ? "pb-10 pr-16" : null)
      : compact
        ? "rounded-xl py-3"
        : "rounded-2xl py-3",
    hasPrefixIcon && "pl-10",
    isPassword && "pr-11",
    error ? "border-rose-300" : "border-slate-200/90 dark:border-white/10",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500",
    inputClassName,
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
            maxLength={maxLength}
            disabled={disabled}
            onFocus={onFocus}
          />
        ) : type === "select" ? (
          <select className={baseClass} value={value} onChange={handleChange} required={required} disabled={disabled} onFocus={onFocus}>
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
            type={isPassword && showPassword ? "text" : type}
            autoComplete={autoComplete}
            disabled={disabled}
            onFocus={onFocus}
          />
        )}
        {type === "select" && selectIconClassName ? (
          <span className={cn("pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2", selectIconClassName)}>
            <ChevronDown className="size-4" />
          </span>
        ) : null}
        {type === "textarea" && showCount && maxLength ? (
          <span className="pointer-events-none absolute bottom-3 right-3 z-10 text-xs font-semibold text-slate-400 dark:text-slate-500">
            {textLength}/{maxLength}
          </span>
        ) : null}
        {isPassword ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </span>
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-500">{error}</span> : null}
    </label>
  );
}
