"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clock3, Copy, Eye, FileImage, MapPin, Plus, Share2 } from "lucide-react";
import type { Listing } from "@/data/store";
import { useI18n } from "@/context/I18nContext";
import { PUBLISHED_PARAM } from "@/components/listing/PublishNotifCard";
import { posterAvailable } from "@/lib/poster";
import {
  canUseWebShare,
  copyText,
  listingPublicUrl,
  listingWebShareData,
  listingWhatsAppMessage,
  whatsappShareHref,
} from "@/lib/shareListing";

/**
 * Shown right after a new listing is stored. The headline follows the status the server returned, sharing
 * is offered only for a live listing, and only for channels that really work from a web page: WhatsApp
 * (link), copying the link, and the device share sheet where the browser has one.
 */
export function PostSuccess({ listing, onNew }: { listing: Listing; onNew: () => void }) {
  const { t, formatMoney } = useI18n();
  const live = listing.status === "active";
  const url = listingPublicUrl(listing.id);
  const priceLabel = formatMoney(listing.price, listing.currency);
  const share = listingWebShareData({ title: listing.title, priceLabel, url });
  const [canShare, setCanShare] = useState(false);
  const [note, setNote] = useState<"" | "copied" | "failed">("");

  useEffect(() => {
    setCanShare(canUseWebShare(share));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(""), 2600);
    return () => window.clearTimeout(id);
  }, [note]);

  async function copy() {
    setNote((await copyText(url)) ? "copied" : "failed");
  }

  async function nativeShare() {
    try {
      await navigator.share(share);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setNote("failed");
    }
  }

  return (
    <section className="post-done" aria-labelledby="post-done-title" data-post-done={listing.status}>
      <div className={`post-done-badge ${live ? "" : "is-review"}`} aria-hidden>
        {live ? <Check className="h-9 w-9" strokeWidth={3} /> : <Clock3 className="h-9 w-9" strokeWidth={2.4} />}
      </div>
      <h2 id="post-done-title" className="post-done-title">
        {live ? t("post.doneTitle") : t("post.reviewTitle")}
      </h2>
      <p className="post-done-lead">{live ? t("post.doneLead") : t("post.reviewLead")}</p>

      <div className="post-done-card">
        {listing.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.images[0]} alt="" />
        ) : null}
        <div className="min-w-0">
          <p className="post-done-card-title">{listing.title}</p>
          <p className="post-done-card-price">{priceLabel}</p>
          <p className="post-done-card-place">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {[listing.city, listing.district].filter(Boolean).join(" / ")}
          </p>
          {listing.listingNo ? <p className="post-done-card-no">{t("post.listingNo", { no: listing.listingNo })}</p> : null}
        </div>
      </div>

      <Link href={`/ilan/${listing.id}${live ? `?${PUBLISHED_PARAM}=1` : ""}`} className="btn-primary post-done-main">
        <Eye className="relative z-10 h-5 w-5" aria-hidden />
        <span className="relative z-10">{t("post.viewMine")}</span>
      </Link>

      {live ? (
        <div className="post-done-share" aria-label={t("share.kicker")}>
          <p className="post-done-share-h">{t("share.kicker")}</p>
          <div className="post-done-grid">
            <a
              className="post-done-btn"
              href={whatsappShareHref(listingWhatsAppMessage({ title: listing.title, priceLabel, url, description: listing.description }))}
              target="_blank"
              rel="noopener noreferrer"
              data-share="whatsapp"
            >
              <span className="post-done-ico is-wa">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.74.46 3.44 1.34 4.94L2 22l5.37-1.41a10 10 0 0 0 4.67 1.19h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.26-4.79-4.18-4.94-4.38-.14-.2-1.18-1.57-1.18-3 0-1.42.74-2.12 1.01-2.41.26-.28.7-.41 1.12-.41.14 0 .26 0 .37.01.32.01.49.03.7.54.24.58.83 2.02.9 2.17.08.15.13.32.02.52-.1.2-.16.32-.31.5-.16.17-.33.38-.47.51-.16.15-.32.31-.14.6.18.3.8 1.32 1.72 2.14 1.18 1.05 2.14 1.38 2.47 1.54.32.15.51.13.7-.08.19-.2.8-.93 1.02-1.25.21-.32.43-.27.72-.16.3.1 1.88.89 2.2 1.05.32.16.53.24.61.38.08.15.08.84-.16 1.52z"
                  />
                </svg>
              </span>
              {t("post.shareWa")}
            </a>
            <button type="button" className="post-done-btn" onClick={() => void copy()} data-share="copy">
              <span className="post-done-ico">
                <Copy className="h-5 w-5" aria-hidden />
              </span>
              {t("share.copy")}
            </button>
            {canShare ? (
              <button type="button" className="post-done-btn" onClick={() => void nativeShare()} data-share="native">
                <span className="post-done-ico">
                  <Share2 className="h-5 w-5" aria-hidden />
                </span>
                {t("post.shareNative")}
              </button>
            ) : null}
            {posterAvailable(listing) ? (
              <Link className="post-done-btn" href={`/ilan/${listing.id}?afis=1`} data-share="poster">
                <span className="post-done-ico">
                  <FileImage className="h-5 w-5" aria-hidden />
                </span>
                {t("post.makePoster")}
              </Link>
            ) : null}
          </div>
          {note ? (
            <p className="post-done-note" role="status">
              {note === "copied" ? t("share.copied") : t("share.failed")}
            </p>
          ) : null}
          {canShare ? <p className="post-done-hint">{t("post.shareHint")}</p> : null}
        </div>
      ) : null}

      <button type="button" className="post-done-new" onClick={onNew}>
        <Plus className="h-5 w-5" aria-hidden />
        {t("post.newAnother")}
      </button>
    </section>
  );
}
