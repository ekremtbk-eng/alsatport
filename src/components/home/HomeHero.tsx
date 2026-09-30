"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { findCategory, hrefForCategory } from "@/data/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SearchSuggest } from "@/components/SearchSuggest";
import { LiveVisitorsBadge } from "@/components/home/LiveVisitorsBadge";
import { useI18n } from "@/context/I18nContext";

const HERO_SCENES = [
  {
    src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    className: "is-car",
  },
  {
    src: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
    className: "is-home",
  },
  {
    src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
    className: "is-shop",
  },
  {
    src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    className: "is-living",
  },
] as const;

const QUICK = [
  { catId: "emlak", labelKey: "home.quick.sale", icon: "home" },
  { catId: "emlak", labelKey: "home.quick.rent", icon: "key" },
  { catId: "vasita", labelKey: "home.quick.auto", icon: "car" },
  { catId: "shopping", labelKey: "home.quick.shop", icon: "bag" },
  { catId: "parts", labelKey: "home.quick.parts", icon: "cog" },
  { catId: "jobs", labelKey: "home.quick.jobs", icon: "briefcase" },
  { catId: "machines", labelKey: "home.quick.machines", icon: "truck" },
  { catId: "services", labelKey: "home.quick.services", icon: "hammer" },
] as const;

const DISCOVER = [
  { href: "/ara?filter=picks", labelKey: "home.disc.drop" },
  { href: "/kategoriler/emlak", labelKey: "home.disc.invest" },
  { href: "/son-48-saat", labelKey: "home.disc.fast", fresh: true },
  { href: "/acil", labelKey: "home.disc.urgent", urgent: true },
] as const;

export function HomeHero() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <div className="home-hero-wrap">
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden>
          <div className="home-hero-mosaic">
            {HERO_SCENES.map((scene) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={scene.className} className={scene.className} src={scene.src} alt="" />
            ))}
          </div>
          <div className="home-hero-veil" />
        </div>
        <LiveVisitorsBadge />
        <div className="home-hero-inner">
          <p className="home-hero-tag">{t("home.tag")}</p>
          <h1 className="home-hero-title">
            {t("home.h1a")} <span>{t("home.h1b")}</span>
          </h1>
          <p className="home-hero-sub">{t("home.hero.sub")}</p>

          <form
            className="home-hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/ara?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.search")}
              className="home-hero-input rounded-2xl shadow-2xl"
              autoComplete="off"
            />
            <button type="submit" className="home-hero-go">
              {t("common.search")}
            </button>
            <SearchSuggest query={q} onPick={() => setQ("")} />
          </form>
        </div>
      </section>

      <div className="home-hero-dock">
        <div className="home-quick">
          {QUICK.map((item) => {
            const cat = findCategory(item.catId);
            const href = cat ? hrefForCategory(cat) : "/kategoriler";
            return (
              <Link key={item.labelKey} href={href} className="home-quick-card">
                <span className="home-quick-icon">
                  <CategoryIcon name={item.icon} className="h-6 w-6" />
                </span>
                <span className="home-quick-label">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>

        <div className="home-discover">
          {DISCOVER.map((item) => (
            <Link
              key={item.labelKey}
              href={item.href}
              className={`home-discover-pill ${"urgent" in item && item.urgent ? "is-urgent" : ""} ${"fresh" in item && item.fresh ? "is-fresh" : ""}`}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
