"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Heart, Images, LogIn, MapPin, Search } from "lucide-react";
import { findCategory, hrefForCategory, type Category } from "@/data/categories";
import { CategoryIcon, iconTone } from "@/components/CategoryIcon";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Logo } from "@/components/Logo";
import { MarketPanel } from "@/components/home/MarketPanel";
import { SearchSuggest } from "@/components/SearchSuggest";
import { LocationOptions } from "@/components/LocationOptions";
import { SmartSearch } from "@/components/home/SmartSearch";
import { applyLocationPick, placeLabel } from "@/data/locations";
import { isPublicListing } from "@/lib/categoryCounts";
import { listingAgeLabel } from "@/lib/listingAge";
import { warmVehicleBrandSearch } from "@/data/searchVehicleBrands";
import type { Listing } from "@/data/store";

/** Home shortcuts: popular leaves first, then roots. */
const SHORTCUTS: { id: string; short?: string }[] = [
  { id: "vasita-otomobil" },
  { id: "emlak" },
  { id: "vasita-moto" },
  { id: "shopping", short: "home.quick.shop" },
  { id: "services", short: "home.quick.services" },
  { id: "parts", short: "home.quick.parts" },
  { id: "jobs", short: "home.quick.jobs" },
  { id: "machines", short: "home.quick.machines" },
  { id: "pets" },
  { id: "helpers" },
];

const GRID_MAX = 24;

function newest(a: Listing, b: Listing) {
  return (b.postedAt ?? Date.parse(b.createdAt)) - (a.postedAt ?? Date.parse(a.createdAt));
}

