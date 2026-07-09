"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { getToken } from "@/lib/api/client";
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
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/admin");
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(normalizePhoneForApi(phone), password);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(255,176,0,0.18),transparent_27%),radial-gradient(circle_at_52%_58%,rgba(20,35,65,0.08),transparent_36%),linear-gradient(135deg,#f9fafc_0%,#eef2f7_100%)]" />
      <div className="artistbor-login-orb absolute -right-36 top-12 h-[420px] w-[420px] rounded-full bg-[#ffb000]/18" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.03fr)_minmax(480px,0.97fr)]">
        <HeroPanel />

        <section className="relative flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <div className="artistbor-reveal w-full max-w-[520px] rounded-[2rem] bg-white/55 p-1.5 shadow-[0_34px_100px_rgba(15,23,42,0.14)] ring-1 ring-white/80">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white px-5 py-7 shadow-[inset_0_1px_1px_rgba(255,255,255,0.94),inset_0_-1px_0_rgba(15,23,42,0.04)] sm:px-8 sm:py-9">
              <div className="flex flex-col items-center text-center">
                <div className="grid size-[92px] place-items-center rounded-[28px] bg-[#fff6df] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_40px_rgba(255,176,0,0.18)] ring-1 ring-[#ffd982]/60">
                  <BrandLogo className="h-[68px] w-[120px]" />
                </div>
                <p className="mt-6 inline-flex rounded-full bg-[#fff7e6] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b87300] ring-1 ring-[#ffdc8a]/70">
                  Secure admin access
                </p>
                <h1 className="mt-4 text-[clamp(26px,3vw,36px)] font-black leading-[1.04] tracking-[-0.02em] text-[#0d1322]">
                  Boshqaruv paneliga kirish
                </h1>
                <p className="mt-3 max-w-[340px] text-sm font-medium leading-6 text-[#667085]">
                  Platforma operatsiyalari uchun himoyalangan Artistbor ish muhiti.
                </p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <label className="group flex h-14 items-center gap-3 rounded-full bg-[#f8fafc] px-4 ring-1 ring-[#dfe6f0] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-white focus-within:ring-[#ffb000]/70 focus-within:shadow-[0_16px_36px_rgba(255,176,0,0.14)]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#8b98b5] ring-1 ring-[#e5eaf2] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-focus-within:scale-105 group-focus-within:text-[#d98200]">
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

                <label className="group flex h-14 items-center gap-3 rounded-full bg-[#f8fafc] px-4 ring-1 ring-[#dfe6f0] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-white focus-within:ring-[#ffb000]/70 focus-within:shadow-[0_16px_36px_rgba(255,176,0,0.14)]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#8b98b5] ring-1 ring-[#e5eaf2] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-focus-within:scale-105 group-focus-within:text-[#d98200]">
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
                    className="grid size-9 shrink-0 place-items-center rounded-full text-[#9aa6b8] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white hover:text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#ffb000]/45"
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
                      className="size-[18px] rounded-[6px] accent-[#ffb000]"
                    />
                    <span>Qurilmani eslab qolish</span>
                  </label>
                  <button
                    type="button"
                    className="w-max cursor-pointer rounded-full px-1 py-0.5 font-bold text-[#c97900]! transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-[#925400] focus:outline-none focus:ring-2 focus:ring-[#ffb000]/35"
                  >
                    Parolni unutdingizmi?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="group mt-2 flex h-14 w-full cursor-pointer items-center justify-between rounded-full bg-[#ffb000] px-3 pl-6 text-[15px] font-black text-[#101828] shadow-[0_18px_38px_rgba(255,176,0,0.28)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#ffa600] hover:shadow-[0_22px_46px_rgba(255,176,0,0.34)] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#ffb000]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{submitting ? t("login.submitting") : "Kirish"}</span>
                  <span className="grid size-10 place-items-center rounded-full bg-[#101828]/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-[1px] group-hover:translate-x-1 group-hover:scale-105">
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_35%,rgba(255,188,28,0.32),transparent_14%),radial-gradient(circle_at_84%_18%,rgba(78,92,132,0.24),transparent_26%),linear-gradient(180deg,#071225_0%,#020713_100%)]" />
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
          <p className="mt-6 max-w-[520px] text-[15px] font-medium leading-7 text-white/66">
            Buyurtmalar, ijodkorlar va kontent oqimini bitta aniq, himoyalangan boshqaruv markazida kuzatish.
          </p>
        </div>
      </div>

      <div className="artistbor-reveal artistbor-reveal-delay-2 absolute bottom-12 right-10 z-10 w-[330px] rotate-[-2deg] rounded-[2rem] bg-white/7 p-1.5 ring-1 ring-white/12 xl:right-16">
        <div className="rounded-[calc(2rem-0.375rem)] bg-[#081120]/92 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/44">Today</span>
            <span className="rounded-full bg-[#ffb000]/16 px-3 py-1 text-xs font-black text-[#ffd45a]">Live</span>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {["Orders", "Artists", "Queue"].map((item, index) => (
              <div key={item} className="rounded-2xl bg-white/[0.055] px-3 py-3 ring-1 ring-white/8">
                <p className="text-[10px] font-semibold text-white/42">{item}</p>
                <p className="mt-2 text-xl font-black text-white">{[128, 64, 19][index]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
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
