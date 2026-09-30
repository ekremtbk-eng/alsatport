"use client";

import { useEffect, useId, useState } from "react";
import { Check, Link2, Share2, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { copyText, listingPublicUrl, listingShareText, socialShareHrefs } from "@/lib/shareListing";

export function ListingShareTrigger({
  variant,
  onOpen,
}: {
  variant: "hero" | "banner" | "icon";
  onOpen: () => void;
}) {
  const { t } = useI18n();
  if (variant === "hero") {
    return (
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white"
        aria-label={t("share.title")}
        onClick={onOpen}
      >
        <Share2 className="h-5 w-5" />
      </button>
    );
  }
  if (variant === "icon") {
    return (
      <button
        type="button"
        className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl border border-line md:grid"
        aria-label={t("share.title")}
        onClick={onOpen}
      >
        <Share2 className="h-5 w-5" />
      </button>
    );
  }
  return (
    <button type="button" className="share-banner" onClick={onOpen}>
      <Share2 className="h-4 w-4" aria-hidden />
      {t("share.title")}
    </button>
  );
}

export function ListingSharePanel({
  listingId,
  title,
  priceLabel,
  open,
  onClose,
}: {
  listingId: string;
  title: string;
  priceLabel: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [canNative, setCanNative] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

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

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  const url = listingPublicUrl(listingId);
  const text = listingShareText(title, priceLabel, url);
  const hrefs = socialShareHrefs(url, text);

  async function copyLink() {
    const ok = await copyText(url);
    if (ok) setCopied(true);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
      onClose();
    } catch {
      /* dismissed */
    }
  }

  return (
    <>
      {copied ? (
        <p className="share-toast" role="status">
          <Check className="h-4 w-4 shrink-0 text-lime" aria-hidden />
          {t("share.copied")}
        </p>
      ) : null}
      {open ? (
        <div className="legal-modal-overlay" onClick={onClose} role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="legal-modal max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 id={titleId} className="text-base font-extrabold text-ink">
                {t("share.title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-elev"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="legal-modal-scroll space-y-2 p-4">
              <p className="truncate text-sm text-muted">{title}</p>
              <button type="button" className="share-row" onClick={() => void copyLink()}>
                <span className="share-ico bg-elev text-ink">
                  {copied ? <Check className="h-4 w-4 text-lime" /> : <Link2 className="h-4 w-4" />}
                </span>
                <span>
                  <span className="block font-bold">{t("share.copy")}</span>
                  <span className="block text-xs text-muted">{t("share.copy.hint")}</span>
                </span>
              </button>
              {canNative ? (
                <button type="button" className="share-row" onClick={() => void nativeShare()}>
                  <span className="share-ico bg-ink text-white">
                    <Share2 className="h-4 w-4" />
                  </span>
                  <span className="font-bold">{t("share.native")}</span>
                </button>
              ) : null}
              <a className="share-row" href={hrefs.whatsapp} target="_blank" rel="noopener noreferrer">
                <span className="share-ico bg-[#25D366] text-white">
                  <WhatsAppMark />
                </span>
                <span className="font-bold">WhatsApp</span>
              </a>
              <a className="share-row" href={hrefs.telegram} target="_blank" rel="noopener noreferrer">
                <span className="share-ico bg-[#229ED9] text-white">
                  <TelegramMark />
                </span>
                <span className="font-bold">Telegram</span>
              </a>
              <a className="share-row" href={hrefs.x} target="_blank" rel="noopener noreferrer">
                <span className="share-ico bg-ink text-white">
                  <XMark />
                </span>
                <span className="font-bold">X</span>
              </a>
              <a className="share-row" href={hrefs.facebook} target="_blank" rel="noopener noreferrer">
                <span className="share-ico bg-[#1877F2] text-white">
                  <FacebookMark />
                </span>
                <span className="font-bold">Facebook</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.94.51 3.82 1.48 5.49L2 22l4.85-1.57a10.1 10.1 0 0 0 5.19 1.45h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.95c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.83-.11-.42-.13-.97-.32-1.67-.63-2.94-1.27-4.85-4.22-5-4.41-.14-.2-1.18-1.57-1.18-3 0-1.42.74-2.12 1-2.41.24-.27.64-.4.86-.4h.62c.2 0 .47-.08.73.56.27.67.91 2.31.99 2.48.08.16.13.36.02.58-.1.2-.16.33-.32.51-.16.18-.33.4-.47.54-.16.16-.32.33-.14.64.18.32.8 1.32 1.72 2.14 1.18 1.05 2.14 1.38 2.47 1.54.32.16.51.13.7-.08.2-.2.8-.93 1.02-1.25.21-.32.43-.27.73-.16.3.1 1.9.9 2.23 1.06.32.16.54.24.62.38.08.13.08.77-.16 1.45z" />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M21.9 4.3 18.7 20c-.24 1.07-.87 1.33-1.76.83l-4.86-3.58-2.34 2.25c-.26.26-.48.48-.98.48l.35-4.94L17.9 6.4c.37-.33-.08-.51-.57-.19L7.2 13.17l-4.78-1.5c-1.04-.32-1.06-1.04.22-1.54L20.55 3.5c.87-.33 1.63.2 1.35.8z" />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M18.9 2H22l-6.8 7.77L23 22h-6.5l-5.1-6.66L5.7 22H2.6l7.27-8.3L1 2h6.66l4.6 6.1L18.9 2zm-1.14 18h1.8L6.35 3.9H4.42L17.76 20z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M13.5 21v-7.2h2.42l.36-2.8H13.5V9.2c0-.81.22-1.36 1.39-1.36H16.5V5.33A18.7 18.7 0 0 0 14.2 5C11.9 5 10.3 6.4 10.3 9v1.99H8v2.8h2.3V21h3.2z" />
    </svg>
  );
}
