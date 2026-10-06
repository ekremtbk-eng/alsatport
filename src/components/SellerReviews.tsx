"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { gatePath } from "@/lib/profile";
import { summarizeReviews } from "@/data/reviews";
import { StarRating } from "@/components/StarRating";
import { useI18n } from "@/context/I18nContext";
import { useSellerReviews } from "@/components/useSellerReviews";
import { reviewAuthorLabel } from "@/lib/publicName";

export function SellerReviews({
  sellerId,
  listingId,
}: {
  sellerId: string;
  listingId?: string;
}) {
  const { user } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const { reviews, submit } = useSellerReviews(sellerId);
  const { dist, count } = summarizeReviews(reviews);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const mine = useMemo(
    () => (user ? reviews.find((r) => r.authorId === user.id) : undefined),
    [reviews, user],
  );

  const isSelf = user?.id === sellerId;

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const gate = gatePath(user);
    if (gate) {
      router.push(gate);
      return;
    }
    if (isSelf) {
      setHint("rev.selfp");
      return;
    }
    const body = text.trim();
    if (body.length < 12) {
      setHint("rev.short");
      return;
    }
    const res = await submit({
      listingId,
      rating,
      text: body,
    });
    if (!res.ok) {
      setHint(res.error ?? "rev.short");
      return;
    }
    setText("");
    setHint(mine ? "rev.ok2" : "rev.ok");
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">{t("rev.h")}</h2>
        <p className="mt-1 text-xs text-muted">{t("rev.p")}</p>
        {count > 0 && (
          <div className="mt-3 space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = dist[n - 1];
              const pct = count ? Math.round((c / count) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-[11px] text-muted">
                  <span className="w-8">{n}★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elev">
                    <div className="h-full rounded-full bg-lime" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right">{c}</span>
                </div>
              );
            })}
          </div>
        )}
        {isSelf ? (
          <p className="mt-3 text-sm text-orange">{t("rev.self")}</p>
        ) : (
          <form onSubmit={(e) => void submitForm(e)} className="mt-4 space-y-3">
            <div>
              <p className="mb-1.5 text-sm text-soft">{t("rev.score")}</p>
              <StarRating value={rating} onChange={setRating} size={28} />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={mine ? t("rev.phUp") : t("rev.ph")}
              className="w-full rounded-xl border border-line bg-panel px-3 py-3 text-sm"
            />
            {hint && (
              <p className={`text-xs ${hint === "rev.ok" || hint === "rev.ok2" ? "text-lime" : "text-orange"}`}>
                {t(hint)}
              </p>
            )}
            <button type="submit" className="btn-primary h-11 w-full sm:w-auto sm:px-6">
              <Send className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{mine ? t("rev.update") : t("rev.send")}</span>
            </button>
          </form>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-bold">{t("rev.list", { n: reviews.length })}</h3>
        {reviews.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {t("rev.first")}
          </p>
        )}
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-card p-3">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.authorAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold">{reviewAuthorLabel(r)}</p>
                    <span className="text-[11px] text-muted">{r.createdAt}</span>
                  </div>
                  <StarRating value={r.rating} readOnly size={14} />
                  <p className="mt-1.5 text-sm leading-relaxed text-soft">{r.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
