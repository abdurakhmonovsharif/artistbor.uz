"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { translations } from "@/lib/i18n/translations";
import { formatPhone, normalizePhoneForApi } from "@/lib/phone-format";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const [phone, setPhone] = useState("+998 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();
  const toast = useToast();

  useEffect(() => {
    window.localStorage.removeItem("artistbor_admin_token");
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(normalizePhoneForApi(phone), password, rememberDevice);
      toast.success(translations.uz["login.success"]);
    } catch {
      toast.error(translations.uz["login.failed"]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="artistbor-login-shell relative min-h-[100dvh] overflow-hidden bg-[#f4f6fb] text-[#0d1322]">
      <style>{`
        .artistbor-login-shell {
          font-feature-settings: "cv02", "cv03", "cv04", "ss01";
          text-rendering: geometricPrecision;
        }

        .artistbor-login-shell svg {
          stroke-width: 1.45;
        }

        @keyframes artistbor-login-fade-up {
          from {
            opacity: 0;
            transform: translate3d(0, 28px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes artistbor-login-orb-pulse {
          0%,
          100% {
            opacity: 0.54;
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            opacity: 0.78;
            transform: translate3d(10px, -8px, 0) scale(1.04);
          }
        }

        .artistbor-reveal {
          animation: artistbor-login-fade-up 900ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }

        .artistbor-reveal-delay-2 {
          animation-delay: 170ms;
        }

        .artistbor-login-orb {
          animation: artistbor-login-orb-pulse 12s cubic-bezier(0.18, 0.86, 0.3, 1) infinite;
        }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(255,176,0,0.12),transparent_28%),radial-gradient(circle_at_52%_58%,rgba(20,35,65,0.06),transparent_36%),linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)]" />
      <div className="artistbor-login-orb absolute -right-36 top-12 h-[420px] w-[420px] rounded-full bg-[#ffb000]/12" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.03fr)_minmax(480px,0.97fr)]">
        <HeroPanel />

        <section className="relative flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <div className="artistbor-reveal w-full max-w-[500px] rounded-xl bg-white/55 p-1.5 shadow-[0_26px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.06]">
            <div className="rounded-xl bg-white/95 px-5 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-8 sm:py-8">
              <div className="flex flex-col items-center text-center">
                <div className="grid h-[86px] w-[112px] place-items-center rounded-xl bg-[#fff4e5] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_30px_rgba(255,176,0,0.13)] ring-1 ring-[#ffcf73]/50">
                  <BrandLogo className="h-[68px] w-[104px]" />
                </div>
                <h1 className="mt-6 text-[clamp(26px,3vw,36px)] font-black leading-[1.04] tracking-[-0.02em] text-[#0d1322]">
                  Boshqaruv paneliga kirish
                </h1>
                <p className="mt-3 max-w-[340px] text-sm font-medium leading-6 text-[#667085]">
                  Platforma operatsiyalari uchun himoyalangan Artistbor ish muhiti.
                </p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <label className="group flex h-12 items-center gap-3 rounded-xl bg-[#f8fafc] px-3.5 ring-1 ring-[#e6ebf2] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-white focus-within:ring-[#ffcf73] focus-within:shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-[#8b98b5] ring-1 ring-[#e6ebf2] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-focus-within:-translate-y-[1px] group-focus-within:text-[#d97706]">
                    <Phone className="size-[18px]" />
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    required
                    type="tel"
                    autoComplete="username"
                    placeholder="+998 XX XXX XX XX"
                    className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#101828]! outline-none placeholder:text-[#9aa6b8]"
                  />
                </label>

                <label className="group flex h-12 items-center gap-3 rounded-xl bg-[#f8fafc] px-3.5 ring-1 ring-[#e6ebf2] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-white focus-within:ring-[#ffcf73] focus-within:shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-[#8b98b5] ring-1 ring-[#e6ebf2] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-focus-within:-translate-y-[1px] group-focus-within:text-[#d97706]">
                    <LockKeyhole className="size-[18px]" />
                  </span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#101828]! outline-none placeholder:text-[#9aa6b8]"
                  />
                  <button
                    type="button"
                    className="grid size-8 shrink-0 place-items-center rounded-xl text-[#9aa6b8] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white hover:text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#ffb000]/45"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </label>

                <div className="flex flex-col gap-3 pt-1 text-[12px] font-semibold text-[#344054] sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                      className="size-[18px] rounded-xl accent-[#ffb000]"
                    />
                    <span className="select-none">Qurilmani eslab qolish</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="group mt-2 flex h-12 w-full cursor-pointer items-center justify-between rounded-xl bg-[#ffb000] px-2.5 pl-5 text-[15px] font-black text-[#101828] shadow-[0_14px_30px_rgba(255,176,0,0.22)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] hover:bg-[#ffa600] hover:shadow-[0_18px_34px_rgba(255,176,0,0.28)] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#ffb000]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{submitting ? t("login.submitting") : "Kirish"}</span>
                  <span className="grid size-9 place-items-center rounded-xl bg-[#101828]/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-[1px] group-hover:translate-x-1 group-hover:scale-105">
                    <ArrowRight className="size-[18px]" />
                  </span>
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroPanel() {
  return (
    <section className="relative hidden min-h-[100dvh] overflow-hidden bg-[#030813] px-12 py-12 text-white lg:block xl:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_35%,rgba(255,188,28,0.24),transparent_14%),radial-gradient(circle_at_84%_18%,rgba(78,92,132,0.18),transparent_26%),linear-gradient(180deg,#071225_0%,#020713_100%)]" />
      <div className="absolute -left-[240px] -top-[430px] h-[820px] w-[820px] rounded-full ring-1 ring-[#ffb000]/45" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.12)_47%,transparent_48%),radial-gradient(circle_at_15%_35%,rgba(255,255,255,0.18)_0_1px,transparent_1px)] [background-size:100%_100%,34px_34px]" />

      <div className="artistbor-reveal relative z-10 flex min-h-[calc(100dvh-6rem)] flex-col justify-between">
        <div className="flex items-center gap-3">
          <DarkBrandMark className="size-[54px]" />
          <div>
            <p className="text-[17px] font-black uppercase leading-none tracking-[0.08em] text-white">
              ARTISTBOR
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffce54]">
              Control suite
            </p>
          </div>
        </div>

        <div className="max-w-[660px] pb-10">
          <p className="inline-flex rounded-full bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffd45a] ring-1 ring-white/10">
            Operational command
          </p>
          <h2 className="mt-7 text-[clamp(54px,5.5vw,92px)] font-black leading-[0.92] tracking-[-0.05em]">
            Artistbor
            <span className="block text-[#ffd45a]">admin studio.</span>
          </h2>
        </div>
      </div>

      <div className="artistbor-reveal artistbor-reveal-delay-2 absolute bottom-12 right-10 z-10 h-px w-[34%] bg-gradient-to-r from-transparent via-[#ffce54]/45 to-transparent xl:right-16" />
    </section>
  );
}

function DarkBrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/artistbor-mark-dark.webp"
      alt="Artistbor"
      className={`rounded-[8px] object-cover ${className ?? ""}`}
      width={430}
      height={430}
      decoding="async"
    />
  );
}

function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/artistbor-logo.webp"
      alt="Artistbor"
      className={`object-contain ${className ?? ""}`}
      width={760}
      height={495}
      decoding="async"
    />
  );
}
