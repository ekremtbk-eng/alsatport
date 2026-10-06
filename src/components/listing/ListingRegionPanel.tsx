"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bus,
  GraduationCap,
  HeartPulse,
  MapPinned,
  Navigation,
  ShoppingBag,
  Trees,
} from "lucide-react";
import type { Listing } from "@/data/store";
import { useI18n } from "@/context/I18nContext";
import { useConsent } from "@/context/CookieContext";
import { directionsUrl, osmEmbed, satelliteEmbed } from "@/lib/regionIntel";
import {
  NEARBY_KINDS,
  formatDistance,
  loadNearby,
  loadRegionCoords,
  regionVersion,
  type NearbyItem,
  type NearbyKind,
  type RegionCoords,
} from "@/lib/regionClient";

const TABS: { id: NearbyKind; icon: typeof Bus }[] = [
  { id: "transport", icon: Bus },
  { id: "education", icon: GraduationCap },
  { id: "health", icon: HeartPulse },
  { id: "green", icon: Trees },
  { id: "shopping", icon: ShoppingBag },
];

export function ListingRegionPanel({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const [layer, setLayer] = useState<"map" | "sat">("map");
  const [poi, setPoi] = useState<NearbyKind>("transport");
  const [coords, setCoords] = useState<RegionCoords | undefined>(undefined);
  const [coordsLoading, setCoordsLoading] = useState(true);
  const [nearby, setNearby] = useState<Partial<Record<NearbyKind, NearbyItem[]>>>({});
  const functionalOk = useConsent("functional");
  const [mapOptIn, setMapOptIn] = useState(false);
  const showMap = functionalOk || mapOptIn;
  const poiRef = useRef(poi);
  poiRef.current = poi;

  const version = regionVersion(listing);

  useEffect(() => {
    let alive = true;
    setCoordsLoading(true);
    setCoords(undefined);
    setNearby({});
    void loadRegionCoords(listing).then((c) => {
      if (!alive) return;
      setCoords(c ?? null);
      setCoordsLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  useEffect(() => {
    if (!coords) return;
    let alive = true;
    void (async () => {
      const order = [poiRef.current, ...NEARBY_KINDS.filter((k) => k !== poiRef.current)];
      for (const kind of order) {
        if (!alive) return;
        const rows = await loadNearby(listing, kind);
        if (!alive) return;
        setNearby((prev) => ({ ...prev, [kind]: rows ?? [] }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, version]);

  useEffect(() => {
    if (!coords || nearby[poi]) return;
    let alive = true;
    void loadNearby(listing, poi).then((rows) => {
      if (alive) setNearby((prev) => ({ ...prev, [poi]: rows ?? [] }));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poi, coords, version]);

  const loading = coordsLoading || (!!coords && nearby[poi] === undefined);
  const items = nearby[poi] ?? [];
  const groups = [...new Set(items.map((i) => i.group))];
  const src = coords
    ? layer === "sat"
      ? satelliteEmbed(coords.lat, coords.lng)
      : osmEmbed(coords.lat, coords.lng)
    : "";
  const placeBits = [listing.city, listing.district, listing.neighborhood].filter(Boolean);

  return (
    <section className="loc-panel">
      <div className="loc-map-wrap">
        {coords && src && showMap ? (
          <iframe
            title={t("loc.map")}
            className="loc-map"
            src={src}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : coords && src ? (
          <div className="loc-map-empty loc-map-consent">
            <p>{t(layer === "sat" ? "loc.map.consentSat" : "loc.map.consent")}</p>
            <button type="button" className="btn-primary h-9 px-4 text-xs" onClick={() => setMapOptIn(true)}>
              {t("loc.map.load")}
            </button>
          </div>
        ) : (
          <p className="loc-map-empty">{coordsLoading ? t("loc.near.loading") : t("loc.map.empty")}</p>
        )}
        {coords ? (
          <div className="loc-pin" aria-hidden>
            <MapPinned className="h-7 w-7" />
          </div>
        ) : null}
        <div className="loc-map-tools">
          {coords ? (
            <a href={directionsUrl(coords.lat, coords.lng)} target="_blank" rel="noreferrer">
              <Navigation className="h-3.5 w-3.5" />
              {t("loc.dir")}
            </a>
          ) : null}
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
        {placeBits.length ? <p className="loc-demo-place">{placeBits.join(" / ")}</p> : null}
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
        {loading ? (
          <p className="loc-near-note">{t("loc.near.loading")}</p>
        ) : groups.length ? (
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
                        <strong>{formatDistance(i.meters)}</strong>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="loc-near-note">{t("loc.near.empty")}</p>
        )}
        <p className="loc-near-note">{t("loc.near.note")}</p>
      </div>
    </section>
  );
}
