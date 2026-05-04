"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { getToken } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/admin/theme-toggle";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/admin");
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(phone, password);
      toast.success("Tizimga muvaffaqiyatli kirildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login bajarilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-100 p-4 dark:bg-[#070a12] lg:grid-cols-[1fr_460px]">
      <section className="relative hidden overflow-hidden rounded-[34px] bg-slate-950 p-10 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,190,42,0.20),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-400 text-lg font-black text-slate-950">
              A
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em]">Artistbor</p>
              <p className="text-xs font-semibold text-white/50">Admin dashboard</p>
            </div>
          </div>
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">
              Secure access
            </p>
            <h1 className="mt-5 text-5xl font-black leading-tight">
              Artistbor boshqaruv paneli
            </h1>
            <p className="mt-5 text-base leading-7 text-white/65">
              Platforma resurslarini xavfsiz boshqarish uchun administrator
              kirish oynasi.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-white/60">
            <ShieldCheck className="size-5 text-amber-300" />
            Bearer token authorization
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center rounded-[34px] bg-white px-5 py-10 shadow-2xl shadow-slate-950/10 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-400 text-sm font-black text-slate-950">
                A
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-950 dark:text-white">
                  Artistbor
                </p>
                <p className="text-xs font-semibold text-slate-400">Administrator</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Kirish</h2>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Admin telefon raqami va parolni kiriting.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Telefon
              </span>
              <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/10 dark:border-white/10 dark:bg-white/[0.03]">
                <Phone className="size-4 text-slate-400" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  placeholder="+998..."
                  className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Parol
              </span>
              <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/10 dark:border-white/10 dark:bg-white/[0.03]">
                <LockKeyhole className="size-4 text-slate-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-xl shadow-amber-400/25 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Tekshirilmoqda..." : "Kirish"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
