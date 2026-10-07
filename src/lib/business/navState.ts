import type { OwnerBusiness } from "./shared";

export const BUSINESS_APPLY_HREF = "/kurumsal-hesap";
export const BUSINESS_PANEL_HREF = "/isletme-paneli";
export const NEW_LISTING_HREF = "/ilan-ver";
export const URGENT_LISTING_HREF = "/ilan-ver?acil=1";

export type BusinessNavTone = "neutral" | "free" | "pending" | "verified" | "attention";

export type BusinessNavState = {
  key: "loading" | "none" | OwnerBusiness["status"];
  href: string;
  labelKey: string;
  badgeKey?: string;
  tone: BusinessNavTone;
  /** Only for an approved business with a valid slug. */
  storeHref?: string;
  /** Only for an approved business. */
  urgentHref?: string;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Menu presentation only. `business` must come from the session-bound `/api/account/business` response;
 * every linked page and the urgent flag are re-authorized on the server.
 */
export function businessNavState(business: OwnerBusiness | null | undefined): BusinessNavState {
  if (business === undefined) {
    return { key: "loading", href: BUSINESS_APPLY_HREF, labelKey: "dash.biz", tone: "neutral" };
  }
  if (!business) {
    return { key: "none", href: BUSINESS_APPLY_HREF, labelKey: "biz.cta.button", badgeKey: "dash.badge.free", tone: "free" };
  }
  switch (business.status) {
    case "approved":
      return {
        key: "approved",
        href: BUSINESS_PANEL_HREF,
        labelKey: "biz.panel",
        badgeKey: "dash.badge.verified",
        tone: "verified",
        storeHref: SLUG.test(business.slug) ? `/magaza/${business.slug}` : undefined,
        urgentHref: URGENT_LISTING_HREF,
      };
    case "pending":
      return { key: "pending", href: BUSINESS_APPLY_HREF, labelKey: "dash.nav.bizApp", badgeKey: "biz.status.pending", tone: "pending" };
    case "rejected":
      return { key: "rejected", href: BUSINESS_APPLY_HREF, labelKey: "dash.nav.bizApp", badgeKey: "dash.badge.update", tone: "attention" };
    case "revoked":
      return { key: "revoked", href: BUSINESS_APPLY_HREF, labelKey: "dash.nav.bizApp", badgeKey: "dash.badge.reapply", tone: "attention" };
    default:
      return { key: "loading", href: BUSINESS_APPLY_HREF, labelKey: "dash.biz", tone: "neutral" };
  }
}
