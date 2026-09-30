"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SellerChatPopup } from "@/components/SellerChatPopup";
import { SellerRatingBlock } from "@/components/SellerRatingBlock";
import { SellerReviews } from "@/components/SellerReviews";
import { getSellerPhone, maskPhone, phoneToTel } from "@/data/store";
import { gatePath } from "@/lib/profile";
import { isPublicListing } from "@/lib/categoryCounts";
import { useI18n } from "@/context/I18nContext";
import { apiGet } from "@/lib/security/client";
import { useSellerReviews } from "@/components/useSellerReviews";
import type { Listing } from "@/data/store";

export default function SellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { listings, user } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [remoteAds, setRemoteAds] = useState<Listing[] | null>(null);
  const { reviews } = useSellerReviews(typeof id === "string" ? id : "");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void apiGet<{ ok?: boolean; listings?: Listing[] }>(
      `/api/listings?sellerId=${encodeURIComponent(id)}`,
    ).then((res) => {
      if (!cancelled) setRemoteAds(res.listings ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const ads = useMemo(() => {
    if (remoteAds) return remoteAds.filter(isPublicListing);
    return listings.filter((l) => l.sellerId === id && isPublicListing(l));
  }, [listings, id, remoteAds]);
  const seller = ads[0];
  const phone = getSellerPhone(id, seller);

  if (!seller) {
    return (
      <div className="p-8 text-center text-muted">
        {t("seller.notfound")}{" "}
        <Link href="/" className="text-lime">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  function openChat() {
    const gate = gatePath(user);
    if (gate) {
      router.push(gate);
      return;
    }
    setChatOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-5">
      <div className="rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={seller.sellerAvatar}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-blue/50"
          />
            <div className="flex-1 text-center sm:text-start">
            <h1 className="inline-flex items-center gap-1.5 text-xl font-extrabold">
              {seller.sellerName}
              {seller.sellerVerified && <VerifiedBadge size={22} />}
            </h1>
            <p className="mt-1 text-sm text-blue">
              {seller.sellerVerified ? t("prof.verified") : t("seller.unverified")}
            </p>
            <p className="text-xs text-muted">{t("cat.count", { n: ads.length })}</p>
            <div className="mt-1 sm:max-w-md">
              <SellerRatingBlock
                reviews={reviews}
                verified={seller.sellerVerified}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <button onClick={openChat} className="btn-primary h-12 w-full">
            <MessageCircle className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{t("list.msg")}</span>
          </button>
          {phone ? (
            <>
          <div className="grid grid-cols-2 gap-2">
            <a href={phoneToTel(phone)} className="btn-orange h-12">
              <PhoneCall className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{t("list.call")}</span>
            </a>
            <button type="button" onClick={() => setShowPhone((v) => !v)} className="btn-blue h-12">
              {showPhone ? (
                <EyeOff className="relative z-10 h-4 w-4" />
              ) : (
                <Eye className="relative z-10 h-4 w-4" />
              )}
              <span className="relative z-10">{showPhone ? phone : t("list.showPhone")}</span>
            </button>
          </div>
          {!showPhone && (
            <p className="text-center text-[11px] text-muted">
              <Phone className="mr-1 inline h-3 w-3" />
              {maskPhone(phone)}
            </p>
          )}
            </>
          ) : (
            <p className="text-center text-[11px] text-muted">{t("seller.nophone")}</p>
          )}
        </div>
      </div>

      <SellerReviews sellerId={id} />

      <h2 className="mb-3 mt-6 font-bold">{t("seller.ads")}</h2>
      <ListingGrid>
        {ads.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </ListingGrid>

      <SellerChatPopup listing={seller} open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
