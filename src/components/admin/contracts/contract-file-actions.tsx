"use client";

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { contractsApi } from "@/lib/api/admin-content";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ContractFileActions({
  contractId,
  contractNumber,
  disabled,
  labels,
  compact = false,
}: {
  contractId?: number;
  contractNumber?: string;
  disabled?: boolean;
  compact?: boolean;
  labels: {
    view: string;
    download: string;
    failed: string;
  };
}) {
  const [loading, setLoading] = useState<"inline" | "attachment" | null>(null);
  const toast = useToast();
  const unavailable = disabled || !contractId || Boolean(loading);

  const openFile = async (disposition: "inline" | "attachment") => {
    if (!contractId) return;
    const popup = disposition === "inline" ? window.open("", "_blank") : null;
    if (popup) popup.opener = null;
    if (disposition === "inline" && !popup) {
      toast.error(labels.failed);
      return;
    }
    setLoading(disposition);
    try {
      const { blob } = await contractsApi.download(contractId, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === "inline") {
        popup!.location.href = url;
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${sanitizeFilename(contractNumber || `contract-${contractId}`)}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      }
    } catch (caught) {
      popup?.close();
      toast.error(caught instanceof Error ? caught.message : labels.failed);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <FileButton
        compact={compact}
        disabled={unavailable}
        label={labels.view}
        icon={loading === "inline" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
        onClick={() => void openFile("inline")}
      />
      <FileButton
        compact={compact}
        disabled={unavailable}
        label={labels.download}
        icon={loading === "attachment" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        onClick={() => void openFile("attachment")}
      />
    </div>
  );
}

function FileButton({
  compact,
  disabled,
  icon,
  label,
  onClick,
}: {
  compact: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-200",
        compact ? "size-9" : "h-10 px-3 text-xs",
      )}
    >
      {icon}
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  );
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "contract";
}
