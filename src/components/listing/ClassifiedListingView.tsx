"use client";

import Link from "next/link";
import { Check, ChevronRight, Flag, Heart, MessageCircle } from "lucide-react";
import { maskPhone, phoneToTel, type Listing } from "@/data/store";
import { catName, useI18n } from "@/context/I18nContext";
import { hrefForCategory } from "@/data/categories";
import { SafetyNotice } from "@/components/listing/SafetyNotice";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingShareTrigger } from "@/components/listing/ListingShare";
import { ListingRegionPanel } from "@/components/listing/ListingRegionPanel";
import { ListingDescriptionPanel } from "@/components/listing/ListingDescriptionPanel";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StoreRefCard } from "@/components/business/StoreBits";
import { classifiedFactRows, classifiedFeatureItems, listingCategoryChain } from "@/lib/listingFacts";
import { listingSellerLabel } from "@/lib/publicName";
import { ListingPrintButton } from "@/components/listing/ListingPrint";

export function ClassifiedListingView({
  listing,
  liked,
  showPhone,
  phone,
  detailTab,
  reportHint,
  onFav,
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
  detailTab: "info" | "desc" | "region";
  reportHint: string;
  onFav: () => void;
  onChat: () => void;
  onTogglePhone: () => void;
  onReport?: () => void;
  onTab: (tab: "info" | "desc" | "region") => void;
  formatMoney: (n: number) => string;
}) {
  const { t } = useI18n();
  const facts = classifiedFactRows(listing, t);
  const crumbs = listingCategoryChain(listing.categoryId);
  const extras = classifiedFeatureItems(listing);
  const shop = !!listing.sellerBusiness;

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
          <ListingShareTrigger
            variant="toolbar"
            listingId={listing.id}
            title={listing.title}
            priceLabel={formatMoney(listing.price)}
            imageUrl={listing.images[0]}
            description={listing.description}
          />
          <ListingPrintButton variant="toolbar" />
        </div>
      </header>

      <div className="classified-top">
        <ListingGallery images={listing.images} alt={listing.title} layout="classified" />

        <div className="classified-mid">
          <p className="classified-price">{formatMoney(listing.price)}</p>
          <div className="mt-3">
            <ListingShareTrigger
              variant="banner"
              listingId={listing.id}
              title={listing.title}
              priceLabel={formatMoney(listing.price)}
              imageUrl={listing.images[0]}
              description={listing.description}
            />
          </div>
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
            {listingSellerLabel(listing)}
            {listing.sellerVerified ? <VerifiedBadge size={16} /> : null}
          </p>
          <div className="classified-seller-links">
            <Link href={`/satici/${listing.sellerId}`}>{t("list.allAds")}</Link>
            <span>·</span>
            <Link href={`/satici/${listing.sellerId}`}>{t("nav.profile")}</Link>
          </div>
          {listing.store ? <StoreRefCard store={listing.store} /> : null}
          {phone ? (
            <ul className="classified-phones">
              {shop ? (
                <li>
                  <span>{t("list.phone.work")}</span>
                  <a
                    href={phone.includes("*") ? "#" : phoneToTel(phone)}
                    onClick={(e) => {
                      if (phone.includes("*")) {
                        e.preventDefault();
                        onTogglePhone();
                      }
                    }}
                  >
                    {showPhone ? phone : maskPhone(phone)}
                  </a>
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
        <button type="button" className={detailTab === "desc" ? "is-on" : ""} onClick={() => onTab("desc")}>
          {t("loc.tab.description")}
        </button>
        <button type="button" className={detailTab === "region" ? "is-on" : ""} onClick={() => onTab("region")}>
          {t("loc.tab.location")}
        </button>
      </div>

      {detailTab === "region" ? <ListingRegionPanel listing={listing} /> : null}
      <div hidden={detailTab !== "desc"}>
        <ListingDescriptionPanel className="classified-desc" description={listing.description} />
      </div>
      {detailTab === "info" ? (
        <>
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
      ) : null}

      {reportHint ? <p className="mt-2 text-xs font-semibold text-lime">{reportHint}</p> : null}
      {onReport ? (
        <button type="button" className="classified-report" onClick={onReport}>
          <Flag className="h-3.5 w-3.5" />
          {t("admin.report")}
        </button>
      ) : null}
    </div>
  );
}
