"use client";

import { useMemo, useState } from "react";
import {
  Baby,
  Bus,
  GraduationCap,
  HeartPulse,
  MapPinned,
  Navigation,
  ShoppingBag,
  Trees,
  Users,
} from "lucide-react";
import type { Listing } from "@/data/store";
import { useI18n } from "@/context/I18nContext";
import {
  directionsUrl,
  osmEmbed,
  regionIntel,
  satelliteEmbed,
  type NearbyKind,
} from "@/lib/regionIntel";

const TABS: { id: NearbyKind; icon: typeof Bus }[] = [
  { id: "transport", icon: Bus },
  { id: "education", icon: GraduationCap },
  { id: "health", icon: HeartPulse },
  { id: "green", icon: Trees },
  { id: "shopping", icon: ShoppingBag },
];

export function ListingRegionPanel({ listing }: { listing: Listing }) {
  const { t, formatMoney } = useI18n();
  const data = useMemo(
    () => regionIntel(listing.city, listing.district, listing.id, listing.price),
    [listing.city, listing.district, listing.id, listing.price],
  );
  const [layer, setLayer] = useState<"map" | "sat">("map");
  const [heat, setHeat] = useState(false);
  const [poi, setPoi] = useState<NearbyKind>("transport");

  const src = layer === "sat" ? satelliteEmbed(data.coords.lat, data.coords.lng) : osmEmbed(data.coords.lat, data.coords.lng);
  const items = data.nearby[poi];
  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <section className="loc-panel">
      <div className="loc-map-wrap">
        <iframe
          title={t("loc.map")}
          className="loc-map"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {heat ? <div className="loc-heat" aria-hidden /> : null}
        <div className="loc-pin" aria-hidden>
          <MapPinned className="h-7 w-7" />
        </div>
        <div className="loc-map-tools">
          <button type="button" className={heat ? "is-on" : ""} onClick={() => setHeat((v) => !v)}>
            m² {t("loc.heat")}
            <span className="loc-new">{t("loc.new")}</span>
          </button>
          <a href={directionsUrl(data.coords.lat, data.coords.lng)} target="_blank" rel="noreferrer">
            <Navigation className="h-3.5 w-3.5" />
            {t("loc.dir")}
          </a>
          <div className="loc-layer">
            <button type="button" className={layer === "map" ? "is-on" : ""} onClick={() => setLayer("map")}>
              {t("loc.layer.map")}
            </button>
            <button type="button" className={layer === "sat" ? "is-on" : ""} onClick={() => setLayer("sat")}>
              {t("loc.layer.sat")}
            </button>
          </div>
        </div>
      </div>

      <div className="loc-near">
        <h3>{t("loc.near")}</h3>
        <p className="mb-2 text-xs text-muted">{t("loc.region.indicative")}</p>
        <div className="loc-near-tabs" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={poi === tab.id}
                className={poi === tab.id ? "is-on" : ""}
                onClick={() => setPoi(tab.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`loc.tab.${tab.id}`)}
              </button>
            );
          })}
        </div>
        <div className="loc-near-grid">
          {groups.map((group) => (
            <div key={group} className="loc-near-card">
              <p className="loc-near-group">{group}</p>
              <ul>
                {items
                  .filter((i) => i.group === group)
                  .map((i) => (
                    <li key={`${i.group}-${i.name}-${i.meters}`}>
                      <span>{i.name}</span>
                      <strong>{i.meters} m</strong>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="loc-near-note">{t("loc.near.note")}</p>
      </div>

      <div className="loc-demo">
        <div className="loc-demo-head">
          <h3>{t("loc.demo")}</h3>
          <p>{t("loc.demo.src", { y: data.year })}</p>
        </div>
        <p className="loc-demo-place">
          {listing.city} / {listing.district} / {data.mahalle}
        </p>
        <div className="loc-demo-grid">
          <article>
            <p>
              <Baby className="h-4 w-4" /> {t("loc.demo.age")}
            </p>
            <strong>{data.demo.age} {t("loc.years")}</strong>
          </article>
          <article>
            <p>
              <GraduationCap className="h-4 w-4" /> {t("loc.demo.uni")}
            </p>
            <strong>%{data.demo.uni}</strong>
          </article>
          <article>
            <p>
              <Users className="h-4 w-4" /> {t("loc.demo.pop")}
            </p>
            <strong>{data.demo.pop.toLocaleString("tr-TR")} {t("loc.people")}</strong>
          </article>
          <article>
            <p>
              <HeartPulse className="h-4 w-4" /> {t("loc.demo.marital")}
            </p>
            <div className="loc-bars">
              <span>
                {t("loc.married")} <b>%{data.demo.married}</b>
              </span>
              <span>
                {t("loc.single")} <b>%{data.demo.single}</b>
              </span>
              <span>
                {t("loc.other")} <b>%{data.demo.unspecified}</b>
              </span>
            </div>
          </article>
        </div>
        <p className="loc-sqm">
          {t("loc.sqmHint")}: <b>{formatMoney(data.sqm)}</b> / m²
        </p>
      </div>
    </section>
  );
}
