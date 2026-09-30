"use client";

import { ratingBadges, summarizeReviews, type SellerReview } from "@/data/reviews";
import { StarRating } from "@/components/StarRating";
import { useI18n } from "@/context/I18nContext";

export function SellerRatingBlock({
  reviews,
  verified,
}: {
  reviews: SellerReview[];
  verified: boolean;
}) {
  const { t } = useI18n();
  const { avg, count } = summarizeReviews(reviews);
  const raw = ratingBadges(avg, count, verified);
  const badges = raw.map((b) => {
    if (b.label === "Doğrulanmış") return { ...b, label: t("badge.verified") };
    if (b.label === "Süper Satıcı") return { ...b, label: t("badge.super") };
    if (b.label === "Yüksek Puan") return { ...b, label: t("badge.high") };
    if (b.label === "Çok Değerlendirilen") return { ...b, label: t("badge.many") };
    if (b.label.endsWith("değerlendirme")) return { ...b, label: t("badge.nrev", { n: count }) };
    return b;
  });
  const display = count ? avg.toFixed(1) : "—";

  return (
    <div className="seller-rating mt-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="seller-score">{display}</span>
        <div>
          <StarRating value={avg} readOnly size={18} />
          <p className="mt-0.5 text-[11px] font-semibold text-muted">
            {count === 0
              ? t("rev.none")
              : t("rev.over", { n: display, c: count })}
          </p>
        </div>
      </div>
      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b.label} className={`rate-chip rate-chip-${b.tone}`}>
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
