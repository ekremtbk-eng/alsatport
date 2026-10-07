"use client";

import Link from "next/link";
import { FileText, Headphones, MapPin, Search, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchSuggest } from "@/components/SearchSuggest";
import { SmartSearch } from "@/components/home/SmartSearch";
import { useI18n } from "@/context/I18nContext";
import { TURKEY_CITIES } from "@/data/turkey";
import { HOME_HERO_CATEGORIES, HOME_POPULAR_SEARCHES } from "@/data/homeHubs";
import { findCategory } from "@/data/categories";

function readUrlState() {
  if (typeof window === "undefined") return { q: "", city: "", catId: "" };
  const sp = new URLSearchParams(window.location.search);
  const q = (sp.get("q") ?? "").trim();
  const city = (sp.get("city") ?? "").trim();
  const slug = (sp.get("kategori") ?? sp.get("cat") ?? "").trim();
  const path = window.location.pathname;
  if (path.startsWith("/is-ilanlari")) return { q, city, catId: "jobs" };
  if (path.startsWith("/ustalar-hizmetler")) return { q, city, catId: "services" };
  const cat = slug ? findCategory(slug) : undefined;
  return { q, city, catId: cat?.id ?? "" };
}

export function HomeHero() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const initial = readUrlState();
  const [q, setQ] = useState(initial.q);
  const [city, setCity] = useState(initial.city);
  const [catId, setCatId] = useState(initial.catId);
  const [suggestOn, setSuggestOn] = useState(false);

  useEffect(() => {
    const next = readUrlState();
    setQ(next.q);
    setCity(next.city);
    setCatId(next.catId);
  }, [pathname]);

  function goSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
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
        <form className="hp-hero-search" onSubmit={goSearch}>
          <label className="hp-hero-cat">
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
                ...(city ? { city } : {}),
                ...(catId && catId !== "jobs" && catId !== "services"
                  ? { kategori: findCategory(catId)?.slug ?? "" }
                  : {}),
              }}
              onPick={() => setQ("")}
            />
          </div>
          <label className="hp-hero-city">
            <MapPin className="h-4 w-4" aria-hidden />
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">{t("acil.turkey")}</option>
              {TURKEY_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="hp-hero-go">
            <Search className="h-4 w-4" aria-hidden />
            {t("home.ara")}
          </button>
        </form>
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
