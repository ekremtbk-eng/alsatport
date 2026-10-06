"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Flame, MapPin, ShieldCheck } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { HomeHero } from "@/components/home/HomeHero";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { HOME_FEATURED_TABS, HOME_HUBS, HOME_MAIN_HUBS } from "@/data/homeHubs";
import { findCategory, listingMatchesCategory } from "@/data/categories";
import { isPublicListing } from "@/lib/categoryCounts";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HomeDesktopLayout } from "@/components/home/HomeDesktopLayout";
import { MobileCategoryHome } from "@/components/home/MobileCategoryHome";

function listingInHomeTab(listing: { categoryId: string }, tabId: string) {
  if (!tabId) return true;
  const cat = findCategory(tabId);
  if (cat && listingMatchesCategory(listing, cat)) return true;
  return listing.categoryId === tabId || listing.categoryId.startsWith(`${tabId}-`);
}

const CITY_ORDER = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Kocaeli", "Konya", "Mersin"];

export function HomeLanding() {
  const { listings, hydrated } = useApp();
  const { t } = useI18n();
  const [featTab, setFeatTab] = useState("");
  const publicListings = listings.filter(isPublicListing);
  const cityCounts = CITY_ORDER.map((name) => ({
    name,
    n: publicListings.filter((l) => l.city === name).length,
  }));

  const featuredPool = useMemo(() => {
    const scoped = publicListings.filter((l) => listingInHomeTab(l, featTab));
    const picked = scoped.filter((l) => l.featured || l.vip);
    return (picked.length ? picked : scoped).slice(0, 5);
  }, [featTab, publicListings]);

  const deskHome = (
    <HomeDesktopLayout>
      <HomeHero />

      <div className="hp-wrap">
        <section className="hp-cats-panel" aria-labelledby="hp-main-cats">
          <div className="hp-section-head hp-cats-head">
            <h2 id="hp-main-cats">{t("home.mainCats")}</h2>
            <Link href="/kategoriler">{t("home.seeAll")} →</Link>
          </div>
          <nav className="hp-hubs" aria-label={t("nav.categories")}>
            {HOME_MAIN_HUBS.map((hub) => (
              <Link key={hub.id} href={hub.href} className="hp-hub">
                <span className="hp-hub-ico">
                  <CategoryIcon name={hub.icon} className="h-5 w-5" />
                </span>
                <span className="hp-hub-name">{hub.label}</span>
              </Link>
            ))}
          </nav>
        </section>

        <ul className="hp-trust-mobile">
          <li>
            <FileText className="h-4 w-4" aria-hidden />
            {t("home.trust.pay")}
          </li>
          <li>
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("home.trust.ver")}
          </li>
          <li>
            <MapPin className="h-4 w-4" aria-hidden />
            {t("home.why.tr")}
          </li>
        </ul>

        <section className="hp-featured">
          <div className="hp-section-head hp-feat-head">
            <h2>
              <Flame className="h-5 w-5 text-lime" />
              {t("home.featured")}
            </h2>
            <nav className="hp-feat-tabs" aria-label={t("home.featured")}>
              <button type="button" className={!featTab ? "is-on" : ""} onClick={() => setFeatTab("")}>
                {t("home.tab.all")}
              </button>
              {HOME_FEATURED_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={featTab === tab.id ? "is-on" : ""}
                  onClick={() => setFeatTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <Link
              href={
                featTab === "jobs"
                  ? "/is-ilanlari"
                  : featTab
                    ? `/ara?kategori=${encodeURIComponent(findCategory(featTab)?.slug ?? featTab)}`
                    : "/ara"
              }
            >
              {t("home.seeAll")} →
            </Link>
          </div>
          {!hydrated ? (
            <div className="hp-featured-grid">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="hp-card hp-card-skel" aria-hidden />
              ))}
            </div>
          ) : featuredPool.length ? (
            <div className="hp-featured-grid">
              {featuredPool.map((listing) => (
                <ListingCard key={listing.id} listing={listing} variant="home" />
              ))}
            </div>
          ) : (
            <p className="hp-empty">{t("search.none")}</p>
          )}
        </section>

        <section className="hp-pop-mobile" aria-labelledby="hp-pop-cats">
          <div className="hp-section-head">
            <h2 id="hp-pop-cats">{t("home.popular.cats")}</h2>
            <Link href="/kategoriler">{t("home.seeAll")} →</Link>
          </div>
          <nav className="hp-pop-row">
            {HOME_HUBS.filter((h) => h.id !== "more").slice(0, 4).map((hub) => (
              <Link key={hub.id} href={hub.href} className="hp-pop">
                <span className="hp-hub-ico">
                  <CategoryIcon name={hub.icon} className="h-5 w-5" />
                </span>
                {hub.label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="hp-cities">
          <div className="hp-section-head">
            <h2>
              <MapPin className="h-5 w-5" />
              {t("home.cities.title")}
            </h2>
            <Link href="/ara">{t("home.cities.all")} →</Link>
          </div>
          <div className="hp-city-grid">
            {cityCounts.map((c) => (
              <Link key={c.name} href={`/ara?city=${encodeURIComponent(c.name)}`} className="hp-city">
                <strong>{c.name}</strong>
                <span>{hydrated ? c.n.toLocaleString("tr-TR") : "…"}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </HomeDesktopLayout>
  );

  return (
    <div className="hp">
      <div className="home-phone-only">
        <MobileCategoryHome />
      </div>
      <div className="home-desk-only">{deskHome}</div>
    </div>
  );
}
