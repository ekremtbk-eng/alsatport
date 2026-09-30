"use client";

import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { useApp } from "@/context/AppContext";
import { listingMatchesSearch, searchHref, searchLabel } from "@/lib/notify";
import { isPublicListing } from "@/lib/categoryCounts";
import { useI18n } from "@/context/I18nContext";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Search, Trash2 } from "lucide-react";
import { Suspense } from "react";

function FavoritesInner() {
  const params = useSearchParams();
  const tab = params.get("tab") === "aramalar" ? "aramalar" : "ilanlar";
  const { listings, favorites, savedSearches, removeSavedSearch } = useApp();
  const { t } = useI18n();
  const items = listings.filter((l) => favorites.includes(l.id) && isPublicListing(l));

  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      <h1 className="mb-4 text-xl font-bold">{t("fav.h")}</h1>
      <div className="mb-4 flex gap-2">
        <Link href="/favoriler" className={`chip ${tab === "ilanlar" ? "chip-on" : ""}`}>
          {t("fav.ads")}
        </Link>
        <Link href="/favoriler?tab=aramalar" className={`chip ${tab === "aramalar" ? "chip-on" : ""}`}>
          {t("fav.searches")}
        </Link>
      </div>

      {tab === "ilanlar" ? (
        items.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-8 text-center text-muted">
            {t("fav.empty")}{" "}
            <Link href="/" className="text-lime">
              {t("go.home")}
            </Link>
          </p>
        ) : (
          <ListingGrid>
            {items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </ListingGrid>
        )
      ) : savedSearches.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-8 text-center text-muted">
          {t("fav.emptySearch")}
        </p>
      ) : (
        <ul className="space-y-2">
          {savedSearches.map((s) => {
            const n = listings.filter((l) => listingMatchesSearch(l, s)).length;
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card px-3 py-3"
              >
                <span className="icon-tile grid h-10 w-10 place-items-center rounded-xl text-lime">
                  <Search className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={searchHref(s)} className="font-semibold hover:text-lime">
                    {searchLabel(s)}
                  </Link>
                  <p className="text-xs text-muted">{t("fav.match", { n })}</p>
                </div>
                <Link
                  href="/bildirim-ayarlari"
                  className="hidden rounded-xl border border-line p-2 text-muted sm:grid"
                  aria-label={t("notif.prefs")}
                >
                  <Bell className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  className="rounded-xl border border-line p-2 text-muted hover:text-orange"
                  onClick={() => removeSavedSearch(s.id)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FavoritesFallback() {
  const { t } = useI18n();
  return <div className="p-8 text-muted">{t("common.loading")}</div>;
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<FavoritesFallback />}>
      <FavoritesInner />
    </Suspense>
  );
}
