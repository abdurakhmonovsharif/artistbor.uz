"use client";

import { ChangeEvent, type ReactNode, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Select } from "antd";
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
  inputMode,
  suffix,
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
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  suffix?: ReactNode;
  autoComplete?: string;
  disabled?: boolean;
  onFocus?: () => void;
  maxLength?: number;
  showCount?: boolean;
}) {
  const { t } = useI18n();
  const errorId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const hasPrefixIcon = Boolean(prefixIcon) && type !== "select" && type !== "textarea";
  const isPassword = type === "password";
  const hasSuffix = Boolean(suffix) && type !== "select" && type !== "textarea" && !isPassword;
  const isCompactTextarea = compact && type === "textarea";
  const textLength = typeof value === "string" ? value.length : String(value).length;
  const baseClass = cn(
    "w-full border bg-artistbor-surface-subtle px-3 text-[13px] font-semibold text-artistbor-primary shadow-none outline-none transition-colors duration-200 placeholder:text-artistbor-muted focus:border-artistbor-focus focus:ring-0",
    !isCompactTextarea ? "artistbor-table-filter-control h-10 rounded-xl py-0 leading-[40px]" : null,
    isCompactTextarea
      ? cn("min-h-[112px] rounded-xl py-3", showCount && maxLength ? "pb-10 pr-16" : null)
      : compact
        ? "rounded-xl"
        : "rounded-xl",
    hasPrefixIcon && "pl-10",
    isPassword && "pr-11",
    hasSuffix && "pr-16",
    error ? "border-rose-300" : "border-artistbor-border",
    "disabled:cursor-not-allowed disabled:bg-artistbor-surface-subtle disabled:text-artistbor-muted",
    inputClassName,
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => onChange(event.target.value);

  return (
    <label className={cn("block", className)}>
      <span
        className={cn(
          "mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-artistbor-secondary",
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
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
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
          <Select
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
            className={cn("artistbor-form-select", inputClassName)}
            value={value === "" ? undefined : String(value)}
            onChange={(nextValue) => onChange(nextValue === undefined || nextValue === null ? "" : String(nextValue))}
            options={options?.map((option) => ({ label: option.label, value: String(option.value) }))}
            placeholder={placeholder ?? t("common.select")}
            status={error ? "error" : undefined}
            disabled={disabled}
            onFocus={onFocus}
          />
        ) : (
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
            className={baseClass}
            value={value}
            onChange={handleChange}
            required={required}
            placeholder={placeholder}
            type={isPassword && showPassword ? "text" : type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            maxLength={maxLength}
            disabled={disabled}
            onFocus={onFocus}
          />
        )}
        {hasSuffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
            {suffix}
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
            aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </span>
      {error ? (
        <span id={errorId} role="alert" className="mt-1 block text-xs font-semibold text-rose-500">
          {error}
        </span>
      ) : null}
    </label>
  );
}
