"use client";

import { FormEvent, useState } from "react";
import { Button } from "antd";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

export const adminFilterControlClass = "admin-filter-control";
export const adminFilterActionClass = "admin-filter-action";

export function AdminFilterForm({
  children,
  gridClassName,
  mobileLabel = "Open filters",
  onSubmit,
}: {
  children: React.ReactNode;
  gridClassName?: string;
  mobileLabel?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]"
    >
      <div
        className={cn(
          "grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111827]",
          !mobileOpen && "admin-filter-collapsed",
          gridClassName,
        )}
      >
        {children}
        <div className="md:hidden">
          <Button
            htmlType="button"
            className="h-10"
            icon={<ListFilter className="size-4" />}
            aria-expanded={mobileOpen}
            aria-label={mobileLabel}
            onClick={() => setMobileOpen((current) => !current)}
          />
        </div>
      </div>
    </form>
  );
}

export function AdminFilterCard({
  children,
  gridClassName,
  mobileLabel = "Open filters",
}: {
  children: React.ReactNode;
  gridClassName?: string;
  mobileLabel?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]">
      <div
        className={cn(
          "grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111827]",
          !mobileOpen && "admin-filter-collapsed",
          gridClassName,
        )}
      >
        {children}
        <div className="md:hidden">
          <Button
            htmlType="button"
            className="h-10"
            icon={<ListFilter className="size-4" />}
            aria-expanded={mobileOpen}
            aria-label={mobileLabel}
            onClick={() => setMobileOpen((current) => !current)}
          />
        </div>
      </div>
    </div>
  );
}
