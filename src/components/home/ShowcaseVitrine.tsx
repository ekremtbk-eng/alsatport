"use client";

import Link from "next/link";
import type { Listing } from "@/data/store";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { useI18n } from "@/context/I18nContext";

export function ShowcaseVitrine({ listings }: { listings: Listing[] }) {
  const { t } = useI18n();
  const cards = listings.slice(0, 8);
  if (!cards.length) return null;
  return (
    <section className="home-block vitrine-lux">
      <div className="home-block-head">
        <h2>{t("home.vitrine")}</h2>
        <Link href="/kategoriler">{t("home.vitrine.all")}</Link>
      </div>
      <ListingGrid>
        {cards.map((l) => (
          <ListingCard key={l.id} listing={l} compact />
        ))}
      </ListingGrid>
    </section>
  );
}
