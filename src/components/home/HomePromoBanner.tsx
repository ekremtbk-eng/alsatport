"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/context/I18nContext";

export function HomePromoBanner() {
  const { t } = useI18n();
  return (
    <section className="home-banner">
      <div className="home-banner-copy">
        <div className="mb-2 flex items-center gap-2">
          <Logo compact />
          <span className="text-lg font-extrabold">
            Al<span className="text-lime">Sat</span>Port
          </span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink">{t("home.tag")}</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight text-ink md:text-3xl">
          {t("home.h1a")} <span className="grad-text">{t("home.h1b")}</span>
        </h1>
        <p className="mt-2 max-w-md text-sm text-soft">{t("home.sub")}</p>
        <Link href="/kategoriler" className="btn-primary mt-4 h-10 px-4 text-sm">
          {t("home.cta")}
        </Link>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="home-banner-media"
        src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80"
        alt=""
      />
    </section>
  );
}
