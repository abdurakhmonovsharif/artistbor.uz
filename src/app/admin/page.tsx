export default function AdminHome() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
          Artistbor
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          Boshqaruv paneli
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
          Foydalanuvchilar, artistlar, buyurtmalar va platforma sozlamalarini
          bitta paneldan boshqaring.
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-950/[0.04] dark:border-white/10 dark:bg-slate-950">
        <h2 className="text-base font-black text-slate-950 dark:text-white">
          Keyingi bosqich
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Chap menyu orqali kerakli bo&apos;limga o&apos;ting. Asosiy ish jarayonlari
          ro&apos;yxat, filter va amallar bilan alohida sahifalarda joylashgan.
        </p>
      </div>
    </section>
  );
}
