"use client";

import Link from "next/link";
import { BadgeCheck, Building2, ChevronDown, ClipboardList, Clock3, Package, PlusCircle, Store, Zap } from "lucide-react";
import { useOwnBusiness } from "@/components/business/useOwnBusiness";
import { NEW_LISTING_HREF, businessNavState } from "@/lib/business/navState";
import type { DashPanelId } from "@/lib/dashboardNav";

export function ListingNavGroup({
  panel,
  go,
  t,
  collapsed,
  toggle,
}: {
  panel: DashPanelId;
  go: (id: DashPanelId) => void;
  t: (k: string) => string;
  collapsed: boolean;
  toggle: () => void;
}) {
  const { business } = useOwnBusiness();
  const nav = businessNavState(business);
  const inPath = panel === "ilanlarim" || panel === "kurumsal";
  const BizIcon = nav.key === "pending" ? Clock3 : Building2;
  const listingsActive = panel === "ilanlarim";
  const bizActive = panel === "kurumsal";

  return (
    <li className="dash-ilan" data-biz={nav.key}>
      <button
        type="button"
        className={`dash-ilan-head ${inPath ? "is-current" : ""}`}
        onClick={toggle}
        aria-expanded={!collapsed}
      >
        <span className="dash-ilan-tile" aria-hidden="true">
          <ClipboardList strokeWidth={2} />
        </span>
        <span className="dash-ilan-title">{t("dash.g.ilan")}</span>
        <ChevronDown className={`dash-nav-chev ${collapsed ? "" : "is-open"}`} strokeWidth={2} />
      </button>
      {collapsed ? null : (
        <ul className="dash-ilan-list">
          <li>
            <button
              type="button"
              className={`dash-ilan-row ${listingsActive ? "is-active" : ""}`}
              aria-current={listingsActive ? "page" : undefined}
              onClick={() => go("ilanlarim")}
            >
              <span className="dash-ilan-ico" aria-hidden="true">
                <Package strokeWidth={1.9} />
              </span>
              <span className="dash-ilan-label">{t("dash.ilanlarim")}</span>
            </button>
          </li>
          <li>
            <Link href={NEW_LISTING_HREF} className="dash-ilan-row">
              <span className="dash-ilan-ico" aria-hidden="true">
                <PlusCircle strokeWidth={1.9} />
              </span>
              <span className="dash-ilan-label">{t("dash.nav.new")}</span>
            </Link>
          </li>
          {nav.urgentHref ? (
            <li>
              <Link href={nav.urgentHref} className="dash-ilan-row is-urgent">
                <span className="dash-ilan-ico" aria-hidden="true">
                  <Zap strokeWidth={1.9} />
                </span>
                <span className="dash-ilan-label">{t("dash.nav.urgent")}</span>
              </Link>
            </li>
          ) : null}
          <li>
            <Link
              href={nav.href}
              className={`dash-ilan-row is-biz tone-${nav.tone} ${bizActive ? "is-active" : ""}`}
              aria-current={bizActive ? "page" : undefined}
            >
              <span className="dash-ilan-ico" aria-hidden="true">
                <BizIcon strokeWidth={1.9} />
              </span>
              <span className="dash-ilan-label">{t(nav.labelKey)}</span>
              {nav.badgeKey ? (
                <span className={`dash-ilan-badge tone-${nav.tone}`}>
                  {nav.tone === "verified" ? <BadgeCheck aria-hidden="true" strokeWidth={2.2} /> : null}
                  {t(nav.badgeKey)}
                </span>
              ) : null}
            </Link>
          </li>
          {nav.storeHref ? (
            <li>
              <Link href={nav.storeHref} className="dash-ilan-row is-sub">
                <span className="dash-ilan-ico" aria-hidden="true">
                  <Store strokeWidth={1.9} />
                </span>
                <span className="dash-ilan-label">{t("dash.nav.store")}</span>
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </li>
  );
}
