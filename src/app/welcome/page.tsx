"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/context/I18nContext";

export default function WelcomePage() {
  const { t } = useI18n();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1600&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-bg/88 to-bg" />
      <div className="pointer-events-none absolute inset-x-0 bottom-24 h-40 bg-gradient-to-t from-lime/10 to-transparent" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-end px-6 pb-40 text-center md:pb-12">
        <div className="mb-auto mt-24">
          <Logo />
        </div>
        <h1 className="text-4xl font-extrabold text-ink">
          Al<span className="text-lime">Sat</span>Port
        </h1>
        <p className="mt-1 font-semibold text-ink">{t("home.tag")}</p>
        <p className="mt-6 text-soft">{t("welcome.p")}</p>
        <Link href="/" className="btn-primary mt-10 h-14 w-full max-w-sm text-lg">
          {t("welcome.start")}
        </Link>
        <Link href="/giris" className="mt-4 text-sm font-semibold text-blue">
          {t("nav.login")}
        </Link>
      </div>
    </div>
  );
}
