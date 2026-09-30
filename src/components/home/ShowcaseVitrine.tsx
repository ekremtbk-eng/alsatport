"use client";

import Link from "next/link";
import type { Listing } from "@/data/store";
import { useI18n } from "@/context/I18nContext";

export function ShowcaseVitrine({ listings }: { listings: Listing[] }) {
  const { t, formatMoney } = useI18n();
  return (
    <section className="home-block">
      <div className="home-block-head">
        <h2>{t("home.vitrine")}</h2>
        <Link href="/kategoriler">{t("home.vitrine.all")}</Link>
      </div>
      <div className="vitrine-grid">
        {listings.map((l) => (
          <Link key={l.id} href={`/ilan/${l.id}`} className="vitrine-cell" title={l.title}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.images[0]} alt={l.title} />
            <span className="vitrine-cap">
              <span className="truncate">{l.title}</span>
              <span className="vitrine-price">{formatMoney(l.price)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
