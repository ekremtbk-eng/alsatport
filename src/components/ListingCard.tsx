"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { type Listing } from "@/data/store";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useI18n } from "@/context/I18nContext";

export function ListingCard({
  listing,
  compact = false,
}: {
  listing: Listing;
  compact?: boolean;
}) {
  const { favorites, toggleFavorite } = useApp();
  const { requireAuth } = useAuthModal();
  const { formatMoney, t } = useI18n();
  const liked = favorites.includes(listing.id);

  return (
    <article className={`premium-card group relative overflow-hidden rounded-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${listing.urgent ? "listing-urgent" : ""}`}>
      <Link href={`/ilan/${listing.id}`} className="block">
        <div className={`relative listing-card-media overflow-hidden bg-elev`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {listing.vip && (
            <span className="badge-vip absolute left-2 top-2 rounded-lg px-1.5 py-0.5 text-[10px]">
              VIP
            </span>
          )}
          {listing.featured && !listing.vip && (
            <span className="badge-blue absolute left-2 top-2 rounded-lg px-1.5 py-0.5 text-[10px]">
              {t("common.featured")}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold text-ink">{listing.title}</h3>
          <p className="truncate text-xs text-ink">{listing.subtitle}</p>
          <p className="price-text mt-2 text-[15px] font-extrabold">{formatMoney(listing.price)}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-ink">
            {listing.city} · {listing.createdAt}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          if (!requireAuth("member")) return;
          toggleFavorite(listing.id);
        }}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-ink shadow-sm backdrop-blur transition hover:shadow-md"
        aria-label={t("common.favorite")}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-orange text-orange" : "text-ink"}`} />
      </button>
    </article>
  );
}
