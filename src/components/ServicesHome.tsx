"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { findCategory, hrefForCategory } from "@/data/categories";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { useI18n } from "@/context/I18nContext";
import { servicesSearchHref } from "@/components/ServicesPortalNav";

const POPULAR = [
  {
    id: "services-reno-paint",
    title: "Boyacı",
    cover: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "services-move-home",
    title: "Evden Eve Nakliyat",
    cover: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "services-auto-wash",
    title: "Oto Temizlik",
    cover: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "services-reno-furn-sofa",
    title: "Koltuk Döşeme",
    cover: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "services-auto-tire-fix",
    title: "Lastik Tamiri",
    cover: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "services-reno-bath",
    title: "Mutfak Banyo Tadilatı",
    cover: "https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "services-reno-clean",
    title: "Temizlikçi",
    cover: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "services-auto-repair",
    title: "Oto Tamircisi",
    cover: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=700&q=80",
  },
] as const;

const HERO =
  "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1800&q=80";

export function ServicesHome() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Ankara");
  const [district, setDistrict] = useState("");
  const districts = useMemo(() => (city ? districtsOf(city) : []), [city]);

  return (
    <div className="svc-home">
      <section className="svc-home-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO} alt="" className="svc-home-hero-img" />
        <div className="svc-home-hero-veil" />
        <div className="svc-home-hero-inner">
          <h1>{t("svc.hero")}</h1>
          <p>
            {t("svc.heroSub")}
          </p>
          <form
            className="svc-home-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(servicesSearchHref(q, city, district));
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("svc.searchPh")}
              className="svc-home-q"
              aria-label={t("svc.searchPh")}
            />
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("");
              }}
              className="svc-home-sel"
              aria-label={t("post.city")}
            >
              <option value="">{t("flt.allCities")}</option>
              {TURKEY_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="svc-home-sel"
              disabled={!city}
              aria-label={t("svc.allDistricts")}
            >
              <option value="">{t("svc.allDistricts")}</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button type="submit" className="svc-home-go">
              {t("svc.search")}
            </button>
          </form>
        </div>
      </section>

      <section className="svc-home-popular">
        <h2>{t("svc.popular")}</h2>
        <div className="svc-home-grid">
          {POPULAR.map((item) => {
            const cat = findCategory(item.id);
            const href = cat ? hrefForCategory(cat) : "/kategoriler/ustalar-hizmetler";
            return (
              <Link key={item.id} href={href} className="svc-home-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.cover} alt={item.title} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
