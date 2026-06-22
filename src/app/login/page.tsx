"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { getToken } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
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
      await login(phone, password);
      toast.success(t("login.success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("login.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-black p-0 sm:p-4 lg:p-[26px_50px_10px_15px]">
      <div className="grid h-full overflow-hidden bg-white lg:grid-cols-[47.8%_52.2%]">
        <HeroPanel />

        <section className="relative flex h-full items-center justify-center bg-[#fbfbfc] px-5 py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_50%,rgba(15,23,42,0.055),transparent_34%),radial-gradient(circle_at_50%_50%,rgba(2,6,23,0.045),transparent_56%)]" />
          <div className="relative w-full max-w-[460px] rounded-[8px] border border-slate-200/80 bg-white/88 px-8 py-9 shadow-[0_21px_45px_rgba(15,23,42,0.11)] backdrop-blur sm:px-[31px] sm:py-[38px]">
            <div className="flex flex-col items-center">
              <BrandLogo className="h-[86px] w-[150px]" />
            </div>

            <div className="h-[20px]" />
            <h1 className="text-center text-[24px] font-medium leading-none text-[#090d17]">
              Boshqaruv paneliga kirish
            </h1>

            <form onSubmit={submit} className="mt-[34px] space-y-[17px]">
              <label className="flex h-[52px] items-center gap-[18px] rounded-[6px] border border-[#d8dee9] bg-white px-[16px] transition focus-within:border-[#ffb000] focus-within:ring-4 focus-within:ring-[#ffb000]/10">
                <Phone className="size-[19px] shrink-0 text-[#8b98b5]" strokeWidth={1.8} />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  type="tel"
                  autoComplete="username"
                  placeholder="+998 XX XXX XX XX"
                  className="h-full w-full bg-transparent text-[14px] font-medium text-[#111827] outline-none placeholder:text-[#8b98b5]"
                />
              </label>

              <label className="flex h-[52px] items-center gap-[18px] rounded-[6px] border border-[#d8dee9] bg-white px-[16px] transition focus-within:border-[#ffb000] focus-within:ring-4 focus-within:ring-[#ffb000]/10">
                <LockKeyhole className="size-[19px] shrink-0 text-[#8b98b5]" strokeWidth={1.8} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-full w-full bg-transparent text-[14px] font-medium text-[#111827] outline-none"
                />
                <button
                  type="button"
                  className="grid size-8 shrink-0 place-items-center text-[#8b98b5] transition hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#ffb000]/45"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff className="size-[19px]" strokeWidth={1.8} />
                  ) : (
                    <Eye className="size-[19px]" strokeWidth={1.8} />
                  )}
                </button>
              </label>

              <div className="flex items-center justify-between gap-4 pt-[5px] text-[12px] font-medium">
                <label className="flex cursor-pointer items-center gap-[8px] text-[#1f2937]">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(event) => setRememberDevice(event.target.checked)}
                    className="size-[18px] rounded-[4px] border border-[#c7d0df] accent-[#ffb000]"
                  />
                  <span>Qurilmani eslab qolish</span>
                </label>
                <button
                  type="button"
                  className="shrink-0 cursor-pointer text-[#ff9f00] transition hover:text-[#d88900] focus:outline-none focus:ring-2 focus:ring-[#ffb000]/35"
                >
                  Parolni unutdingizmi?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-[5px] flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[7px] bg-[#ffb000] px-5 text-[14px] font-medium text-[#111827] shadow-[0_14px_24px_rgba(255,176,0,0.2)] transition hover:bg-[#ffa600] focus:outline-none focus:ring-4 focus:ring-[#ffb000]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex-1 text-center">
                  {submitting ? t("login.submitting") : "Kirish"}
                </span>
                <ArrowRight className="size-[19px]" strokeWidth={1.9} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroPanel() {
  return (
    <section className="relative hidden h-full overflow-hidden bg-[#030b1c] px-[52px] py-[60px] text-white lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_41%,rgba(255,188,28,0.34),transparent_13%),radial-gradient(circle_at_32%_47%,rgba(255,188,28,0.14),transparent_25%),radial-gradient(circle_at_72%_45%,rgba(16,42,91,0.25),transparent_36%),linear-gradient(180deg,#071025_0%,#020817_100%)]" />
      <div className="absolute -left-[190px] -top-[450px] h-[820px] w-[820px] rounded-full border border-[#ffb000]/55" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.12)_47%,transparent_48%),radial-gradient(circle_at_15%_35%,rgba(255,255,255,0.18)_0_1px,transparent_1px)] [background-size:100%_100%,34px_34px]" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center gap-[12px]">
          <DarkBrandMark className="size-[52px]" />
          <p className="text-[17px] font-black uppercase leading-none text-white">
            ARTISTBOR
          </p>
        </div>

        <div className="pb-[72px]">
          <h2 className="text-[51px] font-black leading-[1.16]">
            <span className="block text-white">Artistbor</span>
            <span className="block text-[#ffd45a]">boshqaruv paneli</span>
          </h2>
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
