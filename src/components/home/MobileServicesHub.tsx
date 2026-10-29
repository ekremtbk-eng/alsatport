"use client";

import Link from "next/link";
import {
  BarChart3,
  Building2,
  Calculator,
  Car,
  ChevronRight,
  ClipboardCheck,
  Grid2X2,
  Home,
  Search,
  Wrench,
} from "lucide-react";
import { findCategory, hrefForCategory } from "@/data/categories";
import { Logo } from "@/components/Logo";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { useState } from "react";
import { Bell } from "lucide-react";

type HubLink = {
  id: string;
  href: string;
  labelKey: string;
  Icon: typeof Car;
  tone: string;
  /** When false, render as inactive info row (integration not live). */
  live: boolean;
};

function catHref(id: string, fallback: string) {
  const cat = findCategory(id);
  return cat ? hrefForCategory(cat) : fallback;
}

/**
 * Mobile Servisler hub — only live links go to real AlSatPort routes.
 * Placeholder rows stay visible but disabled so we never fake third-party tools.
 */
export function MobileServicesHub() {
  const { t } = useI18n();
  const { unreadNotifications } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);

  const vehicle: HubLink[] = [
    {
      id: "auto-repair",
      href: catHref("services-auto", "/kategoriler/ustalar-hizmetler"),
      labelKey: "svc.hub.vehicle.repair",
      Icon: Wrench,
      tone: "is-orange",
      live: true,
    },
    {
      id: "auto-all",
      href: catHref("services-auto", "/ustalar-hizmetler"),
      labelKey: "svc.hub.vehicle.all",
      Icon: Grid2X2,
      tone: "is-slate",
      live: true,
    },
    {
      id: "damage",
      href: "#",
      labelKey: "svc.hub.vehicle.damage",
      Icon: Search,
      tone: "is-red",
      live: false,
    },
    {
      id: "value",
      href: "#",
      labelKey: "svc.hub.vehicle.value",
      Icon: BarChart3,
      tone: "is-green",
      live: false,
    },
    {
      id: "expert",
      href: "#",
      labelKey: "svc.hub.vehicle.expert",
      Icon: ClipboardCheck,
      tone: "is-blue",
      live: false,
    },
    {
      id: "newcars",
      href: "#",
      labelKey: "svc.hub.vehicle.new",
      Icon: Car,
      tone: "is-purple",
      live: false,
    },
  ];

  const realty: HubLink[] = [
    {
      id: "reno",
      href: catHref("services-reno", "/kategoriler/ustalar-hizmetler"),
      labelKey: "svc.hub.realty.services",
      Icon: Home,
      tone: "is-green",
      live: true,
    },
    {
      id: "all-svc",
      href: "/ustalar-hizmetler",
      labelKey: "svc.hub.realty.all",
      Icon: Grid2X2,
      tone: "is-slate",
      live: true,
    },
    {
      id: "index",
      href: "#",
      labelKey: "svc.hub.realty.index",
      Icon: BarChart3,
      tone: "is-blue",
      live: false,
    },
    {
      id: "loan",
      href: "#",
      labelKey: "svc.hub.realty.loan",
      Icon: Calculator,
      tone: "is-amber",
      live: false,
    },
    {
      id: "agent",
      href: "#",
      labelKey: "svc.hub.realty.agent",
      Icon: Building2,
      tone: "is-red",
      live: false,
    },
  ];

  return (
    <div className="msvc">
      <header className="msvc-top">
        <Logo />
        <h1 className="msvc-title">{t("nav.services")}</h1>
        <div className="relative">
          <button
            type="button"
            className="mh-ico-btn"
            aria-label={t("nav.notifications")}
            data-notif-toggle
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 ? <span className="mh-ico-dot" /> : null}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
      </header>

      <section className="msvc-card" aria-labelledby="msvc-v">
        <div className="msvc-card-head">
          <span className="msvc-card-ico is-car" aria-hidden>
            <Car className="h-5 w-5" />
          </span>
          <div>
            <h2 id="msvc-v">{t("svc.hub.vehicle.title")}</h2>
            <p>{t("svc.hub.vehicle.sub")}</p>
          </div>
        </div>
        <ul className="msvc-list">
          {vehicle.map((row) => (
            <li key={row.id}>
              <HubRow row={row} t={t} />
            </li>
          ))}
        </ul>
      </section>

      <section className="msvc-card" aria-labelledby="msvc-e">
        <div className="msvc-card-head">
          <span className="msvc-card-ico is-home" aria-hidden>
            <Home className="h-5 w-5" />
          </span>
          <div>
            <h2 id="msvc-e">{t("svc.hub.realty.title")}</h2>
            <p>{t("svc.hub.realty.sub")}</p>
          </div>
        </div>
        <ul className="msvc-list">
          {realty.map((row) => (
            <li key={row.id}>
              <HubRow row={row} t={t} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HubRow({
  row,
  t,
}: {
  row: HubLink;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const Icon = row.Icon;
  const inner = (
    <>
      <span className={`msvc-row-ico ${row.tone}`} aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <span className="msvc-row-copy">
        <span className="msvc-row-name">{t(row.labelKey)}</span>
        {!row.live ? <span className="msvc-row-soon">{t("svc.hub.soon")}</span> : null}
      </span>
      {row.live ? <ChevronRight className="msvc-row-chev" aria-hidden /> : null}
    </>
  );
  if (!row.live) {
    return (
      <span className="msvc-row is-soon" aria-disabled="true">
        {inner}
      </span>
    );
  }
  return (
    <Link href={row.href} className="msvc-row">
      {inner}
    </Link>
  );
}
