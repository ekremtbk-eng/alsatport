"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { type Listing } from "@/data/store";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { catName, useI18n } from "@/context/I18nContext";
import { findCategory } from "@/data/categories";
import { paymentsPaused } from "@/lib/campaign";
import { listingAgeLabel } from "@/lib/listingAge";

export function ListingCard({
  listing,
  compact = false,
  variant = "lux",
}: {
  listing: Listing;
  compact?: boolean;
  variant?: "lux" | "home";
}) {
  const { favorites, toggleFavorite } = useApp();
  const { requireAuth } = useAuthModal();
  const { formatMoney, t, locale } = useI18n();
  const liked = favorites.includes(listing.id);
  const place = [listing.city, listing.district].filter(Boolean).join(" · ");
  const blurb = listing.subtitle?.trim() || listing.description?.trim() || place;
  const cat = findCategory(listing.categoryId);
  const catLabel = cat ? catName(t, cat.id, cat.name) : "";

  if (variant === "home") {
    return (
      <article className={`hp-card ${listing.urgent ? "listing-urgent" : ""}`}>
        <Link href={`/ilan/${listing.id}`} className="hp-card-link">
          <div className="hp-card-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listing.images[0]} alt={listing.title} loading="lazy" decoding="async" />
            <div className="hp-card-badges">
              {catLabel ? <span className="hp-card-badge is-cat">{catLabel}</span> : null}
            </div>
          </div>
          <div className="hp-card-body">
            <p className="hp-card-place">{place || t("acil.turkey")}</p>
            <h3>{listing.title}</h3>
            <p className="hp-card-price">{formatMoney(listing.price)}</p>
            <p className="hp-card-meta">{listingAgeLabel(listing, locale)}</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!requireAuth("member")) return;
            toggleFavorite(listing.id);
          }}
          className="hp-card-fav"
          aria-label={t("common.favorite")}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-lime text-lime" : ""}`} />
        </button>
      </article>
    );
  }

  return (
    <article className={`lux-listing-card group ${compact ? "is-compact" : ""} ${listing.urgent ? "listing-urgent" : ""}`}>
      <Link href={`/ilan/${listing.id}`} className="lux-listing-link">
        <div className="lux-listing-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.images[0]} alt={listing.title} />
          {paymentsPaused() ? null : listing.vip ? (
            <span className="badge-vip lux-listing-badge">VIP</span>
          ) : listing.featured ? (
            <span className="badge-blue lux-listing-badge">{t("common.featured")}</span>
          ) : null}
        </div>
        <div className="lux-listing-body">
          <h3>{listing.title}</h3>
          {blurb ? <p className="lux-listing-line">{blurb}</p> : null}
          <p className="lux-listing-line lux-listing-price">{formatMoney(listing.price)}</p>
          {place ? <p className="lux-listing-line">{place}</p> : null}
          <span className="lux-listing-cta">{t("common.inspect")}</span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          if (!requireAuth("member")) return;
          toggleFavorite(listing.id);
        }}
        className="lux-listing-fav"
        aria-label={t("common.favorite")}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-lime text-lime" : ""}`} />
      </button>
    </article>
  );
}
