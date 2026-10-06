"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Flag,
  Heart,
  MessageCircle,
  Phone,
  PhoneCall,
} from "lucide-react";
import { getSellerPhone, maskPhone, phoneToTel, type Listing } from "@/data/store";
import { schemaForCategoryId } from "@/data/listingSchema";
import { ListingSpecTables } from "@/components/ListingSpecTables";
import { useApp } from "@/context/AppContext";
import { catName, useI18n } from "@/context/I18nContext";
import Link from "next/link";
import { gatePath } from "@/lib/profile";
import { useAuthModal } from "@/context/AuthModalContext";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";
import { isServiceListing, serviceFirmHref } from "@/lib/serviceFirm";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SellerChatPopup } from "@/components/SellerChatPopup";
import { SellerRatingBlock } from "@/components/SellerRatingBlock";
import { SellerReviews } from "@/components/SellerReviews";
import { SafetyNotice } from "@/components/listing/SafetyNotice";
import { CompareToolbar } from "@/components/listing/CompareToolbar";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ClassifiedListingView } from "@/components/listing/ClassifiedListingView";
import { ListingShareTrigger } from "@/components/listing/ListingShare";
import { ListingContactBar } from "@/components/listing/ListingContactBar";
import { ListingRegionPanel } from "@/components/listing/ListingRegionPanel";
import { ReportListingDialog } from "@/components/listing/ReportListingDialog";
import { prefetchRegion } from "@/lib/regionClient";
import { ListingPrintButton, ListingPrintSheet } from "@/components/listing/ListingPrint";
import { ListingPosterButton, ListingPosterDialog } from "@/components/listing/ListingPoster";
import { posterSupported } from "@/lib/poster";
import { listingSellerLabel } from "@/lib/publicName";
import { ListingDescriptionPanel } from "@/components/listing/ListingDescriptionPanel";
import { GuestLock } from "@/components/GuestLock";
import { apiGet } from "@/lib/security/client";
import { usePhoneReveal } from "@/lib/usePhoneReveal";
import { useSellerReviews } from "@/components/useSellerReviews";
import { isClassifiedPartsListing, listingCategoryChain } from "@/lib/listingFacts";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { hrefForCategory } from "@/data/categories";

