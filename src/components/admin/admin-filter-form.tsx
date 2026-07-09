"use client";

import { FormEvent, useState } from "react";
import { Button } from "antd";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

export const adminFilterShellClass = "artistbor-table-filter-shell";
export const adminFilterPanelClass = "artistbor-table-filter-panel";
export const adminFilterControlClass = "artistbor-table-filter-control admin-filter-control";
export const adminFilterActionClass = "admin-filter-action artistbor-filter-reset artistbor-table-filter-control";

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
      className={cn(adminFilterShellClass, "flex flex-col")}
    >
      <div
        className={cn(
          adminFilterPanelClass,
          "grid gap-3",
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
    <div className={cn(adminFilterShellClass, "flex flex-col")}>
      <div
        className={cn(
          adminFilterPanelClass,
          "grid gap-3",
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
