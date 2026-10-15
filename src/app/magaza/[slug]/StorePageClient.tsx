"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Globe,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Search,
  Tag,
} from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { SellerChatPopup } from "@/components/SellerChatPopup";
import { StoreLogo, VerifiedBusinessBadge } from "@/components/business/StoreBits";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { catName, useI18n } from "@/context/I18nContext";
import { placeLabel } from "@/data/locations";
import type { Listing } from "@/data/store";
import { businessCategoryName, businessTypeKey, type PublicStore } from "@/lib/business/shared";
import { listingCategoryChain } from "@/lib/listingFacts";
import { gatePath } from "@/lib/profile";
import { apiGet } from "@/lib/security/client";

type Section = "all" | "featured" | "about" | "contact" | "sold";
type Sort = "new" | "old" | "priceAsc" | "priceDesc";
type View = "list" | "grid";

const HASH: Record<Section, string> = {
  all: "ilanlar",
  featured: "one-cikanlar",
  about: "hakkimizda",
  contact: "iletisim",
  sold: "satilanlar",
};
const VIEW_KEY = "ap-store-view";

function monthYear(ms: number, locale: string) {
  return new Date(ms).toLocaleDateString(locale === "tr" ? "tr-TR" : locale, { month: "long", year: "numeric" });
}

/** Second level of the category tree ("Konut", "İşyeri" …) groups a store's listings best; top level is the fallback. */
function groupOf(listing: Listing) {
  const chain = listingCategoryChain(listing.categoryId);
  return chain[1] ?? chain[0];
}

