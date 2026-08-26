import {
  applicationStatusLabel,
  type ApplicationStatusKey,
} from "@/components/admin/applications/application-utils";
import { StatusTabRail } from "@/components/admin/status-tab-rail";
import { useI18n } from "@/lib/i18n/i18n-provider";

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
  const { locale } = useI18n();
  const items = tabs.map((tab) => ({
    key: tab,
    label: applicationStatusLabel(tab, locale),
    count: counts[tab as Exclude<ApplicationStatusKey, "unknown">] ?? 0,
    countClassName: statusCountClass(tab),
  }));

  return (
    <StatusTabRail
      items={items}
      activeKey={active}
      ariaLabel={locale === "ru" ? "Статусы заявок" : "Ariza holatlari"}
      previousLabel={locale === "ru" ? "Предыдущие статусы" : "Oldingi holatlar"}
      nextLabel={locale === "ru" ? "Следующие статусы" : "Keyingi holatlar"}
      onChange={onChange}
    />
  );
}

function statusCountClass(status: ApplicationStatusKey) {
  if (status === "pending") return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  if (status === "approved") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";
  if (status === "rejected") return "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
}
