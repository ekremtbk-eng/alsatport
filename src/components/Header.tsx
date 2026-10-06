"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { Logo } from "./Logo";
import { useApp } from "@/context/AppContext";
import { useEffect, useState } from "react";
import { NotificationPanel } from "./NotificationPanel";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SearchSuggest } from "./SearchSuggest";
import { UserMenu } from "./UserMenu";
import { useI18n } from "@/context/I18nContext";
import { AuthGateLink } from "@/components/AuthGateLink";
import { LiveVisitorsBadge } from "@/components/home/LiveVisitorsBadge";
import { SiteSitelinksNav } from "@/components/SiteSitelinksNav";
import { HOME_HERO_CATEGORIES } from "@/data/homeHubs";
import { CategoryMegaMenu } from "@/components/CategoryMegaMenu";
import { findCategory } from "@/data/categories";
import { TURKEY_CITIES } from "@/data/turkey";
import { useDevice } from "@/context/DeviceContext";

function readUrlState(pathname: string) {
  if (typeof window === "undefined") return { q: "", city: "", catId: "" };
  const sp = new URLSearchParams(window.location.search);
  const q = (sp.get("q") ?? "").trim();
  const city = (sp.get("city") ?? "").trim();
  const slug = (sp.get("kategori") ?? sp.get("cat") ?? "").trim();
  if (pathname.startsWith("/is-ilanlari")) return { q, city, catId: "jobs" };
  if (pathname.startsWith("/ustalar-hizmetler")) return { q, city, catId: "services" };
  const cat = slug ? findCategory(slug) : undefined;
  return { q, city, catId: cat?.id ?? "" };
}

export function Header() {
  const { unreadNotifications } = useApp();
  const { t } = useI18n();
  const { isPhone } = useDevice();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");
  const [city, setCity] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [suggestOn, setSuggestOn] = useState(false);

  useEffect(() => {
    const next = readUrlState(pathname);
    setQ(next.q);
    setCity(next.city);
    setCatId(next.catId);
  }, [pathname]);

  function goSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    if (catId === "jobs") {
      router.push(params.toString() ? `/is-ilanlari?${params}` : "/is-ilanlari");
      return;
    }
    if (catId === "services") {
      router.push(params.toString() ? `/ustalar-hizmetler?${params}` : "/ustalar-hizmetler");
      return;
    }
    if (catId) {
      const cat = findCategory(catId);
      if (cat) params.set("kategori", cat.slug);
    }
    const qs = params.toString();
    router.push(qs ? `/ara?${qs}` : "/ara");
  }

  const notifBtn = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setNotifOpen((v) => !v)}
        className="hdr-ico"
        aria-label={t("nav.notifications")}
        data-notif-toggle
      >
        <Bell className="h-4 w-4" />
        {unreadNotifications > 0 ? (
          <span>{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>
        ) : null}
      </button>
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );

  return (
    <header className="site-header sticky top-0 z-40">
      <div className="hdr-utility">
        <div className="hdr-inner">
          <span className="hdr-tr">{t("acil.turkey")}</span>
          <div className="hdr-utility-actions">
            <LiveVisitorsBadge compact />
            <LanguageSwitcher bar />
            {!isPhone ? notifBtn : null}
            {!isPhone ? <UserMenu utility /> : null}
          </div>
        </div>
      </div>

      <div className="hdr-main">
        <div className="hdr-inner hdr-main-row">
          <div className="relative">
            <button
              type="button"
              className="hdr-menu"
              aria-label={t("nav.categories")}
              aria-expanded={megaOpen}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setMegaOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <CategoryMegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
          </div>
          <Logo />
          <form className="header-search hdr-search min-w-0 flex-1" onSubmit={goSearch}>
            <div className="header-search-combo">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setSuggestOn(true)}
                  onBlur={() => window.setTimeout(() => setSuggestOn(false), 180)}
                  placeholder={t("nav.search")}
                  className="header-search-input h-11 w-full border-0 bg-transparent ps-9 pe-3 text-sm text-slate-800 focus:outline-none"
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={q.trim().length > 1 && suggestOn}
                />
                <SearchSuggest
                  query={q}
                  active={suggestOn}
                  extraParams={{
                    ...(city ? { city } : {}),
                    ...(catId && catId !== "jobs" && catId !== "services"
                      ? { kategori: findCategory(catId)?.slug ?? "" }
                      : {}),
                  }}
                  onPick={() => setQ("")}
                />
              </div>
              <label className="header-search-cat">
                <span className="sr-only">{t("nav.categories")}</span>
                <select value={catId} onChange={(e) => setCatId(e.target.value)}>
                  {HOME_HERO_CATEGORIES.map((c) => (
                    <option key={c.id || "all"} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="header-search-city">
                <span className="sr-only">{t("acil.turkey")}</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">{t("acil.turkey")}</option>
                  {TURKEY_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="header-search-go">
                {t("home.ara")}
              </button>
            </div>
          </form>
          {isPhone ? (
            <div className="hdr-mobile-actions">
              {notifBtn}
              <UserMenu />
            </div>
          ) : null}
          <AuthGateLink href="/ilan-ver" className="header-post hdr-post">
            {t("nav.post")}
          </AuthGateLink>
        </div>
      </div>

      <SiteSitelinksNav />
    </header>
  );
}
