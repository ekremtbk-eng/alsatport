"use client";

import { useState } from "react";
import { Eye, EyeOff, MessageCircle, Phone, PhoneCall, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { ListingShareTrigger } from "@/components/listing/ListingShare";

export function ListingContactBar({
  phone,
  maskedPhone,
  telHref,
  onMessage,
  onRevealPhone,
  onCall,
  share,
}: {
  phone: string;
  maskedPhone: string;
  telHref: string;
  onMessage: () => void;
  onRevealPhone: () => boolean;
  onCall?: () => boolean;
  share?: {
    listingId: string;
    title: string;
    priceLabel: string;
    imageUrl?: string;
    description?: string;
    kind?: "listing" | "firm";
  };
}) {
  const { t } = useI18n();
  const [showContactBar, setShowContactBar] = useState(true);
  const [showPhone, setShowPhone] = useState(false);

  if (!showContactBar) {
    return (
      <button
        type="button"
        className="lc-reopen"
        onClick={() => setShowContactBar(true)}
      >
        <Phone className="h-4 w-4" />
        {t("list.contact")}
      </button>
    );
  }

  return (
    <div className="lc-bar" role="region" aria-label={t("list.contact")}>
      <button
        type="button"
        className="lc-close"
        onClick={() => setShowContactBar(false)}
        aria-label={t("common.close")}
      >
        <X className="h-5 w-5" strokeWidth={2.8} />
      </button>

      {share ? (
        <ListingShareTrigger
          variant="dock"
          listingId={share.listingId}
          title={share.title}
          priceLabel={share.priceLabel}
          imageUrl={share.imageUrl}
          description={share.description}
          kind={share.kind}
        />
      ) : null}

      <button type="button" className="lc-btn lc-btn-msg" onClick={onMessage}>
        <MessageCircle className="h-4 w-4" />
        <span>{t("list.msg")}</span>
      </button>

      {phone ? (
        <>
      <div className="lc-row">
        <a
          href={telHref}
          className="lc-btn lc-btn-call"
          onClick={(e) => {
            if (onCall && !onCall()) e.preventDefault();
          }}
        >
          <PhoneCall className="h-4 w-4" />
          <span>{t("list.call")}</span>
        </a>
        <button
          type="button"
          className="lc-btn lc-btn-phone"
          onClick={() => {
            if (onRevealPhone()) setShowPhone((v) => !v);
          }}
        >
          {showPhone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{showPhone ? t("list.hide") : t("list.showPhone")}</span>
        </button>
      </div>

      {showPhone ? (
        <a
          href={telHref}
          className="lc-number"
          onClick={(e) => {
            if (onCall && !onCall()) e.preventDefault();
          }}
        >
          <Phone className="h-3.5 w-3.5" />
          {phone}
        </a>
      ) : (
        <p className="lc-mask">{maskedPhone}</p>
      )}
        </>
      ) : (
        <p className="lc-mask">{t("seller.nophone")}</p>
      )}
    </div>
  );
}
