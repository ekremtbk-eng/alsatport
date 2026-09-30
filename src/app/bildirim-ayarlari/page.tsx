"use client";

import { useApp } from "@/context/AppContext";
import { TURKEY_CITIES } from "@/data/turkey";
import { SearchSelect } from "@/components/SearchSelect";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/context/I18nContext";

export default function NotificationSettingsPage() {
  const {
    notifPrefs,
    setNotifPrefs,
    geo,
    requestLocation,
    setGeoCity,
    listings,
    favorites,
    user,
    updateListingPrice,
    publishWatchListing,
  } = useApp();
  const { t } = useI18n();

  const watchFav = listings.find(
    (l) => favorites.includes(l.id) && l.sellerId !== user?.id,
  );

  return (
    <div className="mx-auto max-w-2xl px-3 py-4">
      <h1 className="text-xl font-bold">{t("notif.set.h")}</h1>
      <p className="mt-1 text-sm text-muted">{t("notif.set.p")}</p>
      <p className="mt-2 text-xs text-soft">{t("notif.deviceLocal")}</p>

      <section className="mt-5 space-y-2 rounded-3xl border border-line bg-card p-4">
        <Toggle
          title={t("notif.p1")}
          desc={t("notif.p1d")}
          on={notifPrefs.priceDrop}
          onChange={(v) => setNotifPrefs({ priceDrop: v })}
        />
        <Toggle
          title={t("notif.p2")}
          desc={t("notif.p2d")}
          on={notifPrefs.savedSearch}
          onChange={(v) => setNotifPrefs({ savedSearch: v })}
        />
        <Toggle
          title={t("notif.p3")}
          desc={t("notif.p3d")}
          on={notifPrefs.nearby}
          onChange={(v) => setNotifPrefs({ nearby: v })}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-lime" />
          <h2 className="font-bold">{t("notif.kind.nearby")}</h2>
        </div>
        <p className="text-sm text-soft">
          {geo.status === "granted" && geo.city
            ? t("notif.geo.on", { city: `${geo.city}${geo.source === "gps" ? " (GPS)" : ""}` })
            : geo.status === "denied"
              ? t("notif.geo.denied")
              : geo.status === "unavailable"
                ? t("notif.geo.na")
                : t("notif.geo.off")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={requestLocation}>
            {t("loc.allow")}
          </button>
          <Link href="/favoriler?tab=aramalar" className="btn-ghost h-10 px-4 text-sm">
            {t("fav.searches")}
          </Link>
        </div>
        <div className="mt-4">
          <SearchSelect
            label={t("notif.city")}
            value={geo.city ?? ""}
            options={TURKEY_CITIES.map((c) => c.name)}
            placeholder={t("notif.city")}
            onChange={setGeoCity}
          />
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-card p-4">
        <h2 className="font-bold">{t("notif.try")}</h2>
        <p className="mt-1 text-xs text-muted">{t("notif.try.p")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-blue h-10 px-4 text-sm"
            onClick={() => publishWatchListing()}
          >
            {t("notif.try.near")}
          </button>
          {watchFav && (
            <button
              type="button"
              className="btn-orange h-10 px-4 text-sm"
              onClick={() =>
                updateListingPrice(watchFav.id, Math.max(1, Math.round(watchFav.price * 0.97)))
              }
            >
              {t("notif.try.price")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Toggle({
  title,
  desc,
  on,
  onChange,
}: {
  title: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-elev/60 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-lime" : "bg-elev"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
            on ? "start-5" : "start-0.5"
          }`}
        />
      </button>
    </div>
  );
}
