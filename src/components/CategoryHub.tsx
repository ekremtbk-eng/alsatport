"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  catalogCount,
  findCategory,
  formatListingCount,
  hrefForCategory,
  hrefForCategoryListings,
  listingMatchesCategory,
  parentOf,
  relatedCategories,
  visibleChildren,
  type Category,
} from "@/data/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HomePromoBanner } from "@/components/home/HomePromoBanner";
import { liveCount, isPublicListing } from "@/lib/categoryCounts";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { ServicesHome } from "@/components/ServicesHome";
import { StdFilterSidebar } from "@/components/StdFilterSidebar";
import { listingMatchesDynamicFilters } from "@/lib/categoryFilters";
import { isSeaEquipCategoryId } from "@/data/seaEquip";

function HubCount({ cat }: { cat: Category }) {
  const { categoryCounts } = useApp();
  const live = liveCount(categoryCounts, cat);
  const n = live > 0 ? live : catalogCount(cat);
  return <span className="text-[11px] tabular-nums text-muted">({formatListingCount(n)})</span>;
}

function HubNavLink({ cat }: { cat: Category }) {
  const { t } = useI18n();
  return (
    <Link href={hrefForCategory(cat)}>
      {catName(t, cat.id, cat.name)}
      <HubCount cat={cat} />
    </Link>
  );
}

function hubCopyKeys(cat: Category) {
  if (cat.id === "services-move") {
    return { popular: "cat.hub.movePopular", dir: "cat.hub.moveDir", lead: "cat.hub.moveLead", seo: "cat.hub.moveSeo" };
  }
  if (cat.id === "services-auto") {
    return { popular: "cat.hub.autoPopular", dir: "cat.hub.autoDir", lead: "cat.hub.autoLead", seo: "cat.hub.autoSeo" };
  }
  if (cat.id === "services-repair") {
    return { popular: "cat.hub.repairPopular", dir: "cat.hub.repairDir", lead: "cat.hub.repairLead", seo: "cat.hub.repairSeo" };
  }
  if (cat.id === "services-event") {
    return { popular: "cat.hub.eventPopular", dir: "cat.hub.eventDir", lead: "cat.hub.eventLead", seo: "cat.hub.eventSeo" };
  }
  if (cat.id === "services-other") {
    return { popular: "cat.hub.otherPopular", dir: "cat.hub.otherDir", lead: "cat.hub.otherLead", seo: "cat.hub.otherSeo" };
  }
  return { popular: "cat.hub.renoPopular", dir: "cat.hub.renoDir", lead: "cat.hub.renoLead", seo: "cat.hub.seo" };
}

const EVENT_FEATURED_IDS = [
  "services-event-dance",
  "services-event-wedding",
  "services-event-photo",
  "services-event-music",
  "services-event-party",
  "services-event-party-venue",
  "services-event-catering",
  "services-event-av",
];

function featuredHubCards(cat: Category, kids: Category[]) {
  if (cat.id === "services-event") {
    return EVENT_FEATURED_IDS.map((id) => findCategory(id)).filter((c): c is Category => Boolean(c));
  }
  return kids.filter((c) => c.hubFeatured);
}

