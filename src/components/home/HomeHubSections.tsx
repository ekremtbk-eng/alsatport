"use client";

import Link from "next/link";
import { categories, hrefForCategory, listingMatchesCategory, type Category } from "@/data/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { catName, useI18n } from "@/context/I18nContext";
import type { Listing } from "@/data/store";

function HubRow({
  title,
  href,
  cats,
  listings,
}: {
  title: string;
  href: string;
  cats: Category[];
  listings: Listing[];
}) {
  const { t } = useI18n();
  const thumbs = listings.slice(0, 6);
  return (
    <section className="home-block">
      <div className="home-block-head">
        <h2>{title}</h2>
        <Link href={href}>{t("home.seeAll")}</Link>
      </div>
      <div className="hub-chips">
        {cats.slice(0, 8).map((c) => (
          <Link key={c.id} href={hrefForCategory(c)} className="hub-chip">
            <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
            {catName(t, c.id, c.name)}
          </Link>
        ))}
      </div>
      {thumbs.length > 0 ? (
        <div className="hub-thumbs">
          {thumbs.map((l) => (
            <Link key={l.id} href={`/ilan/${l.id}`} className="hub-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.images[0]} alt={l.title} />
              <span className="truncate">{l.title}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function HomeHubSections({ listings }: { listings: Listing[] }) {
  const { t } = useI18n();
  const vasita = categories.find((c) => c.id === "vasita");
  const emlak = categories.find((c) => c.id === "emlak");
  const shop = categories.find((c) => c.id === "shopping");
  return (
    <>
      {vasita ? (
        <HubRow
          title={t("home.hub.oto")}
          href={hrefForCategory(vasita)}
          cats={vasita.children ?? []}
          listings={listings.filter((l) => listingMatchesCategory(l, vasita))}
        />
      ) : null}
      {emlak ? (
        <HubRow
          title={t("home.hub.emlak")}
          href={hrefForCategory(emlak)}
          cats={emlak.children ?? []}
          listings={listings.filter((l) => listingMatchesCategory(l, emlak))}
        />
      ) : null}
      {shop ? (
        <HubRow
          title={t("home.hub.shop")}
          href={hrefForCategory(shop)}
          cats={shop.children ?? []}
          listings={listings.filter((l) => listingMatchesCategory(l, shop))}
        />
      ) : null}
    </>
  );
}