export function MobileHome() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, listings, hydrated, unreadNotifications } = useApp();
  const [q, setQ] = useState("");
  const [place, setPlace] = useState("");
  const [suggestOn, setSuggestOn] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const shortcuts = useMemo(
    () =>
      SHORTCUTS.map((s) => {
        const cat = findCategory(s.id);
        return cat ? { cat, label: s.short ? t(s.short) : catName(t, cat.id, cat.name) } : null;
      }).filter((x): x is { cat: Category; label: string } => Boolean(x)),
    [t],
  );

  const grid = useMemo(() => {
    const pool = listings.filter(isPublicListing).sort(newest);
    const featured = pool.filter((l) => l.featured || l.vip);
    const rest = pool.filter((l) => !l.featured && !l.vip);
    return [...featured, ...rest].slice(0, GRID_MAX);
  }, [listings]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const text = q.trim();
    if (text) params.set("q", text);
    applyLocationPick(params, place);
    (document.activeElement as HTMLElement | null)?.blur?.();
    const qs = params.toString();
    router.push(qs ? `/ara?${qs}` : "/ara");
  }

  return (
    <div className="mh">
      <header className="mh-top">
        <Logo />
        <h1 className="mh-page-title">{t("nav.vitrine")}</h1>
        <div className="mh-top-actions">
          <div className="relative">
            <button
              type="button"
              className="mh-ico-btn"
              aria-label={t("nav.notifications")}
              data-notif-toggle
              onClick={() => setNotifOpen((v) => !v)}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 ? <span className="mh-ico-dot" /> : null}
            </button>
            <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>
          {user ? (
            <Link href="/profil" className="mh-avatar" aria-label={t("nav.banaOzel")}>
              {user.avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={user.avatar} alt="" />
              ) : (
                <span>{(user.displayName || user.username || "?").slice(0, 1).toLocaleUpperCase("tr")}</span>
              )}
            </Link>
          ) : (
            <Link href="/giris" className="mh-ico-btn" aria-label={t("nav.login")}>
              <LogIn className="h-5 w-5" />
            </Link>
          )}
        </div>
      </header>

      <form className="mh-search" role="search" onSubmit={onSearch}>
        <div className="mh-search-box">
          <Search className="mh-search-ico" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onPointerDown={warmVehicleBrandSearch}
            onFocus={() => setSuggestOn(true)}
            onBlur={() => window.setTimeout(() => setSuggestOn(false), 180)}
            placeholder={t("nav.catHome.search")}
            aria-label={t("nav.catHome.search")}
            enterKeyHint="search"
            autoComplete="off"
          />
          {suggestOn ? (
            <SearchSuggest
              query={q}
              active={suggestOn}
              extraParams={place && !place.startsWith("@") ? { city: place } : undefined}
              onPick={() => setQ("")}
            />
          ) : null}
        </div>
        <div className="mh-loc-row">
          <label className="mh-loc">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <select value={place} onChange={(e) => setPlace(e.target.value)} aria-label={t("home.loc")}>
              <option value="">{t("loc.allPlaces")}</option>
              <LocationOptions countryPicks />
            </select>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          </label>
          <button type="submit" className="mh-go">
            {t("home.ara")}
          </button>
        </div>
      </form>

      <ul className="mh-cats mh-cats-scroll" aria-label={t("nav.catHome")}>
        {shortcuts.map(({ cat, label }) => (
          <li key={cat.id}>
            <Link href={hrefForCategory(cat)} className="mh-cat">
              <span className={`mh-cat-ico cat-ico ${iconTone(cat.icon)}`} aria-hidden>
                <CategoryIcon name={cat.icon} className="h-6 w-6" />
              </span>
              <span className="mh-cat-name">{label}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/kategoriler" className="mh-cat">
            <span className={`mh-cat-ico cat-ico ${iconTone("grid")}`} aria-hidden>
              <CategoryIcon name="grid" className="h-6 w-6" />
            </span>
            <span className="mh-cat-name">{t("home.seeAll")}</span>
          </Link>
        </li>
      </ul>

      <MarketPanel />

      <section className="mh-sec" aria-labelledby="mh-vitrin">
        <div className="mh-sec-head">
          <h2 id="mh-vitrin">{t("home.disc.vitrine")}</h2>
          <Link href="/ara">{t("home.seeAll")}</Link>
        </div>
        {!hydrated ? (
          <ul className="mh-grid" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="mh-card mh-card-skel" />
            ))}
          </ul>
        ) : grid.length ? (
          <ul className="mh-grid">
            {grid.map((l) => (
              <li key={l.id}>
                <HomeCard listing={l} locale={locale} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mh-empty">{t("search.none")}</p>
        )}
      </section>

      <div className="mh-smart">
        <SmartSearch variant="phone" />
      </div>
    </div>
  );
}

function HomeCard({ listing, locale }: { listing: Listing; locale: string }) {
  const { favorites, toggleFavorite } = useApp();
  const { requireAuth } = useAuthModal();
  const { formatMoney, t } = useI18n();
  const liked = favorites.includes(listing.id);
  const place = placeLabel(listing.city, listing.district, ", ");
  const photos = listing.images?.length ?? 0;
  const sold = listing.status === "sold";
  return (
    <article className="mh-card">
      <Link href={`/ilan/${listing.id}`} className="mh-card-link">
        <span className="mh-card-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.images[0]} alt="" loading="lazy" decoding="async" />
          {photos > 0 ? (
            <span className="mh-card-shots">
              <Images className="h-3 w-3" aria-hidden />
              {photos}
            </span>
          ) : null}
          {sold ? <span className="mh-card-status">{t("list.status.sold")}</span> : null}
        </span>
        <span className="mh-card-body">
          <span className="mh-card-title">{listing.title}</span>
          <span className="mh-card-price">{formatMoney(listing.price, listing.currency)}</span>
          <span className="mh-card-meta">
            {place ? (
              <span className="mh-card-place">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span>{place}</span>
              </span>
            ) : (
              <span />
            )}
            <span className="mh-card-age">{listingAgeLabel(listing, locale)}</span>
          </span>
        </span>
      </Link>
      <button
        type="button"
        className="mh-card-fav"
        aria-label={t("common.favorite")}
        aria-pressed={liked}
        onClick={() => {
          if (!requireAuth("member")) return;
          toggleFavorite(listing.id);
        }}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-lime text-lime" : ""}`} />
      </button>
    </article>
  );
}
