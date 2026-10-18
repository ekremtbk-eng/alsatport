"use client";

import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  FileText,
  Headphones,
  LayoutGrid,
  MapPin,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { SearchSuggest } from "@/components/SearchSuggest";
import { SmartSearch } from "@/components/home/SmartSearch";
import { STD_DATE_PRESETS } from "@/components/StdFilterSidebar";
import { useI18n } from "@/context/I18nContext";
import { applyLocationPick, locationPickFromParams } from "@/data/locations";
import { LocationOptions } from "@/components/LocationOptions";
import { HOME_HERO_CATEGORIES, HOME_POPULAR_SEARCHES } from "@/data/homeHubs";
import { findCategory } from "@/data/categories";
import { warmVehicleBrandSearch } from "@/data/searchVehicleBrands";

const PRICE_PRESETS = [
  { id: "", min: "", max: "" },
  { id: "0-50k", min: "0", max: "50000" },
  { id: "50-250k", min: "50000", max: "250000" },
  { id: "250-1m", min: "250000", max: "1000000" },
  { id: "1m+", min: "1000000", max: "" },
] as const;

const STATUS_PRESETS = [
  { id: "", labelKey: "flt.any" as const },
  { id: "sahibinden", labelKey: "home.search.status.owner" as const },
  { id: "galeriden", labelKey: "home.search.status.dealer" as const },
] as const;

function readUrlState() {
  if (typeof window === "undefined") {
    return { q: "", city: "", catId: "", priceId: "", posted: "", kimden: "" };
  }
  const sp = new URLSearchParams(window.location.search);
  const q = (sp.get("q") ?? "").trim();
  const city = locationPickFromParams(sp);
  const slug = (sp.get("kategori") ?? sp.get("cat") ?? "").trim();
  const path = window.location.pathname;
  const priceMin = sp.get("priceMin") ?? "";
  const priceMax = sp.get("priceMax") ?? "";
  const priceId = PRICE_PRESETS.find((p) => p.min === priceMin && p.max === priceMax)?.id ?? "";
  const posted = sp.get("posted") ?? "";
  const kimden = (sp.get("kimden") ?? "").toLocaleLowerCase("tr");
  const statusId = STATUS_PRESETS.some((s) => s.id && s.id === kimden) ? kimden : "";
  if (path.startsWith("/is-ilanlari")) {
    return { q, city, catId: "jobs", priceId, posted, kimden: statusId };
  }
  if (path.startsWith("/ustalar-hizmetler")) {
    return { q, city, catId: "services", priceId, posted, kimden: statusId };
  }
  const cat = slug ? findCategory(slug) : undefined;
  return {
    q,
    city,
    catId: cat?.id ?? "",
    priceId,
    posted,
    kimden: statusId,
  };
}

