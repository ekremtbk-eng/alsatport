"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Heart, MapPin } from "lucide-react";
import type { Listing } from "@/data/store";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useI18n } from "@/context/I18nContext";
import { paymentsPaused } from "@/lib/campaign";
import { compactListingFacts } from "@/lib/listingFacts";

/** Phone/tablet result row shared by every category; only the fact line differs per category schema. */
export function CompactListingRow({ listing, meta }: { listing: Listing; meta?: ReactNode }) {
  const { favorites, toggleFavorite } = useApp();
  const { requireAuth } = useAuthModal();
  const { formatMoney, t } = useI18n();
  const liked = favorites.includes(listing.id);
  const place = [listing.city, listing.district].filter(Boolean).join(", ");
  const facts = compactListingFacts(listing);
  const badge = paymentsPaused() ? null : listing.vip ? "VIP" : listing.featured ? t("common.featured") : null;

  return (
    <article className={`mrow ${listing.urgent ? "listing-urgent" : ""}`}>
      <Link href={`/ilan/${listing.id}`} className="mrow-link">
        <div className="mrow-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.images[0]} alt={listing.title} loading="lazy" decoding="async" />
          {badge ? <span className="mrow-badge">{badge}</span> : null}
        </div>
        <div className="mrow-body">
          <h3 className="mrow-title">{listing.title}</h3>
          <div className="mrow-foot">
            {place ? (
              <span className="mrow-place">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{place}</span>
              </span>
            ) : (
              <span />
            )}
            {listing.price > 0 ? <span className="mrow-price">{formatMoney(listing.price)}</span> : null}
          </div>
        </div>
        {facts.length || meta ? (
          <ul className="mrow-facts">
            {meta ? <li>{meta}</li> : null}
            {facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null}
      </Link>
      <button
        type="button"
        onClick={() => {
          if (!requireAuth("member")) return;
          toggleFavorite(listing.id);
        }}
        className="mrow-fav"
        aria-label={t("common.favorite")}
        aria-pressed={liked}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-lime text-lime" : ""}`} />
      </button>
    </article>
  );
}

export function CompactListingList({ children }: { children: ReactNode }) {
  return <div className="mrow-list">{children}</div>;
}
