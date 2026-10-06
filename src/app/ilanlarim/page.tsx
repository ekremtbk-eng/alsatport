"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { posterSupported } from "@/lib/poster";

export default function MyListingsPage() {
  const { user, listings, setListingStatus, removeListing, renewListing } = useApp();
  const { formatMoney, t } = useI18n();
  const [tab, setTab] = useState<"active" | "passive" | "pending">("active");
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t("my.h")}</h1>
        <p className="mt-2 text-sm text-muted">{t("auth.login.p")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/giris" className="btn-ghost h-12 px-6">
            {t("nav.login")}
          </Link>
          <Link href="/kayit" className="btn-primary h-12 px-6">
            {t("nav.signup")}
          </Link>
        </div>
      </div>
    );
  }

  const mine = listings.filter((l) => {
    if (l.sellerId !== user.id) return false;
    if (tab === "pending") return l.status === "pending";
    if (tab === "active") return l.status === "active";
    return l.status === "passive" || l.status === "rejected";
  });

  return (
    <div className="mx-auto max-w-2xl px-3 py-4">
      <h1 className="mb-4 text-xl font-bold">{t("my.h")}</h1>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("active")}
          className={`chip ${tab === "active" ? "chip-on" : ""}`}
        >
          {t("my.active")}
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`chip ${tab === "pending" ? "chip-on" : ""}`}
        >
          {t("my.pending")}
        </button>
        <button
          onClick={() => setTab("passive")}
          className={`chip ${tab === "passive" ? "chip-on" : ""}`}
        >
          {t("my.passive")}
        </button>
      </div>
      <div className="space-y-2">
        {mine.map((l) => (
          <div key={l.id} className="flex gap-3 rounded-2xl border border-line bg-card p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.images[0]} alt="" className="h-20 w-24 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link href={`/ilan/${l.id}`} className="font-semibold">
                {l.title} {l.subtitle}
              </Link>
              <p className="price-text text-sm font-bold">{formatMoney(l.price)}</p>
              <p className="text-xs text-muted">
                {l.views} {t("my.views")} · {l.city}
                {l.expiresAt
                  ? ` · ${t("quota.until", { date: new Date(l.expiresAt).toLocaleDateString("tr-TR") })}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  if (tab === "passive" && l.expiresAt && l.expiresAt <= Date.now()) {
                    void renewListing(l.id);
                    return;
                  }
                  setListingStatus(l.id, tab === "active" ? "passive" : "active");
                }}
                className="self-start rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-bold text-lime"
              >
                {tab === "active" ? t("my.activeChip") : t("my.passiveChip")}
              </button>
              {l.expiresAt ? (
                <button
                  type="button"
                  onClick={() => void renewListing(l.id)}
                  className="self-start rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-bold text-blue"
                >
                  {t("quota.renew")}
                </button>
              ) : null}
              <Link
                href={`/ilan-ver?edit=${l.id}`}
                className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-bold text-blue"
              >
                {t("common.edit")}
              </Link>
              {l.status === "active" && posterSupported(l) ? (
                <Link
                  href={`/ilan/${l.id}?afis=1`}
                  className="rounded-full bg-lime/10 px-2 py-0.5 text-[10px] font-bold text-lime"
                >
                  {t("poster.short")}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => removeListing(l.id)}
                className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold text-orange"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
        {mine.length === 0 && (
          <p className="rounded-2xl border border-line bg-card p-8 text-center text-muted">
            {tab === "active" ? t("my.empty.a") : t("my.empty.p")}
          </p>
        )}
      </div>
    </div>
  );
}
