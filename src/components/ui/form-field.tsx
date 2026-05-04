"use client";

import { ChangeEvent } from "react";
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
}) {
  const baseClass = cn(
    "w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:bg-slate-900 dark:text-white",
    error ? "border-rose-300" : "border-slate-200 dark:border-white/10",
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => onChange(event.target.value);

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
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
          <option value="">Tanlang</option>
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
        />
      )}
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-500">{error}</span> : null}
    </label>
  );
}

