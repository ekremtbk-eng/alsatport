"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BRAND_MARK_SRC, BRAND_NAME } from "@/lib/brand";
import {
  hasSeenLoyalty,
  loyaltyCardForJoinedAt,
  markLoyaltySeen,
  type LoyaltyCard,
} from "@/lib/loyalty";

export function LoyaltyMilestone() {
  const { user, hydrated } = useApp();
  const [card, setCard] = useState<LoyaltyCard | null>(null);

  useEffect(() => {
    if (!hydrated || !user?.id) {
      setCard(null);
      return;
    }
    const joinedAt = user.joinedAt;
    if (!joinedAt) {
      setCard(null);
      return;
    }
    const next = loyaltyCardForJoinedAt(joinedAt);
    if (!next || hasSeenLoyalty(user.id, next.id)) {
      setCard(null);
      return;
    }
    setCard(next);
  }, [hydrated, user?.id, user?.joinedAt]);

  if (!card || !user) return null;

  const close = () => {
    markLoyaltySeen(user.id, card.id);
    setCard(null);
  };

  return (
    <div className="loyal-overlay" role="presentation" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loyal-title"
        className={`loyal-card loyal-card--${card.kind}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="loyal-x" onClick={close} aria-label="Kapat">
          <X strokeWidth={2.2} />
        </button>
        <div className="loyal-glow" aria-hidden />
        <div className="loyal-top">
          <img src={BRAND_MARK_SRC} alt="" width={56} height={56} className="loyal-mark" />
          <p className="loyal-brand">{BRAND_NAME}</p>
          <p className="loyal-eyebrow">
            <Sparkles className="loyal-spark" aria-hidden />
            {card.eyebrow}
          </p>
        </div>
        <h2 id="loyal-title" className="loyal-title">
          {card.title}
        </h2>
        <p className="loyal-body">{card.body}</p>
        <p className="loyal-close-copy">{card.closing}</p>
        <p className="loyal-hello">
          Sevgili <strong>{user.displayName || user.username}</strong>, bu kart yalnızca senin dönüm noktan için hazırlandı.
        </p>
        <button type="button" className="loyal-cta" onClick={close}>
          {card.cta}
        </button>
      </div>
    </div>
  );
}
