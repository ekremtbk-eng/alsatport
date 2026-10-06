"use client";

import Link from "next/link";
import { MapPin, Star, User } from "lucide-react";
import { findCategory, formatListingCount } from "@/data/categories";
import type { SellerReview } from "@/data/reviews";
import { serviceRating, serviceFirmHref } from "@/lib/serviceFirm";
import type { Listing } from "@/data/store";
import { listingSellerLabel } from "@/lib/publicName";
import { catName, useI18n } from "@/context/I18nContext";

export { serviceRating } from "@/lib/serviceFirm";

export function ServiceListingRow({
  listing,
  reviews,
}: {
  listing: Listing;
  reviews: SellerReview[];
}) {
  const { t } = useI18n();
  const cat = findCategory(listing.categoryId);
  const { avg, count } = serviceRating(listing, reviews);
  const hours24 = (listing.features ?? []).some((f) => f.includes("7/24") || f.toLocaleLowerCase("tr").includes("24/7"));

  return (
    <Link href={serviceFirmHref(listing.id)} className="svc-row">
      <span className="svc-row-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={listing.images[0]} alt="" />
      </span>
      <span className="svc-row-body">
        <span className="svc-row-top">
          <span className="min-w-0 flex-1">
            <span className="svc-row-name">{listing.title}</span>
            <span className="svc-row-meta">
              <span>
                <User className="h-3.5 w-3.5" />
                {listingSellerLabel(listing)}
              </span>
              <span>
                <MapPin className="h-3.5 w-3.5" />
                {listing.city}
                {listing.district ? ` / ${listing.district}` : ""}
              </span>
              {cat ? <span className="svc-row-cat">{catName(t, cat.id, cat.name)}</span> : null}
              {hours24 ? <span className="svc-row-24">7/24</span> : null}
            </span>
          </span>
          <span className="svc-row-rate">
            <span className="svc-row-rate-n">
              {formatListingCount(count)} {t("rev.count")}
            </span>
            <span className="svc-stars" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-3.5 w-3.5 ${n <= Math.round(avg) ? "svc-star-on" : "svc-star-off"}`}
                />
              ))}
            </span>
          </span>
        </span>
        <span className="svc-row-desc">{listing.description}</span>
      </span>
    </Link>
  );
}
