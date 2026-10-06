"use client";

import { useState } from "react";
import Link from "next/link";
import type { Listing } from "@/data/store";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { remainingState } from "@/lib/listingQuota";
import { posterSupported } from "@/lib/poster";

type Tab = "active" | "pending" | "expired" | "passive" | "sold";
const TABS: { id: Tab; key: string }[] = [
  { id: "active", key: "my.active" },
  { id: "pending", key: "my.pending" },
  { id: "expired", key: "my.expired" },
  { id: "passive", key: "my.passive" },
  { id: "sold", key: "my.sold" },
];
const EMPTY: Record<Tab, string> = {
  active: "my.empty.a",
  pending: "my.empty.pending",
  expired: "my.empty.e",
  passive: "my.empty.p",
  sold: "my.empty.s",
};

function inTab(l: Listing, tab: Tab) {
  if (tab === "passive") return l.status === "passive" || l.status === "rejected";
  return l.status === tab;
}

function shortDate(ms?: number) {
  return ms ? new Date(ms).toLocaleDateString("tr-TR") : "";
}

const chip = "rounded-full px-2.5 py-1 text-[11px] font-bold leading-none";

export function SellerListings({ rounded = "rounded-xl" }: { rounded?: string }) {
  const { user, listings, setListingStatus, removeListing, renewListing, setListingSale } = useApp();
  const { formatMoney, t } = useI18n();
  const [tab, setTab] = useState<Tab>("active");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) return null;

  const mine = listings.filter((l) => l.sellerId === user.id);
  const rows = mine.filter((l) => inTab(l, tab));

  async function run(id: string, job: () => Promise<{ ok: boolean; error?: string }>, okKey: string) {
    setBusy(id);
    setNotice(null);
    const res = await job();
    setBusy(null);
    setNotice(res.ok ? { ok: true, text: t(okKey) } : { ok: false, text: t(res.error ?? "auth.err.server") });
  }

  const republish = (id: string) =>
    run(id, async () => ((await renewListing(id)) ? { ok: true } : { ok: false, error: "listing.err.notRenewable" }), "my.republished");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((x) => {
          const n = mine.filter((l) => inTab(l, x.id)).length;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`chip ${tab === x.id ? "chip-on" : ""}`}
            >
              {t(x.key)}
              {n ? <span className="ml-1 opacity-70">({n})</span> : null}
            </button>
          );
        })}
      </div>
      {notice ? (
        <p role="status" className={`mb-3 text-sm font-semibold ${notice.ok ? "text-lime" : "text-orange"}`}>
          {notice.text}
        </p>
      ) : null}
      <div className="space-y-2">
        {rows.map((l) => {
          const rem = l.status === "active" ? remainingState(l.expiresAt) : null;
          const pending = busy === l.id;
          return (
            <div key={l.id} className={`flex flex-col gap-3 ${rounded} border border-line bg-card p-2 sm:flex-row`}>
              <div className="flex min-w-0 flex-1 gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.images[0]} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <Link href={`/ilan/${l.id}`} className="line-clamp-2 font-semibold">
                    {l.title} {l.subtitle}
                  </Link>
                  <p className="price-text text-sm font-bold">{formatMoney(l.price)}</p>
                  <p className="text-xs text-muted">
                    {l.views} {t("my.views")} · {l.city}
                  </p>
                  {rem ? (
                    <p
                      className={`mt-1 text-xs font-bold ${rem.key === "left" && rem.days > 3 ? "text-lime" : "text-orange"}`}
                    >
                      {t(`my.rem.${rem.key}`, { n: rem.days })}
                    </p>
                  ) : null}
                  {l.status === "expired" ? <p className="mt-1 text-xs font-bold text-orange">{t("my.rem.expired")}</p> : null}
                  {l.status === "sold" ? (
                    <p className="mt-1 text-xs font-bold text-blue">
                      {t("my.soldChip")}
                      {l.soldAt ? ` · ${shortDate(l.soldAt)}` : ""}
                    </p>
                  ) : null}
                  {l.status === "rejected" ? <p className="mt-1 text-xs font-bold text-orange">{t("my.rejected")}</p> : null}
                  {(l.status === "active" || l.status === "expired") && l.expiresAt ? (
                    <p className="text-[11px] text-muted">
                      {t("my.postedOn", { date: shortDate(l.postedAt) })} · {t("my.endsOn", { date: shortDate(l.expiresAt) })}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-1.5 sm:max-w-[13rem] sm:justify-end">
                {l.status === "expired" ? (
                  <button type="button" disabled={pending} onClick={() => void republish(l.id)} className={`${chip} bg-lime text-white`}>
                    {t("my.republish")}
                  </button>
                ) : null}
                {l.status === "active" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setListingStatus(l.id, "passive")}
                    className={`${chip} bg-lime/15 text-lime`}
                  >
                    {t("my.deactivate")}
                  </button>
                ) : null}
                {l.status === "passive" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!l.expiresAt || l.expiresAt <= Date.now()) void republish(l.id);
                      else setListingStatus(l.id, "active");
                    }}
                    className={`${chip} bg-lime/15 text-lime`}
                  >
                    {t("my.activate")}
                  </button>
                ) : null}
                {l.status === "active" || l.status === "expired" || l.status === "passive" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(l.id, () => setListingSale(l.id, "sold"), "my.soldDone")}
                    className={`${chip} bg-blue/10 text-blue`}
                  >
                    {t("my.markSold")}
                  </button>
                ) : null}
                {l.status === "sold" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(l.id, () => setListingSale(l.id, "resale"), "my.resaleDone")}
                    className={`${chip} bg-lime text-white`}
                  >
                    {t("my.resale")}
                  </button>
                ) : null}
                {l.status !== "sold" ? (
                  <Link href={`/ilan-ver?edit=${l.id}`} className={`${chip} bg-blue/10 text-blue`}>
                    {t("common.edit")}
                  </Link>
                ) : null}
                {l.status === "active" && posterSupported(l) ? (
                  <Link href={`/ilan/${l.id}?afis=1`} className={`${chip} bg-lime/10 text-lime`}>
                    {t("poster.short")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(t("my.deleteConfirm"))) void removeListing(l.id);
                  }}
                  className={`${chip} bg-orange/15 text-orange`}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="dash-empty">{t(EMPTY[tab])}</p> : null}
      </div>
    </div>
  );
}