function StoreListings({ listings, sold = false }: { listings: Listing[]; sold?: boolean }) {
  const { t, locale, formatMoney } = useI18n();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  function pickView(next: View) {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  }

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; n: number }>();
    for (const l of listings) {
      const g = groupOf(l);
      if (!g) continue;
      const hit = map.get(g.id);
      if (hit) hit.n += 1;
      else map.set(g.id, { id: g.id, name: catName(t, g.id, g.name), n: 1 });
    }
    return [...map.values()].sort((a, b) => b.n - a.n);
  }, [listings, t]);

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const rows = listings.filter((l) => {
      if (group && groupOf(l)?.id !== group) return false;
      if (!q) return true;
      return `${l.title} ${l.subtitle ?? ""} ${l.city} ${l.district ?? ""}`.toLocaleLowerCase("tr").includes(q);
    });
    const at = (l: Listing) => (sold ? l.soldAt : undefined) ?? l.postedAt ?? 0;
    return rows.sort((a, b) => {
      if (sort === "old") return at(a) - at(b);
      if (sort === "priceAsc") return a.price - b.price;
      if (sort === "priceDesc") return b.price - a.price;
      return at(b) - at(a);
    });
  }, [listings, query, group, sort, sold]);

  const dateFmt = (ms?: number) =>
    ms ? new Date(ms).toLocaleDateString(locale === "tr" ? "tr-TR" : locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  return (
    <div className="biz-ls">
      <div className="biz-ls-bar">
        <label className="biz-ls-search">
          <Search aria-hidden="true" />
          <span className="sr-only">{t("biz.search")}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("biz.search")} maxLength={80} />
        </label>
        <label className="biz-ls-sort">
          <span className="sr-only">{t("biz.sort.label")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="new">{t("biz.sort.new")}</option>
            <option value="old">{t("biz.sort.old")}</option>
            <option value="priceAsc">{t("biz.sort.priceAsc")}</option>
            <option value="priceDesc">{t("biz.sort.priceDesc")}</option>
          </select>
        </label>
        <div className="biz-ls-view" role="group" aria-label={t("biz.sort.label")}>
          <button type="button" aria-pressed={view === "list"} aria-label={t("biz.view.list")} title={t("biz.view.list")} onClick={() => pickView("list")}>
            <List aria-hidden="true" />
          </button>
          <button type="button" aria-pressed={view === "grid"} aria-label={t("biz.view.grid")} title={t("biz.view.grid")} onClick={() => pickView("grid")}>
            <LayoutGrid aria-hidden="true" />
          </button>
        </div>
      </div>

      {groups.length > 1 ? (
        <div className="biz-ls-chips">
          <button type="button" aria-pressed={!group} onClick={() => setGroup("")}>
            {t("biz.cat.all")} <span>{listings.length}</span>
          </button>
          {groups.map((g) => (
            <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(group === g.id ? "" : g.id)}>
              {g.name} <span>{g.n}</span>
            </button>
          ))}
        </div>
      ) : null}

      {!listings.length ? (
        <p className="biz-empty">{sold ? t("biz.noSold") : t("biz.noActive")}</p>
      ) : !shown.length ? (
        <div className="biz-empty">
          <p>{t("biz.noMatch")}</p>
          <button
            type="button"
            className="biz-link"
            onClick={() => {
              setQuery("");
              setGroup("");
            }}
          >
            {t("biz.clearFilters")}
          </button>
        </div>
      ) : view === "grid" ? (
        <ListingGrid>
          {shown.map((l) => (
            <div key={l.id} className={sold ? "biz-sold" : undefined}>
              <ListingCard listing={l} />
              {sold ? <span className="biz-sold-tag">{t("biz.sold")}</span> : null}
            </div>
          ))}
        </ListingGrid>
      ) : (
        <div className={`biz-rows${sold ? " is-sold" : ""}`}>
          <div className="biz-rows-head" aria-hidden="true">
            <span />
            <span>{t("biz.col.title")}</span>
            <span>{t("biz.col.place")}</span>
            <span>{t("biz.col.date")}</span>
            <span>{t("biz.col.price")}</span>
          </div>
          <ul>
            {shown.map((l) => {
              const g = groupOf(l);
              return (
                <li key={l.id}>
                  <Link href={`/ilan/${l.id}`} className="biz-row">
                    <span className="biz-row-photo">
                      {l.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.images[0]} alt="" loading="lazy" decoding="async" />
                      ) : null}
                      {sold ? <span className="biz-sold-tag">{t("biz.sold")}</span> : null}
                    </span>
                    <span className="biz-row-title">
                      <strong>{l.title}</strong>
                      {g ? <small>{catName(t, g.id, g.name)}</small> : null}
                    </span>
                    <span className="biz-row-place">{placeLabel(l.city, l.district, " / ")}</span>
                    <span className="biz-row-date">{dateFmt(sold ? l.soldAt ?? l.postedAt : l.postedAt)}</span>
                    <span className="biz-row-price">{formatMoney(l.price, l.currency)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function StorePageClient({
  store,
  sellerId,
  active,
  sold,
}: {
  store: PublicStore;
  sellerId: string;
  active: Listing[];
  sold: Listing[];
}) {
  const { t, locale } = useI18n();
  const { user } = useApp();
  const { requireAuth } = useAuthModal();
  const router = useRouter();
  const [section, setSection] = useState<Section>("all");
  const [contact, setContact] = useState<{ phone: string; email: string } | null>(null);
  const [contactErr, setContactErr] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatListing = active[0];
  const featured = useMemo(() => active.filter((l) => l.featured || l.vip), [active]);
  const category = catName(t, store.categoryId, businessCategoryName(store.categoryId));
  const where = [store.district, store.city].filter(Boolean).join(", ");
  const isOwner = !!user && user.id === sellerId;
  const districts = store.serviceDistricts ?? [];
  const hours = store.hours ?? null;

  const sections: { id: Section; label: string; show: boolean }[] = [
    { id: "all", label: `${t("biz.nav.all")} (${store.activeCount})`, show: true },
    { id: "featured", label: `${t("biz.nav.featured")} (${featured.length})`, show: featured.length > 0 },
    { id: "about", label: t("biz.about"), show: true },
    { id: "contact", label: t("biz.contact"), show: true },
    { id: "sold", label: t("biz.tab.sold", { n: sold.length }), show: sold.length > 0 },
  ];

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      const hit = (Object.keys(HASH) as Section[]).find((k) => HASH[k] === hash);
      if (hit && (hit !== "featured" || featured.length) && (hit !== "sold" || sold.length)) setSection(hit);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [featured.length, sold.length]);

  function open(next: Section) {
    setSection(next);
    window.history.replaceState(null, "", next === "all" ? window.location.pathname + window.location.search : `#${HASH[next]}`);
  }

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
          <img src={store.coverUrl} alt="" fetchPriority="high" />
        ) : null}
      </div>
      <div className="biz-store-inner">
        <header className="biz-head">
          <StoreLogo name={store.name} src={store.logoUrl} size={112} />
          <div className="biz-head-text">
            <h1>{store.name}</h1>
            <p className="biz-head-type">{t(businessTypeKey(store.categoryId))}</p>
            <VerifiedBusinessBadge />
            <ul className="biz-facts">
              {where ? (
                <li>
                  <MapPin aria-hidden="true" />
                  {where}
                </li>
              ) : null}
              {category ? (
                <li>
                  <Tag aria-hidden="true" />
                  {category}
                </li>
              ) : null}
              <li>
                <CalendarDays aria-hidden="true" />
                {t("biz.memberSince", { date: monthYear(store.memberSince, locale) })}
              </li>
            </ul>
          </div>
          <div className="biz-head-actions">
            {chatListing && !isOwner ? (
              <button type="button" className="biz-btn is-primary" onClick={openChat}>
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                {t("list.sendMsg")}
              </button>
            ) : null}
            {isOwner ? (
              <Link href="/isletme-paneli" className="biz-btn">
                <Pencil aria-hidden="true" className="h-4 w-4" />
                {t("biz.editStore")}
              </Link>
            ) : null}
          </div>
        </header>

        <nav className="biz-nav" aria-label={t("biz.nav.label")}>
          {sections
            .filter((s) => s.show)
            .map((s) => (
              <a
                key={s.id}
                href={`#${HASH[s.id]}`}
                aria-current={section === s.id ? "page" : undefined}
                className={section === s.id ? "is-on" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  open(s.id);
                }}
              >
                {s.label}
              </a>
            ))}
        </nav>

        <div className="biz-body">
          <section id="ilanlar" className="biz-listings" hidden={section !== "all"}>
            <p className="biz-portfolio">{t("biz.portfolio", { n: store.activeCount })}</p>
            <StoreListings listings={active} />
          </section>
          {featured.length ? (
            <section id="one-cikanlar" className="biz-listings" hidden={section !== "featured"}>
              <StoreListings listings={featured} />
            </section>
          ) : null}
          {sold.length ? (
            <section id="satilanlar" className="biz-listings" hidden={section !== "sold"}>
              <StoreListings listings={sold} sold />
            </section>
          ) : null}

          <section id="hakkimizda" className="biz-card biz-about" hidden={section !== "about"}>
            <h2>{t("biz.about")}</h2>
            <p>{store.description}</p>
            {districts.length ? (
              <>
                <h3>{t("biz.regions")}</h3>
                <ul className="biz-chips">
                  {districts.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section id="iletisim" className="biz-card biz-contact" hidden={section !== "contact"}>
            <h2>{t("biz.contact")}</h2>
            <ul className="biz-contact-list">
              {where ? (
                <li>
                  <MapPin aria-hidden="true" />
                  <span>{where}</span>
                </li>
              ) : null}
              {store.website ? (
                <li>
                  <Globe aria-hidden="true" />
                  <a href={store.website} target="_blank" rel="noopener noreferrer nofollow ugc">
                    {store.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </li>
              ) : null}
              {contact ? (
                <>
                  <li>
                    <Phone aria-hidden="true" />
                    <a href={`tel:+90${contact.phone.replace(/\D/g, "").replace(/^0/, "")}`}>{contact.phone}</a>
                  </li>
                  <li>
                    <Mail aria-hidden="true" />
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </li>
                </>
              ) : null}
            </ul>
            {hours ? (
              <div className="biz-hours">
                <h3>
                  <Clock aria-hidden="true" />
                  {t("biz.hours")}
                </h3>
                {hours.always ? (
                  <p>{t("firm.hours.always")}</p>
                ) : (
                  <ul>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const row = hours.days.find((d) => d.day === day);
                      return (
                        <li key={day}>
                          <span>{t(`day.${day}`)}</span>
                          <strong>{row ? `${row.open} – ${row.close}` : t("firm.hours.closedDay")}</strong>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
            <div className="biz-contact-actions">
              {contact ? null : (
                <button type="button" className="biz-btn is-primary" onClick={() => void revealContact()}>
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  {t("biz.showContact")}
                </button>
              )}
              {chatListing && !isOwner ? (
                <button type="button" className="biz-btn" onClick={openChat}>
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  {t("list.sendMsg")}
                </button>
              ) : null}
            </div>
            {contactErr ? <p className="biz-err">{contactErr}</p> : null}
            <p className="biz-hint">{t("biz.contactHint")}</p>
          </section>
        </div>

        <p className="biz-back">
          <Link href="/magazalar">{t("biz.allStores")}</Link>
        </p>
      </div>
      {chatListing ? <SellerChatPopup listing={chatListing} open={chatOpen} onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
}
