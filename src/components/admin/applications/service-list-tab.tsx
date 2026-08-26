"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { servicesApi } from "@/lib/api/admin-content";
import type { ArtistApplication, ArtistApplicationService, Service } from "@/types/api";
import { isRecord } from "@/lib/utils";
import { formatMoneyWithCurrency } from "@/lib/money-format";
import { getSubmittedApplicationServices } from "@/lib/artist-application-details";
import { getApplicationLabels } from "@/components/admin/applications/application-labels";
import {
  getServiceDescription,
  getServiceName,
} from "@/components/admin/applications/application-utils";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function ServiceListTab({ application }: { application: ArtistApplication }) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const submittedServices = useMemo(
    () => getSubmittedApplicationServices(application),
    [application],
  );
  const [serviceCatalog, setServiceCatalog] = useState<Map<number, Service>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryIds = useMemo(
    () => Array.from(new Set([...(application.category_ids ?? []), ...(application.sub_category_ids ?? [])])),
    [application.category_ids, application.sub_category_ids],
  );

  useEffect(() => {
    let active = true;

    const loadServiceCatalog = async () => {
      if (!submittedServices.length) {
        setServiceCatalog(new Map());
        setError(null);
        return;
      }

      const unresolvedIds = submittedServices.flatMap((service) =>
        typeof service.service_id === "number" && !getEmbeddedService(service)
          ? [service.service_id]
          : [],
      );
      if (!unresolvedIds.length) {
        setServiceCatalog(new Map());
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const results = categoryIds.length
          ? await Promise.all(categoryIds.map((categoryId) =>
              servicesApi.list({ category_id: String(categoryId), page: 1, limit: 100 }),
            ))
          : [await servicesApi.list({ page: 1, limit: 100 })];
        if (!active) return;

        const requestedIds = new Set(unresolvedIds);
        const catalog = new Map<number, Service>();
        results
          .flatMap((result) => result.items)
          .forEach((service) => {
            if (typeof service.id === "number" && requestedIds.has(service.id)) {
              catalog.set(service.id, service);
            }
          });
        setServiceCatalog(catalog);
      } catch (caught) {
        if (active) {
          setServiceCatalog(new Map());
          setError(caught instanceof Error ? caught.message : getApplicationLabels(locale).servicesLoadFailed);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadServiceCatalog();

    return () => {
      active = false;
    };
  }, [categoryIds, locale, submittedServices]);

  if (!submittedServices.length) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121c2b] dark:text-slate-400">
        <Inbox className="size-5 text-amber-400" />
        {labels.servicesEmpty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-950 dark:text-white">{labels.servicesTitle}</h4>
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Loader2 className="size-3.5 animate-spin text-amber-500" />
            {labels.servicesLoading}
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}
      <div className="space-y-3">
        {submittedServices.map((submittedService, index) => (
          <ServiceCard
            key={String(submittedService.service_id ?? submittedService.id ?? index)}
            submittedService={submittedService}
            service={getEmbeddedService(submittedService) ??
              (submittedService.service_id === undefined
                ? undefined
                : serviceCatalog.get(submittedService.service_id))}
          />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({
  submittedService,
  service,
}: {
  submittedService: ArtistApplicationService;
  service?: Service;
}) {
  const { locale } = useI18n();
  const labels = getApplicationLabels(locale);
  const serviceName = service
    ? getServiceName(service, locale)
    : labels.serviceFallback;
  const price = formatMoneyWithCurrency(submittedService.price, locale);
  const note = typeof submittedService.note === "string" ? submittedService.note.trim() : "";

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.025]">
      <div className="p-4">
        <div className="min-w-0">
          <h4 className="mt-1 truncate text-[15px] font-semibold text-slate-950 dark:text-white">
            {serviceName}
          </h4>
          {service ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
              {getServiceDescription(service, locale)}
            </p>
          ) : null}
        </div>
      </div>
      <dl className="grid border-t border-slate-200 bg-slate-50 sm:grid-cols-2 dark:border-white/10 dark:bg-[#121a2a]">
        <div className="border-b border-slate-200 px-4 py-3 sm:border-b-0 sm:border-r dark:border-white/10">
          <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.servicePrice}</dt>
          <dd className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">{price || "—"}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.serviceNote}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800 dark:text-slate-200">{note || "—"}</dd>
        </div>
      </dl>
    </article>
  );
}

function getEmbeddedService(submittedService: ArtistApplicationService): Service | undefined {
  if (isRecord(submittedService.service)) return submittedService.service as Service;
  return submittedService.name_uz || submittedService.name_ru || submittedService.name_en
    ? submittedService as Service
    : undefined;
}
