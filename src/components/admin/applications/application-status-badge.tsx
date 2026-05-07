import type { ArtistApplication } from "@/types/api";
import { cn } from "@/lib/utils";
import {
  applicationStatusKey,
  applicationStatusLabel,
  type ApplicationStatusKey,
} from "@/components/admin/applications/application-utils";

export function ApplicationStatusBadge({
  application,
  status,
}: {
  application?: ArtistApplication;
  status?: ApplicationStatusKey;
}) {
  const key = status ?? (application ? applicationStatusKey(application) : "unknown");
  const tone = statusTone(key);

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold",
        tone.className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dotClassName)} />
      {applicationStatusLabel(key)}
    </span>
  );
}

function statusTone(status: ApplicationStatusKey) {
  if (status === "approved") {
    return {
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
      dotClassName: "bg-emerald-500",
    };
  }
  if (status === "rejected") {
    return {
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
      dotClassName: "bg-rose-500",
    };
  }
  if (status === "pending") {
    return {
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
      dotClassName: "bg-amber-500",
    };
  }
  return {
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
    dotClassName: "bg-slate-400",
  };
}