export function HomeHero() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const initial = readUrlState();
  const detailedId = useId();
  const [tab, setTab] = useState<"quick" | "detailed">("quick");
  const [q, setQ] = useState(initial.q);
  const [city, setCity] = useState(initial.city);
  const [catId, setCatId] = useState(initial.catId);
  const [priceId, setPriceId] = useState(initial.priceId);
  const [posted, setPosted] = useState(initial.posted);
  const [kimden, setKimden] = useState(initial.kimden);
  const [suggestOn, setSuggestOn] = useState(false);
  const detailedOpen = tab === "detailed";

  useEffect(() => {
    const next = readUrlState();
    setQ(next.q);
    setCity(next.city);
    setCatId(next.catId);
    setPriceId(next.priceId);
    setPosted(next.posted);
    setKimden(next.kimden);
  }, [pathname]);

  function goSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    applyLocationPick(params, city);
    const price = PRICE_PRESETS.find((p) => p.id === priceId);
    if (price?.min) params.set("priceMin", price.min);
    if (price?.max) params.set("priceMax", price.max);
    if (posted) params.set("posted", posted);
    if (kimden) params.set("kimden", kimden === "sahibinden" ? "Sahibinden" : "Galeriden");
    if (catId === "jobs") {
      router.push(params.toString() ? `/is-ilanlari?${params}` : "/is-ilanlari");
      return;
    }
    if (catId === "services") {
      router.push(params.toString() ? `/ustalar-hizmetler?${params}` : "/ustalar-hizmetler");
      return;
    }
    if (catId) {
      const cat = findCategory(catId);
      if (cat) params.set("kategori", cat.slug);
    }
    const qs = params.toString();
    router.push(qs ? `/ara?${qs}` : "/ara");
  }

  return (
    <section className="hp-hero">
      <div className="hp-hero-inner">
        <div className="hp-hero-top">
          <div className="hp-hero-copy">
            <p className="hp-hero-kicker">{t("auth.gate.platform")}</p>
            <h1 className="hp-hero-title">
              <span className="hp-hero-title-a">{t("home.h1a")}</span>
              <span className="hp-hero-title-b">{t("home.h1b")}</span>
            </h1>
            <p className="hp-hero-sub">{t("home.hero.lead")}</p>
          </div>
          <ul className="hp-hero-trust">
            <li>
              <FileText className="h-5 w-5" aria-hidden />
              <span>
                <b>{t("home.trust.pay")}</b>
                <small>{t("home.trust.pay.s")}</small>
              </span>
            </li>
            <li>
              <ShieldCheck className="h-5 w-5" aria-hidden />
              <span>
                <b>{t("home.trust.ver")}</b>
                <small>{t("home.trust.ver.s")}</small>
              </span>
            </li>
            <li>
              <MapPin className="h-5 w-5" aria-hidden />
              <span>
                <b>{t("home.why.tr")}</b>
                <small>{t("home.why.p5")}</small>
              </span>
            </li>
            <li>
              <Headphones className="h-5 w-5" aria-hidden />
              <span>
                <b>{t("home.trust.sup")}</b>
                <small>{t("home.trust.sup.s")}</small>
              </span>
            </li>
          </ul>
        </div>
        <SmartSearch />

        <div className="hp-search-panel">
          <div className="hp-search-tabs" role="tablist" aria-label={t("home.search.tabs")}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "quick"}
              className={tab === "quick" ? "is-on" : ""}
              onClick={() => setTab("quick")}
            >
              <Search className="h-4 w-4" aria-hidden />
              {t("home.search.quick")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "detailed"}
              aria-controls={detailedId}
              className={tab === "detailed" ? "is-on" : ""}
              onClick={() => setTab((cur) => (cur === "detailed" ? "quick" : "detailed"))}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {t("home.search.detailed")}
            </button>
          </div>

          <form className="hp-hero-search" onSubmit={goSearch}>
            <label className="hp-hero-cat">
              <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sr-only">{t("nav.categories")}</span>
              <select value={catId} onChange={(e) => setCatId(e.target.value)}>
                {HOME_HERO_CATEGORIES.map((c) => (
                  <option key={c.id || "all"} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="hp-hero-q">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onPointerDown={warmVehicleBrandSearch}
                onFocus={() => setSuggestOn(true)}
                onBlur={() => window.setTimeout(() => setSuggestOn(false), 180)}
                placeholder={t("home.hero.ph")}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={q.trim().length > 1 && suggestOn}
              />
              <SearchSuggest
                query={q}
                active={suggestOn}
                extraParams={{
                  ...(city && !city.startsWith("@") ? { city } : {}),
                  ...(catId && catId !== "jobs" && catId !== "services"
                    ? { kategori: findCategory(catId)?.slug ?? "" }
                    : {}),
                }}
                onPick={() => setQ("")}
              />
            </div>
            <label className="hp-hero-city">
              <MapPin className="h-4 w-4" aria-hidden />
              <select value={city} onChange={(e) => setCity(e.target.value)} aria-label={t("loc.country")}>
                <option value="">{t("loc.allPlaces")}</option>
                <LocationOptions countryPicks />
              </select>
            </label>
            <button type="submit" className="hp-hero-go">
              <Search className="h-4 w-4" aria-hidden />
              {t("home.ara")}
            </button>
          </form>

          <div
            id={detailedId}
            className={`hp-search-detailed ${detailedOpen ? "is-open" : ""}`}
            hidden={!detailedOpen}
            aria-hidden={!detailedOpen}
          >
            <label className="hp-search-field">
              <Banknote className="h-4 w-4" aria-hidden />
              <span>{t("flt.price")}</span>
              <select
                value={priceId}
                onChange={(e) => setPriceId(e.target.value)}
                aria-label={t("flt.price")}
              >
                <option value="">{t("flt.any")}</option>
                <option value="0-50k">{t("home.search.price.0_50")}</option>
                <option value="50-250k">{t("home.search.price.50_250")}</option>
                <option value="250-1m">{t("home.search.price.250_1m")}</option>
                <option value="1m+">{t("home.search.price.1m")}</option>
              </select>
            </label>
            <label className="hp-search-field">
              <FileText className="h-4 w-4" aria-hidden />
              <span>{t("home.search.status")}</span>
              <select
                value={kimden}
                onChange={(e) => setKimden(e.target.value)}
                aria-label={t("home.search.status")}
              >
                {STATUS_PRESETS.map((s) => (
                  <option key={s.id || "any"} value={s.id}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="hp-search-field">
              <CalendarDays className="h-4 w-4" aria-hidden />
              <span>{t("flt.posted")}</span>
              <select
                value={posted}
                onChange={(e) => setPosted(e.target.value)}
                aria-label={t("flt.posted")}
              >
                {STD_DATE_PRESETS.map((p) => (
                  <option key={p.id || "any"} value={p.id}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/ara?filtre=1" className="hp-search-more">
              <Settings2 className="h-4 w-4" aria-hidden />
              {t("flt.moreBtn")}
            </Link>
          </div>
        </div>

        {HOME_POPULAR_SEARCHES.length ? (
          <p className="hp-hero-pops">
            <span>{t("home.popular.searches")}:</span>
            {HOME_POPULAR_SEARCHES.map((item) => (
              <Link key={item.id} href={item.href}>
                {item.label}
              </Link>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
