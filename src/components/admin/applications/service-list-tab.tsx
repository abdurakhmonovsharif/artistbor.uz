"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { servicesApi } from "@/lib/api/admin-content";
import type { ArtistApplication, Service } from "@/types/api";
import { cn } from "@/lib/utils";
import {
  getServiceDescription,
  getServiceName,
} from "@/components/admin/applications/application-utils";

export function ServiceListTab({ application }: { application: ArtistApplication }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryIds = useMemo(
    () => Array.from(new Set([...(application.category_ids ?? []), ...(application.sub_category_ids ?? [])])),
    [application.category_ids, application.sub_category_ids],
  );

  useEffect(() => {
    let active = true;

    const loadServices = async () => {
      if (!categoryIds.length) {
        setServices([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          categoryIds.map((categoryId) =>
            servicesApi.list({ category_id: String(categoryId), page: 1, limit: 100 }),
          ),
        );
        if (!active) return;

        const deduped = new Map<number | string, Service>();
        results
          .flatMap((result) => result.items)
          .forEach((service, index) => {
            const key = service.id ?? `${service.slug ?? "service"}-${index}`;
            deduped.set(key, service);
          });
        setServices(Array.from(deduped.values()));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Xizmatlar yuklanmadi");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadServices();

    return () => {
      active = false;
    };
  }, [categoryIds]);

  if (loading) {
    return (
      <div className="flex min-h-28 items-center justify-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <Loader2 className="size-4 animate-spin text-amber-500" />
        Xizmatlar yuklanmoqda...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50/60 p-4 text-center text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
        <AlertTriangle className="size-5" />
        {error}
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121c2b] dark:text-slate-400">
        <Inbox className="size-5 text-amber-400" />
        Xizmatlar topilmadi
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-950 dark:text-white">Xizmatlar</h4>
      <div className="space-y-3">
        {services.map((service, index) => (
          <ServiceCard key={String(service.id ?? service.slug ?? index)} service={service} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const active = Number(service.status) === 1;

  return (
    <article
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:hover:border-amber-400/30 dark:hover:bg-white/[0.03]",
        !active && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[15px] font-semibold text-slate-950 dark:text-white">
            {getServiceName(service)}
          </h4>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {getServiceDescription(service)}
          </p>
        </div>
      </div>
    </article>
  );
}