export function ListingDetailClient() {
  const { id } = useParams<{ id: string }>();
  const { listings, favorites, toggleFavorite, user } = useApp();
  const { formatMoney, t } = useI18n();
  const { requireAuth } = useAuthModal();
  const rawId = typeof id === "string" ? id : "";
  const listingId = rawId.replace(/^podium-car-/, "demo-car-");
  const cached = listings.find((l) => l.id === listingId || l.id === rawId);
  const [fetched, setFetched] = useState<Listing | null>(null);
  const skipRemote = !rawId || rawId.startsWith("podium-") || listingId.startsWith("demo-");
  const [fetchDone, setFetchDone] = useState(skipRemote);
  const listing = cached ?? fetched;
  const { reviews } = useSellerReviews(listing?.sellerId ?? "");
  const blocked = listing ? isBlockedLiveAnimalListing(listing) : false;
  const [chatOpen, setChatOpen] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "desc" | "region">("info");
  const [reportHint, setReportHint] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const closeReport = useCallback(() => setReportOpen(false), []);
  const router = useRouter();

  useEffect(() => {
    if (skipRemote) return;
    let cancelled = false;
    setFetchDone(false);
    void apiGet<{ ok?: boolean; listing?: Listing }>(`/api/listings/${encodeURIComponent(rawId)}`)
      .then((res) => {
        if (!cancelled) {
          if (res.listing) setFetched(res.listing);
          setFetchDone(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [rawId, listingId, skipRemote, user?.id]);

  useEffect(() => {
    setShowPhone(false);
  }, [rawId]);

  useEffect(() => {
    if (listing && isServiceListing(listing)) {
      router.replace(serviceFirmHref(listing.id));
    }
  }, [listing, router]);

  const regionTarget = listing && !skipRemote && !blocked && listing.status === "active" ? listing : null;
  useEffect(() => {
    if (!regionTarget) return;
    const timer = window.setTimeout(() => prefetchRegion(regionTarget), 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionTarget?.id]);

  const liked = listing ? favorites.includes(listing.id) : false;
  const phoneHint = listing ? getSellerPhone(listing.sellerId, listing) : "";
  const { phone, revealed, reveal: revealPhone, call } = usePhoneReveal(listing?.id, phoneHint);
  const schema = useMemo(
    () => (listing ? schemaForCategoryId(listing.categoryId) : schemaForCategoryId("phones")),
    [listing],
  );
  const sinceYear = listing?.sellerSince?.match(/(\d{4})/)?.[1];
  const memberYears = sinceYear ? Math.max(0, 2026 - Number(sinceYear)) : 0;

  if (listing && isServiceListing(listing)) {
    return (
      <div className="p-8 text-center text-sm text-ink">{t("common.loading")}</div>
    );
  }

  if (!listing && !fetchDone) {
    return <div className="p-8 text-center text-sm text-ink">{t("common.loading")}</div>;
  }

  if (!listing || blocked) {
    return (
      <div className="p-8 text-center text-muted">
        {t("list.notfound")}{" "}
        <Link href="/" className="text-lime">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  function togglePhone() {
    if (!requireAuth("member")) return false;
    if (!showPhone) void revealPhone();
    setShowPhone((v) => !v);
    return true;
  }

  function callSeller() {
    if (!requireAuth("member")) return false;
    return call();
  }

  function openChat() {
    if (!requireAuth("member")) return;
    const gate = gatePath(user);
    if (gate && gate !== "/giris") {
      router.push(gate);
      return;
    }
    setChatOpen(true);
  }

  function fav() {
    if (!listing) return;
    if (!requireAuth("member")) return;
    toggleFavorite(listing.id);
  }

  function reportListing() {
    if (!listing) return;
    if (!requireAuth("member")) return;
    setReportOpen(true);
  }

  const canPoster = posterSupported(listing) && !isClassifiedPartsListing(listing.categoryId);

  const contact = (
    <>
      <ListingShareTrigger
        variant="banner"
        listingId={listing.id}
        title={listing.title}
        priceLabel={formatMoney(listing.price)}
        imageUrl={listing.images[0]}
        description={listing.description}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={fav}
          className="hidden h-12 w-12 place-items-center rounded-xl border border-line md:grid"
        >
          <Heart className={liked ? "h-5 w-5 fill-lime text-lime" : "h-5 w-5"} />
        </button>
        <ListingPrintButton variant="icon" />
        <ListingShareTrigger
          variant="icon"
          listingId={listing.id}
          title={listing.title}
          priceLabel={formatMoney(listing.price)}
          imageUrl={listing.images[0]}
          description={listing.description}
        />
        <button onClick={openChat} className="btn-primary h-12 flex-1">
          <MessageCircle className="relative z-10 h-4 w-4" />
          <span className="relative z-10">{t("list.msg")}</span>
        </button>
      </div>
      {canPoster ? <ListingPosterButton variant="block" onClick={() => setPosterOpen(true)} /> : null}
      {phone ? (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={revealed ? phoneToTel(revealed) : "#"}
          className="btn-orange h-12"
          onClick={(e) => {
            if (!callSeller()) e.preventDefault();
          }}
        >
          <PhoneCall className="relative z-10 h-4 w-4" />
          <span className="relative z-10">{t("list.call")}</span>
        </a>
        <button
          type="button"
          onClick={togglePhone}
          className="btn-blue h-12"
        >
          {showPhone ? <EyeOff className="relative z-10 h-4 w-4" /> : <Eye className="relative z-10 h-4 w-4" />}
          <span className="relative z-10">{showPhone ? t("list.hide") : t("list.showPhone")}</span>
        </button>
      </div>
      ) : (
        <p className="mt-2 text-center text-[11px] text-muted">{t("seller.nophone")}</p>
      )}
      {revealed && showPhone ? (
        <a
          href={phoneToTel(revealed)}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-blue/30 bg-elev py-2 text-sm font-bold text-blue"
        >
          <Phone className="h-4 w-4" />
          {phone}
        </a>
      ) : phone ? (
        <p className="mt-2 text-center text-[11px] text-muted">{maskPhone(phone)}</p>
      ) : null}
      <div className="mt-3">
        <SafetyNotice />
      </div>
    </>
  );

  if (isClassifiedPartsListing(listing.categoryId)) {
    return (
      <div className="detail-page mx-auto max-w-6xl pb-8">
        <CompareToolbar listing={listing} />
        {user?.id === listing.sellerId ? (
          <div className="px-4 pt-2">
            <Link href={`/ilan-ver?edit=${listing.id}`} className="inline-flex text-sm font-bold text-lime">
              {t("post.edit")}
            </Link>
          </div>
        ) : null}
        <ClassifiedListingView
          listing={listing}
          liked={liked}
          showPhone={showPhone}
          phone={phone}
          detailTab={detailTab}
          reportHint={reportHint}
          onFav={fav}
          onChat={openChat}
          onTogglePhone={togglePhone}
          onReport={user?.id === listing.sellerId ? undefined : reportListing}
          onTab={(tab) => {
            if (tab === "region" && !requireAuth("member")) return;
            setDetailTab(tab);
          }}
          formatMoney={formatMoney}
        />
        <ListingContactBar
          phone={phone}
          maskedPhone={maskPhone(phone)}
          telHref={revealed ? phoneToTel(revealed) : "#"}
          onMessage={openChat}
          onRevealPhone={() => {
            if (!requireAuth("member")) return false;
            void revealPhone();
            return true;
          }}
          onCall={callSeller}
          share={{
            listingId: listing.id,
            title: listing.title,
            priceLabel: formatMoney(listing.price),
            imageUrl: listing.images[0],
            description: listing.description,
          }}
        />
        <SellerChatPopup listing={listing} open={chatOpen} onClose={() => setChatOpen(false)} />
        <ListingPrintSheet listing={listing} mode="classified" formatMoney={formatMoney} />
        <ReportListingDialog listingId={listing.id} open={reportOpen} onClose={closeReport} onDone={setReportHint} />
      </div>
    );
  }

  return (
    <div className="detail-page mx-auto max-w-6xl pb-8">
      <div className="px-4 pt-3">
        <BreadcrumbNav
          items={[
            { href: "/", label: t("nav.home") },
            { href: "/kategoriler", label: t("nav.categories") },
            ...listingCategoryChain(listing.categoryId).map((c) => ({
              href: hrefForCategory(c),
              label: catName(t, c.id, c.name),
            })),
            { label: listing.title },
          ]}
        />
      </div>
      <CompareToolbar listing={listing} />
      <div className="detail-hero relative">
        <ListingGallery images={listing.images} alt={listing.title} />
        <button
          onClick={() => router.back()}
          className="absolute start-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 lg:hidden"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <div className="absolute end-3 top-3 z-20 flex gap-2">
          <ListingShareTrigger
            variant="hero"
            listingId={listing.id}
            title={listing.title}
            priceLabel={formatMoney(listing.price)}
            imageUrl={listing.images[0]}
            description={listing.description}
          />
          <button
            onClick={fav}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/50"
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-lime text-lime" : "text-white"}`} />
          </button>
          <ListingPrintButton variant="hero" />
          {canPoster ? <ListingPosterButton variant="hero" onClick={() => setPosterOpen(true)} /> : null}
        </div>
      </div>
      {user?.id === listing.sellerId ? (
        <div className="px-4">
          <Link href={`/ilan-ver?edit=${listing.id}`} className="mt-2 inline-flex text-sm font-bold text-lime">
            {t("post.edit")}
          </Link>
        </div>
      ) : null}

      <div className="detail-grid px-4 pt-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{listing.title}</h1>
          <p className="text-sm text-muted">{listing.subtitle}</p>
          <p className="price-text mt-2 text-2xl font-extrabold">{formatMoney(listing.price)}</p>
          <div className="mt-3 lg:hidden">
            <ListingShareTrigger
              variant="banner"
              listingId={listing.id}
              title={listing.title}
              priceLabel={formatMoney(listing.price)}
              imageUrl={listing.images[0]}
              description={listing.description}
            />
            {canPoster ? <ListingPosterButton variant="block" onClick={() => setPosterOpen(true)} /> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            <span>No: {listing.listingNo}</span>
            <span>{listing.createdAt}</span>
            <span>
              {listing.city} / {listing.district}
            </span>
            {user?.id !== listing.sellerId ? (
              <button type="button" className="inline-flex items-center gap-1 font-semibold text-orange" onClick={reportListing}>
                <Flag className="h-3.5 w-3.5" />
                {t("admin.report")}
              </button>
            ) : null}
          </div>
          {reportHint ? <p className="mt-1 text-xs font-semibold text-lime">{reportHint}</p> : null}

          <div className="detail-tabs">
            <button
              type="button"
              className={detailTab === "info" ? "is-on" : ""}
              onClick={() => setDetailTab("info")}
            >
              {t("loc.tab.details")}
            </button>
            <button
              type="button"
              className={detailTab === "desc" ? "is-on" : ""}
              onClick={() => setDetailTab("desc")}
            >
              {t("loc.tab.description")}
            </button>
            <button
              type="button"
              className={detailTab === "region" ? "is-on" : ""}
              onPointerEnter={() => regionTarget && user && prefetchRegion(regionTarget, true)}
              onFocus={() => regionTarget && user && prefetchRegion(regionTarget, true)}
              onClick={() => {
                if (!requireAuth("member")) return;
                setDetailTab("region");
              }}
            >
              {t("loc.tab.region")}
            </button>
          </div>

          {detailTab === "region" ? (
            <GuestLock>
              <ListingRegionPanel listing={listing} />
            </GuestLock>
          ) : detailTab === "desc" ? (
            <GuestLock>
              <ListingDescriptionPanel
                className="mt-5 rounded-xl border border-line bg-card p-4 shadow-sm"
                description={listing.description}
              />
            </GuestLock>
          ) : (
            <GuestLock>
              <ListingSpecTables listing={listing} schema={schema} />
            </GuestLock>
          )}
        </div>

        <aside className="detail-aside">
          <section className="rounded-xl border border-line bg-card p-3 shadow-sm">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={listing.sellerAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold text-ink">
                  {listingSellerLabel(listing)}
                  {listing.sellerVerified && <VerifiedBadge size={18} />}
                </p>
                <p className="text-xs text-muted">
                  {listing.sellerVerified ? t("list.seller.v") : t("prof.member")}
                </p>
                <SellerRatingBlock reviews={reviews} verified={listing.sellerVerified} />
              </div>
              <Link href={`/satici/${listing.sellerId}`} className="text-sm font-semibold text-lime">
                {t("nav.profile")}
              </Link>
            </div>
            <dl className="seller-meta">
              <div>
                <dt>{t("seller.since")}</dt>
                <dd>{listing.sellerSince || listing.createdAt}</dd>
              </div>
            </dl>
            <div className="seller-pills">
              {memberYears > 0 ? <span className="seller-pill">{t("seller.years", { n: memberYears })}</span> : null}
              {listing.sellerVerified ? <span className="seller-pill is-ok">{t("badge.verified")}</span> : null}
            </div>
          </section>
          <GuestLock>
            <SellerReviews sellerId={listing.sellerId} listingId={listing.id} />
          </GuestLock>
          <div className="detail-contact-aside hidden rounded-xl border border-line bg-card p-3 lg:block">{contact}</div>
        </aside>
      </div>

      <ListingContactBar
        phone={phone}
        maskedPhone={maskPhone(phone)}
        telHref={revealed ? phoneToTel(revealed) : "#"}
        onMessage={openChat}
        onRevealPhone={() => {
          if (!requireAuth("member")) return false;
          void revealPhone();
          return true;
        }}
        onCall={callSeller}
        share={{
          listingId: listing.id,
          title: listing.title,
          priceLabel: formatMoney(listing.price),
          imageUrl: listing.images[0],
          description: listing.description,
        }}
      />

      <SellerChatPopup listing={listing} open={chatOpen} onClose={() => setChatOpen(false)} />
      <ListingPrintSheet listing={listing} mode="standard" formatMoney={formatMoney} />
      {canPoster ? (
        <ListingPosterDialog listing={listing} phone={user ? revealed : ""} open={posterOpen} onOpenChange={setPosterOpen} />
      ) : null}
      <ReportListingDialog listingId={listing.id} open={reportOpen} onClose={closeReport} onDone={setReportHint} />
    </div>
  );
}
