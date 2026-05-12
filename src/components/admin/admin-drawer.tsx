"use client";

import { Drawer } from "antd";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminDrawer({
  children,
  className,
  footer,
  onClose,
  open = true,
  size = "min(100vw, 520px)",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  onClose: () => void;
  open?: boolean;
  size?: string;
  title: React.ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={size}
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName={cn("artistbor-application-drawer", className)}
      classNames={{
        body: "artistbor-application-drawer-body",
        footer: "artistbor-application-drawer-footer",
        header: "artistbor-application-drawer-header",
        title: "artistbor-application-drawer-title",
      }}
      title={<span className="truncate text-lg font-bold text-slate-950 dark:text-white">{title}</span>}
      footer={footer}
      styles={{
        body: { padding: 0, overflow: "auto" },
        footer: { padding: "12px 16px" },
        header: { minHeight: 64, padding: "0 16px" },
        mask: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
        section: { boxShadow: "none" },
      }}
    >
      {children}
    </Drawer>
  );
}
