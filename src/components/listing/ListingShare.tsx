"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Share2, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { BRAND_MARK_SRC, BRAND_NAME } from "@/lib/brand";
import { ProtectedPhoto } from "@/components/ProtectedPhoto";
import {
  canUseWebShare,
  copyText,
  facebookShareHref,
  listingPublicUrl,
  listingShareBlurb,
  listingTelegramText,
  listingTweetText,
  listingWebShareData,
  listingWhatsAppMessage,
  listingWhatsAppStatusText,
  telegramShareHref,
  twitterShareHref,
  whatsappShareHref,
} from "@/lib/shareListing";

type ShareVariant = "hero" | "banner" | "icon" | "toolbar" | "dock";
type ShareKind = "listing" | "firm";

export function ListingShareTrigger({
  variant,
  listingId,
  title,
  priceLabel,
  imageUrl,
  description,
  kind = "listing",
}: {
  variant: ShareVariant;
  listingId: string;
  title: string;
  priceLabel: string;
  imageUrl?: string;
  description?: string;
  kind?: ShareKind;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<"copied" | "status" | "failed" | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function startShare() {
    const url = listingPublicUrl(listingId, kind);
    const data = listingWebShareData({ title, priceLabel, url });
    if (canUseWebShare(data)) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  const toastEl = toast ? (
    <p className="share-toast" role="status">
      <Check className="h-4 w-4 shrink-0 text-lime" aria-hidden />
      {toast === "copied" ? t("share.copied") : toast === "status" ? t("share.statusCopied") : t("share.failed")}
    </p>
  ) : null;

  return (
    <>
      {toastEl}
      <ShareOpenButton variant={variant} label={t("share.title")} onClick={() => void startShare()} />
      <ShareModal
        open={open}
        onClose={() => setOpen(false)}
        listingId={listingId}
        title={title}
        priceLabel={priceLabel}
        imageUrl={imageUrl}
        description={description}
        kind={kind}
        onToast={setToast}
      />
    </>
  );
}

function ShareOpenButton({
  variant,
  label,
  onClick,
}: {
  variant: ShareVariant;
  label: string;
  onClick: () => void;
}) {
  if (variant === "hero") {
    return (
      <button
        type="button"
        className="relative z-30 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white shadow-md"
        aria-label={label}
        onClick={onClick}
      >
        <Share2 className="h-5 w-5" />
      </button>
    );
  }
  if (variant === "icon" || variant === "toolbar") {
    return (
      <button
        type="button"
        className={
          variant === "toolbar"
            ? "classified-icon-btn"
            : "grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line"
        }
        aria-label={label}
        onClick={onClick}
      >
        <Share2 className="h-5 w-5" />
      </button>
    );
  }
  if (variant === "dock") {
    return (
      <button type="button" className="lc-btn lc-btn-share" onClick={onClick}>
        <Share2 className="h-4 w-4" aria-hidden />
        <span>{label}</span>
      </button>
    );
  }
  return (
    <button type="button" className="share-banner" onClick={onClick}>
      <Share2 className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function ShareModal({
  open,
  onClose,
  listingId,
  title,
  priceLabel,
  imageUrl,
  description,
  kind,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
  title: string;
  priceLabel: string;
  imageUrl?: string;
  description?: string;
  kind: ShareKind;
  onToast: (kind: "copied" | "status" | "failed") => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const blurb = listingShareBlurb(description, 180);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const url = listingPublicUrl(listingId, kind);
  const waText = listingWhatsAppMessage({ title, priceLabel, url, description });
  const waStatus = listingWhatsAppStatusText({ title, priceLabel, url });
  const telegramText = listingTelegramText({ title, priceLabel, description });
  const tweet = listingTweetText({ title, priceLabel });

  async function copyLink() {
    const ok = await copyText(url);
    onToast(ok ? "copied" : "failed");
    if (ok) onClose();
  }

  async function shareWhatsAppStatus() {
    const ok = await copyText(waStatus);
    onToast(ok ? "status" : "failed");
  }

  const dialog = (
    <div className="share-modal-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="share-modal-head">
          <div className="share-modal-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_MARK_SRC} alt="" className="share-modal-logo" width={44} height={44} />
            <div>
              <p className="share-modal-brand-name">{BRAND_NAME}</p>
              <p className="share-modal-kicker">{t("share.kicker")}</p>
            </div>
          </div>
          <button type="button" className="share-modal-x" onClick={onClose} aria-label={t("common.close")}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <h2 id={titleId} className="share-modal-title">
          {t("share.title")}
        </h2>

        <div className="share-modal-card">
          {imageUrl ? (
            <ProtectedPhoto src={imageUrl} alt="" imgClassName="share-modal-thumb" />
          ) : (
            <ProtectedPhoto src={BRAND_MARK_SRC} alt="" imgClassName="share-modal-thumb" />
          )}
          <div className="share-modal-meta">
            <p className="share-modal-listing">{title}</p>
            <p className="share-modal-price">{priceLabel}</p>
            {blurb ? <p className="share-modal-desc">{blurb}</p> : null}
          </div>
        </div>

        <div className="share-modal-grid">
          <button type="button" className="share-modal-btn" onClick={() => void copyLink()}>
            <span className="share-modal-ico is-copy">
              <Copy className="h-4 w-4" />
            </span>
            {t("share.copy")}
          </button>
          <a className="share-modal-btn" href={whatsappShareHref(waText)} target="_blank" rel="noopener noreferrer">
            <span className="share-modal-ico is-wa">
              <WhatsAppMark />
            </span>
            {t("share.wa")}
          </a>
          <a
            className="share-modal-btn"
            href={whatsappShareHref(waStatus)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void shareWhatsAppStatus()}
          >
            <span className="share-modal-ico is-wa">
              <WhatsAppMark />
            </span>
            {t("share.waStatus")}
          </a>
          <a
            className="share-modal-btn"
            href={telegramShareHref(url, telegramText)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="share-modal-ico is-tg">
              <TelegramMark />
            </span>
            {t("share.telegram")}
          </a>
          <a className="share-modal-btn" href={twitterShareHref(url, tweet)} target="_blank" rel="noopener noreferrer">
            <span className="share-modal-ico is-x">
              <XMark />
            </span>
            {t("share.x")}
          </a>
          <a className="share-modal-btn" href={facebookShareHref(url)} target="_blank" rel="noopener noreferrer">
            <span className="share-modal-ico is-fb">
              <FacebookMark />
            </span>
            {t("share.facebook")}
          </a>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.74.46 3.44 1.34 4.94L2 22l5.37-1.41a10 10 0 0 0 4.67 1.19h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.26-4.79-4.18-4.94-4.38-.14-.2-1.18-1.57-1.18-3 0-1.42.74-2.12 1.01-2.41.26-.28.7-.41 1.12-.41.14 0 .26 0 .37.01.32.01.49.03.7.54.24.58.83 2.02.9 2.17.08.15.13.32.02.52-.1.2-.16.32-.31.5-.16.17-.33.38-.47.51-.16.15-.32.31-.14.6.18.3.8 1.32 1.72 2.14 1.18 1.05 2.14 1.38 2.47 1.54.32.15.51.13.7-.08.19-.2.8-.93 1.02-1.25.21-.32.43-.27.72-.16.3.1 1.88.89 2.2 1.05.32.16.53.24.61.38.08.15.08.84-.16 1.52z"
      />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.95 4.3 18.7 19.6c-.24 1.07-.88 1.33-1.78.83l-4.92-3.63-2.37 2.28c-.26.26-.48.48-.99.48l.35-5.02 9.13-8.25c.4-.35-.09-.55-.61-.2L6.3 12.8 1.44 11.3c-1.05-.33-1.07-1.05.23-1.56L20.6 3.08c.88-.33 1.64.2 1.35 1.22z"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M18.24 2H21l-6.52 7.45L22 22h-6.17l-4.82-6.3L5.4 22H2.63l6.97-7.97L2 2h6.31l4.36 5.77L18.24 2zm-1.08 18.02h1.7L7 3.88H5.18l11.98 16.14z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.26h3.34l-.53 3.49h-2.81V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  );
}
