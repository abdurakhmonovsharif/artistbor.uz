import { cn } from "@/lib/utils";
import {
  applicationStatusLabel,
  type ApplicationStatusKey,
} from "@/components/admin/applications/application-utils";

const tabs: ApplicationStatusKey[] = ["all", "pending", "approved", "rejected"];

export function ApplicationStatusTabs({
  active,
  counts,
  onChange,
}: {
  active: ApplicationStatusKey;
  counts: Record<Exclude<ApplicationStatusKey, "unknown">, number>;
  onChange: (status: ApplicationStatusKey) => void;
}) {
  return (
    <div className="border-b border-slate-200 dark:border-white/10">
      <div className="flex gap-7 overflow-x-auto">
        {tabs.map((tab) => {
          const selected = tab === active;
          const count = counts[tab as Exclude<ApplicationStatusKey, "unknown">] ?? 0;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={cn(
                "relative inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold transition",
                selected
                  ? "text-blue-600 dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              <span>{applicationStatusLabel(tab)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  selected
                    ? "bg-blue-50 text-blue-600 dark:bg-amber-400/10 dark:text-amber-300"
                    : statusCountClass(tab),
                )}
              >
                {count}
              </span>
              {selected ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-amber-400" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function statusCountClass(status: ApplicationStatusKey) {
  if (status === "pending") return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  if (status === "approved") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";
  if (status === "rejected") return "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
}
