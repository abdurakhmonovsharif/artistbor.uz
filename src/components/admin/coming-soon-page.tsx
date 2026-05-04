export function ComingSoonPage({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Coming next phase
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950">
        <h2 className="text-base font-black text-slate-950 dark:text-white">
          Hali ulanmagan
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Bu bo&apos;lim hozircha tayyorlanmoqda. To&apos;liq funksiyalar keyingi
          yangilanishlarda qo&apos;shiladi.
        </p>
      </div>
    </section>
  );
}