function ServiceHubShowcase({ cat, kids }: { cat: Category; kids: Category[] }) {
  const { t } = useI18n();
  const featured = featuredHubCards(cat, kids);
  const copy = hubCopyKeys(cat);
  return (
    <div className="reno-hub">
      <div className="reno-dir-head">
        <h2>{t(copy.popular)}</h2>
      </div>
      <div className="reno-cards">
        {featured.map((ch) => (
          <Link key={ch.id} href={hrefForCategory(ch)} className="reno-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ch.cover} alt={catName(t, ch.id, ch.name)} />
            <span>{catName(t, ch.id, ch.name)}</span>
          </Link>
        ))}
      </div>
      <div className="reno-dir-head">
        <h2>{t(copy.dir)}</h2>
        <p>{t(copy.lead)}</p>
      </div>
      <div className="reno-dir">
        {kids.map((ch) => {
          const nested = visibleChildren(ch);
          return (
            <div key={ch.id} className="reno-dir-col">
              <Link href={hrefForCategory(ch)} className="reno-dir-title">
                {catName(t, ch.id, ch.name)} <HubCount cat={ch} />
              </Link>
              {nested.length ? (
                <p className="reno-dir-kids">
                  {nested.map((n, i) => (
                    <span key={n.id}>
                      {i ? ", " : ""}
                      <Link href={hrefForCategory(n)}>{catName(t, n.id, n.name)}</Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryHub({ cat }: { cat: Category }) {
  const { t, locale, formatMoney } = useI18n();
  const { listings } = useApp();
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [posted, setPosted] = useState("");
  const [mappedOnly, setMappedOnly] = useState(false);
  const [draft, setDraft] = useState("");
  const [word, setWord] = useState("");
  const [includeDesc, setIncludeDesc] = useState(false);
  const [more, setMore] = useState(false);
  const parent = parentOf(cat);
  const kids = visibleChildren(cat);
  const related = relatedCategories(cat);
  const name = catName(t, cat.id, cat.name);
  const pool = useMemo(
    () => listings.filter((l) => isPublicListing(l) && listingMatchesCategory(l, cat)),
    [listings, cat],
  );
  const vitrine = useMemo(() => {
    return pool.filter((l) =>
      listingMatchesDynamicFilters(
        l,
        {
          city,
          district,
          posted,
          mappedOnly: mappedOnly ? "1" : "",
          keyword: word,
          includeDesc: includeDesc ? "1" : "",
        },
        [],
      ),
    );
  }, [pool, city, district, posted, mappedOnly, word, includeDesc]);
  const updated = new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const showcase = cat.id === "services-event" || kids.some((c) => c.hubFeatured);
  const classifiedHub = isSeaEquipCategoryId(cat.id) && cat.id === "parts-sea";
  if (cat.id === "services") return <ServicesHome />;

  return (
    <div className="hub-page">
      <BreadcrumbNav
        items={[
          { href: "/", label: t("nav.home") },
          { href: "/kategoriler", label: t("nav.categories") },
          ...(parent ? [{ href: hrefForCategory(parent), label: catName(t, parent.id, parent.name) }] : []),
          { label: name },
        ]}
      />

      <div className={`hub-layout ${showcase ? "is-showcase" : ""} ${classifiedHub ? "is-classified" : ""}`}>
        {showcase ? null : (
        <aside className="acil-side hub-aside">
          <h1 className="hub-title">{name}</h1>
          <ul className="acil-cats" aria-label={name}>
            {kids.map((ch) => (
              <li key={ch.id}>
                <HubNavLink cat={ch} />
              </li>
            ))}
          </ul>
          <StdFilterSidebar
            city={city}
            district={district}
            posted={posted}
            mappedOnly={mappedOnly}
            draft={draft}
            includeDesc={includeDesc}
            more={more}
            radioName={`hub-date-${cat.id}`}
            onCity={setCity}
            onDistrict={setDistrict}
            onPosted={setPosted}
            onMappedOnly={setMappedOnly}
            onDraft={setDraft}
            onIncludeDesc={setIncludeDesc}
            onMore={() => setMore((v) => !v)}
            onSearch={() => setWord(draft.trim())}
          />
          <Link href={hrefForCategoryListings(cat)} className="hub-all-cats">
            {t("cat.hub.allCats", { name })}
          </Link>
          {related.length ? (
            <div className="hub-related">
              <p className="hub-related-label">{t("cat.hub.related")}</p>
              <ul className="acil-cats">
                {related.map((ch) => (
                  <li key={ch.id}>
                    <HubNavLink cat={ch} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
        )}

        <div className="hub-main">
          {showcase ? (
            <ServiceHubShowcase cat={cat} kids={kids} />
          ) : (
            <>
          <div className="hub-mobile-cards">
            {kids.map((ch) => (
              <Link key={ch.id} href={hrefForCategory(ch)} className="hub-box">
                <span className="icon-tile grid h-10 w-10 place-items-center rounded-xl text-lime">
                  <CategoryIcon name={ch.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{catName(t, ch.id, ch.name)}</span>
                  <HubCount cat={ch} />
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>

          <div className="hub-vitrine-head">
            <h2>{t("acil.found", { n: formatListingCount(vitrine.length) })}</h2>
            <Link href={hrefForCategoryListings(cat)}>{t("cat.hub.allVitrine")}</Link>
          </div>
          {vitrine.length ? (
            <div className="hub-vitrine">
              {vitrine.map((l) => (
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
          ) : (
            <p className="acil-empty">{t("cat.empty")}</p>
          )}
          {classifiedHub ? null : (
          <div className="hub-promo">
            <HomePromoBanner />
          </div>
          )}
            </>
          )}
        </div>
        {classifiedHub ? (
          <aside className="hub-rail" aria-label="Reklam">
            <div className="hub-rail-card">
              <p className="hub-rail-kicker">{t("hub.banner.sea.h")}</p>
              <p className="hub-rail-copy">{t("hub.banner.sea.p")}</p>
              <p className="hub-rail-price">14.900 TL</p>
              <Link href="/ustalar-hizmetler" className="btn-primary mt-3 h-10 w-full justify-center text-sm">
                {t("hub.banner.sea.cta")}
              </Link>
            </div>
          </aside>
        ) : null}
      </div>

      <article className={`hub-seo ${showcase ? "is-scroll" : ""}`}>
        <h2>{t("cat.hub.about", { name })}</h2>
        <p>{t(hubCopyKeys(cat).seo, { name })}</p>
        <p className="hub-updated">{t("cat.hub.updated", { date: updated })}</p>
      </article>
    </div>
  );
}

export function currentCategoryFromLocation(path: string, kat?: string | null) {
  const slug = path.startsWith("/kategoriler/")
    ? decodeURIComponent(path.split("/").pop() || "")
    : (kat ?? "");
  return slug ? findCategory(slug) : undefined;
}
