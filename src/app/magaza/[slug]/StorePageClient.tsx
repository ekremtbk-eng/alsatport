"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Globe, Mail, MapPin, MessageCircle, Phone, Tag } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { SellerChatPopup } from "@/components/SellerChatPopup";
import { StoreLogo, VerifiedBusinessBadge } from "@/components/business/StoreBits";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { catName, useI18n } from "@/context/I18nContext";
import type { Listing } from "@/data/store";
import { businessCategoryName, type PublicStore } from "@/lib/business/shared";
import { gatePath } from "@/lib/profile";
import { apiGet } from "@/lib/security/client";

function monthYear(ms: number, locale: string) {
  return new Date(ms).toLocaleDateString(locale === "tr" ? "tr-TR" : locale, { month: "long", year: "numeric" });
}

export function StorePageClient({ store, active, sold }: { store: PublicStore; active: Listing[]; sold: Listing[] }) {
  const { t, locale } = useI18n();
  const { user } = useApp();
  const { requireAuth } = useAuthModal();
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "sold">("active");
  const [contact, setContact] = useState<{ phone: string; email: string } | null>(null);
  const [contactErr, setContactErr] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatListing = active[0];
  const category = catName(t, store.categoryId, businessCategoryName(store.categoryId));
  const where = [store.district, store.city].filter(Boolean).join(", ");
  const shown = tab === "active" ? active : sold;

  async function revealContact() {
    if (!requireAuth("member")) return;
    setContactErr("");
    const res = await apiGet<{ ok?: boolean; phone?: string; email?: string; error?: string }>(
      `/api/stores/${encodeURIComponent(store.slug)}/contact`,
    ).catch(() => null);
    if (res?.ok && res.phone && res.email) setContact({ phone: res.phone, email: res.email });
    else setContactErr(t(res?.error || "auth.err.server"));
  }

  function openChat() {
    const gate = gatePath(user);
    if (gate) {
      router.push(gate);
      return;
    }
    setChatOpen(true);
  }

  return (
    <div className="biz-store">
      <div className="biz-cover">
        {store.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.coverUrl} alt="" />
        ) : null}
      </div>
      <div className="biz-store-inner">
        <header className="biz-head">
          <StoreLogo name={store.name} src={store.logoUrl} size={96} />
          <div className="biz-head-text">
            <h1>{store.name}</h1>
            <VerifiedBusinessBadge />
            <ul className="biz-facts">
              {category ? (
                <li>
                  <Tag aria-hidden="true" />
                  {category}
                </li>
              ) : null}
              {where ? (
                <li>
                  <MapPin aria-hidden="true" />
                  {where}
                </li>
              ) : null}
              <li>
                <CalendarDays aria-hidden="true" />
                {t("biz.memberSince", { date: monthYear(store.memberSince, locale) })}
              </li>
              {store.website ? (
                <li>
                  <Globe aria-hidden="true" />
                  <a href={store.website} target="_blank" rel="noopener noreferrer nofollow ugc">
                    {store.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </header>

        <div className="biz-stats">
          <div>
            <strong>{store.activeCount}</strong>
            <span>{t("biz.activeCount")}</span>
          </div>
          <div>
            <strong>{store.soldCount}</strong>
            <span>{t("biz.soldCount")}</span>
          </div>
        </div>

        <div className="biz-grid">
          <section className="biz-card biz-about">
            <h2>{t("biz.about")}</h2>
            <p>{store.description}</p>
          </section>
          <section className="biz-card biz-contact">
            <h2>{t("biz.contact")}</h2>
            {contact ? (
              <ul className="biz-contact-list">
                <li>
                  <Phone aria-hidden="true" />
                  <a href={`tel:+90${contact.phone.replace(/\D/g, "").replace(/^0/, "")}`}>{contact.phone}</a>
                </li>
                <li>
                  <Mail aria-hidden="true" />
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              </ul>
            ) : (
              <button type="button" className="biz-btn is-primary w-full" onClick={() => void revealContact()}>
                <Phone aria-hidden="true" className="h-4 w-4" />
                {t("biz.showContact")}
              </button>
            )}
            {chatListing ? (
              <button type="button" className="biz-btn w-full" onClick={openChat}>
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                {t("list.msg")}
              </button>
            ) : null}
            {contactErr ? <p className="biz-err">{contactErr}</p> : null}
            <p className="biz-hint">{t("biz.contactHint")}</p>
          </section>
        </div>

        <section id="ilanlar" className="biz-listings">
          <div className="biz-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "active"} className={tab === "active" ? "is-on" : ""} onClick={() => setTab("active")}>
              {t("biz.tab.active", { n: active.length })}
            </button>
            <button type="button" role="tab" aria-selected={tab === "sold"} className={tab === "sold" ? "is-on" : ""} onClick={() => setTab("sold")}>
              {t("biz.tab.sold", { n: sold.length })}
            </button>
          </div>
          {shown.length ? (
            <ListingGrid>
              {shown.map((l) => (
                <div key={l.id} className={tab === "sold" ? "biz-sold" : undefined}>
                  <ListingCard listing={l} />
                  {tab === "sold" ? <span className="biz-sold-tag">{t("biz.sold")}</span> : null}
                </div>
              ))}
            </ListingGrid>
          ) : (
            <p className="biz-empty">{tab === "active" ? t("biz.noActive") : t("biz.noSold")}</p>
          )}
        </section>
        <p className="biz-back">
          <Link href="/magazalar">{t("biz.allStores")}</Link>
        </p>
      </div>
      {chatListing ? <SellerChatPopup listing={chatListing} open={chatOpen} onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
}
