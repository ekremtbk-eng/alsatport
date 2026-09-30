"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Flag, Heart, MessageCircle } from "lucide-react";
import { maskPhone, phoneToTel, type Listing } from "@/data/store";
import { catName, useI18n } from "@/context/I18nContext";
import { hrefForCategory } from "@/data/categories";
import { SafetyNotice } from "@/components/listing/SafetyNotice";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingShareTrigger } from "@/components/listing/ListingShare";
import { ListingRegionPanel } from "@/components/listing/ListingRegionPanel";
import { GuestLock } from "@/components/GuestLock";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { classifiedFactRows, classifiedFeatureItems, listingCategoryChain } from "@/lib/listingFacts";

export function ClassifiedListingView({
  listing,
  liked,
  showPhone,
  phone,
  detailTab,
  reportHint,
  onFav,
  onShare,
  onChat,
  onTogglePhone,
  onReport,
  onTab,
  formatMoney,
}: {
  listing: Listing;
  liked: boolean;
  showPhone: boolean;
  phone: string;
  detailTab: "info" | "region";
  reportHint: string;
  onFav: () => void;
  onShare: () => void;
  onChat: () => void;
  onTogglePhone: () => void;
  onReport: () => void;
  onTab: (tab: "info" | "region") => void;
  formatMoney: (n: number) => string;
}) {
  const { t } = useI18n();
  const [descOpen, setDescOpen] = useState(false);
  const facts = classifiedFactRows(listing, t);
  const crumbs = listingCategoryChain(listing.categoryId);
  const extras = classifiedFeatureItems(listing);
  const shop = listing.vip || listing.sellerVerified;
  const longDesc = (listing.description ?? "").length > 280;

  return (
    <div className="classified-page">
      {crumbs.length ? (
        <nav className="classified-crumbs" aria-label={t("firm.crumb")}>
          <Link href="/">{t("nav.home")}</Link>
          {crumbs.map((c) => (
            <span key={c.id}>
              <ChevronRight className="classified-crumb-sep" aria-hidden />
              <Link href={hrefForCategory(c)}>{catName(t, c.id, c.name)}</Link>
            </span>
          ))}
        </nav>
      ) : null}

      <header className="classified-head">
        <div className="min-w-0 flex-1">
          <h1 className="classified-title">{listing.title}</h1>
        </div>
        <div className="classified-head-actions">
          <button type="button" className="classified-icon-btn" onClick={onFav} aria-label={t("nav.favorites")}>
            <Heart className={liked ? "h-4 w-4 fill-lime text-lime" : "h-4 w-4"} />
          </button>
          <ListingShareTrigger variant="icon" onOpen={onShare} />
        </div>
      </header>

      <div className="classified-top">
        <ListingGallery images={listing.images} alt={listing.title} layout="classified" />

        <div className="classified-mid">
          <p className="classified-price">{formatMoney(listing.price)}</p>
          {listing.city ? (
            <p className="classified-loc">
              {[listing.city, listing.district, listing.neighborhood].filter(Boolean).join(" / ")}
            </p>
          ) : null}
          <dl className="classified-facts">
            {facts.map((row) => (
              <div key={row.label} className="classified-fact">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="classified-seller">
          <p className="classified-seller-kicker">{shop ? t("seller.store") : t("list.seller.v")}</p>
          <p className="classified-seller-name">
            {listing.sellerName}
            {listing.sellerVerified ? <VerifiedBadge size={16} /> : null}
          </p>
          <div className="classified-seller-links">
            <Link href={`/satici/${listing.sellerId}`}>{t("list.allAds")}</Link>
            <span>·</span>
            <Link href={`/satici/${listing.sellerId}`}>{t("nav.profile")}</Link>
          </div>
          {phone ? (
            <ul className="classified-phones">
              {shop ? (
                <li>
                  <span>{t("list.phone.work")}</span>
                  <a href={phoneToTel(phone)}>{showPhone ? phone : maskPhone(phone)}</a>
                </li>
              ) : null}
              <li>
                <span>{t("list.phone.mobile")}</span>
                <button type="button" onClick={onTogglePhone}>
                  {showPhone ? phone : maskPhone(phone)}
                </button>
              </li>
            </ul>
          ) : (
            <p className="classified-nophone">{t("seller.nophone")}</p>
          )}
          <button type="button" className="btn-primary classified-msg-btn" onClick={onChat}>
            <MessageCircle className="h-4 w-4" />
            {t("list.sendMsg")}
          </button>
        </aside>
      </div>

      <div className="classified-tabs">
        <button type="button" className={detailTab === "info" ? "is-on" : ""} onClick={() => onTab("info")}>
          {t("loc.tab.details")}
        </button>
        <button type="button" className={detailTab === "region" ? "is-on" : ""} onClick={() => onTab("region")}>
          {t("loc.tab.location")}
        </button>
      </div>

      {detailTab === "region" ? (
        <GuestLock>
          <ListingRegionPanel listing={listing} />
        </GuestLock>
      ) : (
        <>
          <section className="classified-desc">
            <h2>{t("list.desc")}</h2>
            <p className={descOpen || !longDesc ? "" : "is-clamp"}>{listing.description}</p>
            {longDesc ? (
              <button type="button" className="classified-more" onClick={() => setDescOpen((v) => !v)}>
                {descOpen ? t("list.less") : t("list.more")}
              </button>
            ) : null}
          </section>
          {extras.length ? (
            <section className="classified-feats">
              <h2>{t("list.feat")}</h2>
              <p className="classified-feats-sub">{t("list.feat.detail")}</p>
              <ul className="classified-feat-list">
                {extras.map((item) => (
                  <li key={item} className="classified-feat">
                    <Check className="h-4 w-4" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="classified-safe">
            <SafetyNotice />
          </div>
        </>
      )}

      {reportHint ? <p className="mt-2 text-xs font-semibold text-lime">{reportHint}</p> : null}
      <button type="button" className="classified-report" onClick={onReport}>
        <Flag className="h-3.5 w-3.5" />
        {t("admin.report")}
      </button>
    </div>
  );
}
