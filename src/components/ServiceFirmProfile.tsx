"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Home, MapPin, Star } from "lucide-react";
import type { Listing } from "@/data/store";
import { getSellerPhone } from "@/data/store";
import { usePhoneReveal } from "@/lib/usePhoneReveal";
import { formatListingCount } from "@/data/categories";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { gatePath } from "@/lib/profile";
import { SellerChatPopup } from "@/components/SellerChatPopup";
import { ListingShareTrigger } from "@/components/listing/ListingShare";
import { ProtectedPhoto } from "@/components/ProtectedPhoto";
import { StarRating } from "@/components/StarRating";
import { useSellerReviews } from "@/components/useSellerReviews";
import { summarizeReviews } from "@/data/reviews";
import { buildFirmProfile, type FirmPriceRow } from "@/lib/serviceFirm";
import type { PublicFirm } from "@/lib/business/firmProfile";
import { loadRegionCoords, regionVersion, type RegionCoords } from "@/lib/regionClient";
import { reviewAuthorLabel } from "@/lib/publicName";

type FirmTab = "services" | "hours" | "districts" | "prices" | "news" | "qa";

export function ServiceFirmProfile({ listing }: { listing: Listing }) {
  const { user, reviewsFor } = useApp();
  const { t, formatMoney, locale } = useI18n();
  const { requireAuth } = useAuthModal();
  const router = useRouter();
  const live = useSellerReviews(listing.sellerId);
  const stored = reviewsFor(listing.sellerId);
  const apiReviews = live.reviews.length ? live.reviews : stored;
  const [firm, setFirm] = useState<PublicFirm | null>(null);
  const profile = useMemo(() => buildFirmProfile(listing, apiReviews, firm), [listing, apiReviews, firm]);
  const shownReviews = apiReviews;
  const rating = summarizeReviews(apiReviews);
  const rated = rating.count > 0;
  const isOwner = !!user && user.id === listing.sellerId;

  useEffect(() => {
    if (!listing.sellerBusiness) {
      setFirm(null);
      return;
    }
    let alive = true;
    void fetch(`/api/stores/by-seller/${encodeURIComponent(listing.sellerId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { firm?: PublicFirm | null } | null) => {
        if (alive) setFirm(data?.firm ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [listing.sellerBusiness, listing.sellerId]);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [tab, setTab] = useState<FirmTab>("services");
  const [slide, setSlide] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [revText, setRevText] = useState("");
  const [revStars, setRevStars] = useState(5);
  const [mapCoords, setMapCoords] = useState<RegionCoords>(
    listing.lat != null && listing.lng != null ? { lat: listing.lat, lng: listing.lng } : null,
  );
  const regionKey = regionVersion(listing);

  useEffect(() => {
    if (listing.status !== "active") return;
    let alive = true;
    void loadRegionCoords(listing).then((c) => {
      if (alive && c) setMapCoords(c);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey]);

  const phoneHint = getSellerPhone(listing.sellerId, listing);
  const { revealed: phone, telHref, reveal } = usePhoneReveal(listing.id, phoneHint);
  const aboutLimit = 280;
  const aboutLong = profile.about.length > aboutLimit;
  const aboutText = !aboutLong || aboutOpen ? profile.about : `${profile.about.slice(0, aboutLimit).trim()}…`;
  const gallery = profile.gallery;
  const visibleReviews = showAllReviews ? shownReviews : shownReviews.slice(0, 4);

  const tabs = [
    {
      id: "services" as const,
      label: t("firm.tab.services"),
      show: !!profile.category || profile.details.length > 0 || profile.features.length > 0,
    },
    { id: "hours" as const, label: t("firm.tab.hours"), show: !!profile.hours || !!profile.hoursNote },
    { id: "districts" as const, label: t("firm.tab.districts"), show: profile.districts.length > 0 },
    { id: "prices" as const, label: t("firm.tab.prices"), show: profile.prices.length > 0 },
    { id: "news" as const, label: t("firm.tab.news"), show: profile.announcements.length > 0 },
    { id: "qa" as const, label: t("firm.tab.qa"), show: profile.qa.length > 0 },
  ].filter((x) => x.show);
  const activeTab: FirmTab | undefined = tabs.some((x) => x.id === tab) ? tab : tabs[0]?.id;
  const missingExtras =
    !profile.hours || !profile.districts.length || !profile.announcements.length || !profile.qa.length || !firm?.priceList.length;

  const firmPrices = !!firm?.priceList.length;
  function priceText(row: FirmPriceRow) {
    const range = row.max
      ? `${formatMoney(row.min)} – ${formatMoney(row.max)}`
      : firmPrices
        ? t("firm.price.from", { v: formatMoney(row.min) })
        : formatMoney(row.min);
    return row.unit ? `${range} / ${row.unit}` : range;
  }
  const dateText = (at: number) => new Date(at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  function revealPhone() {
    if (!requireAuth("member")) return;
    const gate = gatePath(user);
    if (gate && gate !== "/giris") {
      router.push(gate);
      return;
    }
    if (!phoneOpen) void reveal();
    setPhoneOpen((v) => !v);
  }

  function openQuote() {
    if (!requireAuth("member")) return;
    const gate = gatePath(user);
    if (gate && gate !== "/giris") {
      router.push(gate);
      return;
    }
    setChatOpen(true);
  }

  function openReview() {
    if (!requireAuth("member")) return;
    const gate = gatePath(user);
    if (gate && gate !== "/giris") {
      router.push(gate);
      return;
    }
    if (user?.id === listing.sellerId) {
      setHint(t("rev.selfp"));
      return;
    }
    setReviewOpen(true);
  }

  async function sendReview(e: FormEvent) {
    e.preventDefault();
    const body = revText.trim();
    if (body.length < 12) {
      setHint(t("rev.short"));
      return;
    }
    const res = await live.submit({ listingId: listing.id, rating: revStars, text: body });
    if (!res.ok) {
      setHint(t(res.error ?? "rev.short"));
      return;
    }
    setRevText("");
    setReviewOpen(false);
    setHint(t("rev.ok"));
  }

  const mapQuery = mapCoords
    ? `${mapCoords.lat},${mapCoords.lng}`
    : [listing.neighborhood, listing.district, listing.city].filter(Boolean).join(" ");
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <div className="firm-page">
      <nav className="firm-crumbs" aria-label={t("firm.crumb")}>
        {profile.crumbs.map((c, i) => (
          <span key={`${c.href}-${i}`}>
            {i ? <span className="firm-crumbs-sep">›</span> : null}
            {i === profile.crumbs.length - 1 ? (
              <span className="firm-crumbs-now">{c.label}</span>
            ) : (
              <Link href={c.href}>{c.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <header className="firm-head">
        <div>
          <h1>{listing.title}</h1>
          <p className="firm-stars-line">
            {rated ? (
              <>
                <span className="svc-stars" aria-hidden>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= Math.round(rating.avg) ? "svc-star-on" : "svc-star-off"}`} />
                  ))}
                </span>
                <span>
                  {formatListingCount(rating.count)} {t("rev.count")}
                </span>
              </>
            ) : (
              <span>{t("rev.none")}</span>
            )}
          </p>
        </div>
        <div className="firm-badges">
          {listing.sellerVerified ? (
            <span className="firm-badge" title={t("firm.verified")}>
              <span className="firm-badge-ico is-ok">
                <Check />
              </span>
            </span>
          ) : null}
          {profile.open === true ? (
            <span className="firm-badge">
              <span className="firm-badge-ico is-open">
                <Home />
              </span>
              <span className="firm-badge-cap">{t("firm.open")}</span>
            </span>
          ) : profile.open === false ? (
            <span className="firm-badge">
              <span className="firm-badge-ico is-closed">{t("firm.closedShort")}</span>
              <span className="firm-badge-cap">{t("firm.closed")}</span>
            </span>
          ) : null}
          {profile.hours24 ? (
            <span className="firm-badge">
              <span className="firm-badge-ico is-24">7/24</span>
            </span>
          ) : null}
          {rated ? (
            <span className="firm-badge">
              <span className="firm-badge-ico is-rate">
                <span>
                  {rating.avg.toLocaleString("tr-TR", { minimumFractionDigits: rating.avg % 1 ? 1 : 0, maximumFractionDigits: 1 })}
                  /5
                </span>
                <span className="firm-mini-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-2.5 w-2.5 ${n <= Math.round(rating.avg) ? "svc-star-on" : "svc-star-off"}`} />
                  ))}
                </span>
              </span>
            </span>
          ) : null}
        </div>
      </header>

      <div className="mb-4">
        <ListingShareTrigger
          variant="banner"
          listingId={listing.id}
          title={listing.title}
          priceLabel={formatMoney(listing.price)}
          imageUrl={listing.images[0] || listing.sellerAvatar}
          description={profile.about}
          kind="firm"
        />
      </div>

      <div className="firm-grid">
        <div className="firm-col">
          {isOwner && (missingExtras || !profile.about) ? (
            <p className="firm-owner-hint">
              {listing.sellerBusiness ? t("firm.owner.hint") : t("firm.owner.hintListing")}{" "}
              <Link href={listing.sellerBusiness ? "/isletme-paneli" : `/ilan-ver?edit=${listing.id}`}>
                {listing.sellerBusiness ? t("firm.owner.panel") : t("firm.owner.edit")}
              </Link>
            </p>
          ) : null}

          {profile.about ? (
            <section className="firm-about">
              <ProtectedPhoto src={listing.images[0] || listing.sellerAvatar} alt="" />
              <div>
                <h2>{t("firm.about")}</h2>
                <p>
                  {aboutText}{" "}
                  {aboutLong ? (
                    <button type="button" className="firm-more" onClick={() => setAboutOpen((v) => !v)}>
                      {aboutOpen ? t("firm.less") : t("firm.more")}
                    </button>
                  ) : null}
                </p>
              </div>
            </section>
          ) : null}

          {tabs.length ? (
            <section className="firm-tabs-wrap">
              <div className="firm-tabs" role="tablist">
                {tabs.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === row.id}
                    className={activeTab === row.id ? "is-on" : ""}
                    onClick={() => setTab(row.id)}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
              <div className="firm-tab-body">
                {activeTab === "services" ? (
                  <div className="firm-svc-groups">
                    {profile.category ? (
                      <div className="firm-svc-group">
                        <p className="firm-svc-title">
                          <Check className="h-4 w-4" /> {t("firm.svc.category")}
                        </p>
                        <ul>
                          <li>
                            <Link href={profile.category.href}>{profile.category.name}</Link>
                          </li>
                        </ul>
                      </div>
                    ) : null}
                    {profile.details.length ? (
                      <dl className="firm-details">
                        {profile.details.map((d) => (
                          <div key={d.label}>
                            <dt>{d.label}</dt>
                            <dd>{d.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {profile.features.length ? (
                      <div className="firm-svc-group">
                        <p className="firm-svc-title">
                          <Check className="h-4 w-4" /> {t("firm.svc.features")}
                        </p>
                        <ul>
                          {profile.features.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {activeTab === "hours" ? (
                  profile.hours ? (
                    <div>
                      {profile.hours.always ? (
                        <p className="firm-hours-always">{t("firm.hours.always")}</p>
                      ) : (
                        <ul className="firm-hours">
                          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                            const row = profile.hours && !profile.hours.always ? profile.hours.days.find((d) => d.day === day) : undefined;
                            return (
                              <li key={day}>
                                <span>{t(`day.${day}`)}</span>
                                <strong>{row ? `${row.open} – ${row.close}` : t("firm.hours.closedDay")}</strong>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <p className="firm-fine">{t("firm.hours.tz")}</p>
                    </div>
                  ) : (
                    <p>{t("firm.hours.note", { v: profile.hoursNote })}</p>
                  )
                ) : null}
                {activeTab === "districts" ? (
                  <ul className="firm-dist">
                    {profile.districts.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : null}
                {activeTab === "prices" ? (
                  <>
                    <ul className="firm-prices">
                      {profile.prices.map((row, i) => (
                        <li key={i}>
                          <div>
                            <p>{row.title}</p>
                            {firmPrices ? null : <span>{t("firm.price.listing")}</span>}
                          </div>
                          <strong>{priceText(row)}</strong>
                        </li>
                      ))}
                    </ul>
                    <p className="firm-fine">{t("firm.price.note")}</p>
                  </>
                ) : null}
                {activeTab === "news" ? (
                  <ul className="firm-news">
                    {profile.announcements.map((a) => (
                      <li key={`${a.at}-${a.text}`}>
                        <time className="firm-fine">{dateText(a.at)}</time>
                        <p>{a.text}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {activeTab === "qa" ? (
                  <ul className="firm-qa">
                    {profile.qa.map((item) => (
                      <li key={item.q}>
                        <p className="firm-q">{item.q}</p>
                        <p>{item.a}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="firm-reviews">
            <div className="firm-rev-head">
              <h2>{t("firm.reviews")}</h2>
            </div>
            <div className="firm-rev-score">
              {rated ? (
                <>
                  <div className="firm-rev-circle">
                    <strong>
                      {rating.avg.toLocaleString("tr-TR", {
                        minimumFractionDigits: rating.avg % 1 ? 1 : 0,
                        maximumFractionDigits: 1,
                      })}
                    </strong>
                    <span>/5</span>
                  </div>
                  <div>
                    <span className="svc-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-4 w-4 ${n <= Math.round(rating.avg) ? "svc-star-on" : "svc-star-off"}`} />
                      ))}
                    </span>
                    <p>
                      {t("firm.revTotal", { n: formatListingCount(rating.count) })}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p>{t("rev.none")}</p>
                  <p>{t("rev.first")}</p>
                </div>
              )}
              <button type="button" className="firm-rev-cta" onClick={openReview}>
                {t("firm.reviewCta")}
              </button>
            </div>
            {hint ? <p className="firm-hint">{hint}</p> : null}
            <ul className="firm-rev-list">
              {visibleReviews.map((r) => (
                <li key={r.id}>
                  <span className="firm-rev-dot" />
                  <div>
                    <div className="firm-rev-meta">
                      <strong>{reviewAuthorLabel(r)}</strong>
                      <span className="svc-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "svc-star-on" : "svc-star-off"}`} />
                        ))}
                      </span>
                    </div>
                    <p>{r.text}</p>
                    <time>{r.createdAt}</time>
                  </div>
                </li>
              ))}
            </ul>
            {shownReviews.length > 4 ? (
              <button type="button" className="firm-all" onClick={() => setShowAllReviews((v) => !v)}>
                {showAllReviews ? t("firm.revLess") : t("firm.revAll")}
              </button>
            ) : null}
          </section>
        </div>

        <aside className="firm-side">
          <div className="firm-actions">
            <button type="button" className="firm-phone" onClick={revealPhone}>
              {phoneOpen && phone ? t("list.hide") : t("firm.phone")}
            </button>
            {phoneOpen && phone ? (
              <a className="firm-phone-num" href={telHref}>
                {phone}
              </a>
            ) : phoneOpen && !phoneHint ? (
              <p className="firm-hint">{t("seller.nophone")}</p>
            ) : null}
            <button type="button" className="firm-quote" onClick={openQuote}>
              {t("firm.quote")}
            </button>
            <p className="firm-loc">
              <MapPin className="h-4 w-4" />
              <span>
                {listing.city}
                {listing.district ? ` / ${listing.district}` : ""}
              </span>
            </p>
            <a className="firm-map" href={mapHref} target="_blank" rel="noreferrer">
              {t("firm.map")}
            </a>
          </div>

          {gallery.length ? (
          <section className="firm-gallery">
            <h2>{t("firm.works")}</h2>
            <div className="firm-slider">
              {gallery.length > 1 ? (
                <button
                  type="button"
                  className="firm-nav is-prev"
                  aria-label={t("firm.prev")}
                  onClick={() => setSlide((s) => (s - 1 + gallery.length) % gallery.length)}
                >
                  <ChevronLeft />
                </button>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gallery[slide] ?? gallery[0]} alt="" aria-hidden draggable={false} className="gal-backdrop" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gallery[slide] ?? gallery[0]} alt="" className="firm-slide-img" />
              {gallery.length > 1 ? (
                <button
                  type="button"
                  className="firm-nav is-next"
                  aria-label={t("firm.next")}
                  onClick={() => setSlide((s) => (s + 1) % gallery.length)}
                >
                  <ChevronRight />
                </button>
              ) : null}
            </div>
            {gallery.length > 1 ? (
              <div className="firm-dots">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === slide ? "is-on" : ""}
                    aria-label={`${i + 1}`}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            ) : null}
          </section>
          ) : null}

          {profile.checks.length ? (
            <section className="firm-checks">
              <h2>{t("firm.checks")}</h2>
              <ul>
                {profile.checks.map((c) => (
                  <li key={c.label}>
                    <Check className="h-4 w-4" />
                    {c.label}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {reviewOpen ? (
        <div className="firm-modal" role="dialog" aria-modal="true">
          <button type="button" className="firm-modal-bg" aria-label={t("common.close")} onClick={() => setReviewOpen(false)} />
          <form className="firm-modal-card" onSubmit={(e) => void sendReview(e)}>
            <h3>{t("firm.reviewCta")}</h3>
            <StarRating value={revStars} onChange={setRevStars} />
            <textarea value={revText} onChange={(e) => setRevText(e.target.value)} rows={4} required />
            {hint ? <p className="firm-hint">{hint}</p> : null}
            <div className="firm-modal-actions">
              <button type="button" onClick={() => setReviewOpen(false)}>
                {t("common.close")}
              </button>
              <button type="submit">{t("rev.send")}</button>
            </div>
          </form>
        </div>
      ) : null}

      <SellerChatPopup listing={listing} open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
