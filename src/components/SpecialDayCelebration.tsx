"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BRAND_MARK_SRC, BRAND_NAME } from "@/lib/brand";
import { apiGet } from "@/lib/security/client";
import { hasSeenSpecialDay, markSpecialDaySeen } from "@/lib/specialDaySeen";

export type PublicSpecialDay = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  theme: string;
  eyebrow: string;
  title: string;
  body: string;
  closing: string;
  cta: string;
  dateKey: string;
};

export function SpecialDayCelebration({
  onReady,
}: {
  onReady?: (open: boolean) => void;
}) {
  const { user, hydrated, pushNotifs } = useApp();
  const [card, setCard] = useState<PublicSpecialDay | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet<{ ok?: boolean; day?: PublicSpecialDay | null }>(
          "/api/special-days/today",
        );
        if (cancelled) return;
        const day = res.day ?? null;
        if (!day) {
          setCard(null);
          onReady?.(false);
          return;
        }
        const who = user?.id || "guest";
        pushNotifs([
          {
            id: `special:${day.id}:${day.dateKey}`,
            kind: "system",
            title: day.eyebrow,
            body: day.title,
            href: "/",
            createdAt: Date.now() - 15_000,
            read: false,
          },
        ]);
        if (hasSeenSpecialDay(who, day.id, day.dateKey)) {
          setCard(null);
          onReady?.(false);
          return;
        }
        setCard(day);
        onReady?.(true);
      } catch {
        if (!cancelled) {
          setCard(null);
          onReady?.(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.id, onReady, pushNotifs]);

  if (!card) return null;

  const close = () => {
    markSpecialDaySeen(user?.id || "guest", card.id, card.dateKey);
    setCard(null);
    onReady?.(false);
  };

  return (
    <div className="loyal-overlay special-overlay" role="presentation" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="special-title"
        className={`loyal-card special-card special-card--${card.theme}`}
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
        <h2 id="special-title" className="loyal-title">
          {card.title}
        </h2>
        <p className="loyal-body">{card.body}</p>
        <p className="loyal-close-copy">{card.closing}</p>
        <button type="button" className="loyal-cta" onClick={close}>
          {card.cta}
        </button>
      </div>
    </div>
  );
}
