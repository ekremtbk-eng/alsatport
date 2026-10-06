"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findCategory, findCategoryFromRenoPath, hrefForCategory } from "@/data/categories";
import { useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { SERVICE_OFFER_PATH } from "@/lib/serviceOffer";
import { ServicesLogo } from "@/components/ServicesLogo";

export const SERVICE_PORTAL_TABS = [
  { id: "services-reno", label: "Ev Tadilat & Dekorasyon" },
  { id: "services-move", label: "Nakliye" },
  { id: "services-auto", label: "Araç Servis & Bakım" },
  { id: "services-repair", label: "Tamirat & Teknik Servis" },
  { id: "services-event", label: "Düğün & Etkinlik" },
  { id: "services-other", label: "Diğer" },
] as const;

export function isServicesPortalPath(path: string) {
  if (path.startsWith("/ustalar-hizmetler") || path.startsWith("/acil")) return true;
  const m = path.match(/^\/kategoriler\/([^/]+)/);
  if (!m) return false;
  const cat = findCategory(decodeURIComponent(m[1]));
  return Boolean(cat && (cat.id === "services" || cat.id.startsWith("services-")));
}

export function ServicesPortalNav() {
  const path = usePathname();
  const { t } = useI18n();
  const { user } = useApp();
  if (!isServicesPortalPath(path)) return null;

  return (
    <div className="svc-portal">
      <div className="svc-portal-top">
        <Link href="/kategoriler/ustalar-hizmetler" className="svc-portal-brand" aria-label={t("cat.services")}>
          <ServicesLogo />
        </Link>
        <div className="svc-portal-actions">
          {user ? null : (
            <Link href="/giris" className="svc-portal-login">
              {t("nav.login")}
            </Link>
          )}
          <Link href={SERVICE_OFFER_PATH} className="svc-portal-offer">
            {t("svc.offer")}
          </Link>
        </div>
      </div>
      <nav className="svc-portal-tabs" aria-label={t("cat.services")}>
        {SERVICE_PORTAL_TABS.map((tab) => {
          const cat = findCategory(tab.id);
          const href = cat ? hrefForCategory(cat) : "/kategoriler/ustalar-hizmetler";
          const on = isTabActive(path, href, tab.id);
          return (
            <Link key={tab.id} href={href} className={`svc-portal-tab ${on ? "is-on" : ""}`}>
              {tab.label}
            </Link>
          );
        })}
        <Link href="/acil" className={`svc-portal-tab is-urgent ${path.startsWith("/acil") ? "is-on" : ""}`}>
          {t("svc.urgent")}
        </Link>
      </nav>
    </div>
  );
}

function isTabActive(path: string, href: string, tabId: string) {
  if (path === href || path.startsWith(`${href}/`)) return true;
  if (!path.startsWith("/ustalar-hizmetler/")) return false;
  const segs = path.replace(/^\/ustalar-hizmetler\/?/, "").split("/").filter(Boolean);
  const current = findCategoryFromRenoPath(segs);
  return Boolean(current && (current.id === tabId || current.id.startsWith(`${tabId}-`)));
}

export function servicesSearchHref(q: string, city: string, district: string) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (city) params.set("city", city);
  if (district) params.set("district", district);
  params.set("kategori", "ustalar-hizmetler");
  return `/ara?${params.toString()}`;
}
