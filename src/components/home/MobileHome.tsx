"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, ChevronRight, Heart, LogIn, MapPin, Search } from "lucide-react";
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
import { warmVehicleBrandSearch } from "@/data/searchVehicleBrands";
import type { Listing } from "@/data/store";

/** Home shortcuts: popular leaves first, then the remaining roots. `short` swaps long root names for the nav label. */
const SHORTCUTS: { id: string; short?: string }[] = [
  { id: "vasita-otomobil" },
  { id: "emlak" },
  { id: "shopping-phone", short: "home.quick.phone" },
  { id: "shopping-fashion" },
  { id: "parts", short: "home.quick.parts" },
  { id: "jobs", short: "home.quick.jobs" },
  { id: "services", short: "home.quick.services" },
  { id: "pets" },
  { id: "vasita", short: "home.quick.auto" },
  { id: "shopping", short: "home.quick.shop" },
  { id: "shopping-computer" },
  { id: "machines", short: "home.quick.machines" },
  { id: "tutors" },
  { id: "helpers" },
];

const RAIL_MAX = 10;
const RECENT_MAX = 6;

function newest(a: Listing, b: Listing) {
  return (b.postedAt ?? Date.parse(b.createdAt)) - (a.postedAt ?? Date.parse(a.createdAt));
}

export function MobileHome() {
  const { t } = useI18n();
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

  const { rail, recent } = useMemo(() => {
    const pool = listings.filter(isPublicListing).sort(newest);
    const picked = pool.filter((l) => l.featured || l.vip);
    const railList = (picked.length ? picked : pool).slice(0, RAIL_MAX);
    const shown = new Set(railList.map((l) => l.id));
    return { rail: railList, recent: pool.filter((l) => !shown.has(l.id)).slice(0, RECENT_MAX) };
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
            <Link href="/profil" className="mh-avatar" aria-label={t("nav.profile")}>
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
            placeholder={t("home.hero.ph")}
            aria-label={t("home.hero.ph")}
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

      <MarketPanel />

      <section className="mh-sec" aria-labelledby="mh-cats">
        <div className="mh-sec-head">
          <h2 id="mh-cats">{t("nav.catHome")}</h2>
          <Link href="/kategoriler">
            {t("home.seeAll")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="mh-cats">
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
        </ul>
      </section>

      <section className="mh-sec" aria-labelledby="mh-vitrin">
        <div className="mh-sec-head">
          <h2 id="mh-vitrin">{t("home.disc.vitrine")}</h2>
          <Link href="/ara">
            {t("home.seeAll")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {!hydrated ? (
          <ul className="mh-rail" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="mh-card mh-card-skel" />
            ))}
          </ul>
        ) : rail.length ? (
          <ul className="mh-rail">
            {rail.map((l) => (
              <li key={l.id}>
                <HomeCard listing={l} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mh-empty">{t("search.none")}</p>
        )}
      </section>

      {recent.length ? (
        <section className="mh-sec" aria-labelledby="mh-recent">
          <div className="mh-sec-head">
            <h2 id="mh-recent">{t("home.recent")}</h2>
            <Link href="/ara">
              {t("home.seeAll")}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ul className="mh-grid">
            {recent.map((l) => (
              <li key={l.id}>
                <HomeCard listing={l} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mh-smart">
        <SmartSearch variant="phone" />
      </div>
    </div>
  );
}

function HomeCard({ listing }: { listing: Listing }) {
  const { favorites, toggleFavorite } = useApp();
  const { requireAuth } = useAuthModal();
  const { formatMoney, t } = useI18n();
  const liked = favorites.includes(listing.id);
  const place = placeLabel(listing.city, listing.district, ", ");
  return (
    <article className="mh-card">
      <Link href={`/ilan/${listing.id}`} className="mh-card-link">
        <span className="mh-card-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.images[0]} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="mh-card-body">
          <span className="mh-card-title">{listing.title}</span>
          <span className="mh-card-price">{formatMoney(listing.price, listing.currency)}</span>
          {place ? (
            <span className="mh-card-place">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span>{place}</span>
            </span>
          ) : null}
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
