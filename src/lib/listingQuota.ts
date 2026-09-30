import {
  COMPLIMENTARY_ACCESS_DAYS,
  COMPLIMENTARY_LISTING_ALLOWANCE,
  hasOpenAccess,
} from "@/lib/campaign";

export const FREE_LISTING_QUOTA = 3;
export const FREE_LIVE_DAYS = 7;
export const DOPING_LIVE_DAYS = 3;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type PaidPlanId = "profesyonel" | "vip";
export type PlanId = "standart" | PaidPlanId;
export type ShopProductId = PlanId | "doping";

export const PLAN_LIVE_DAYS: Record<PlanId, number> = {
  standart: 7,
  profesyonel: 15,
  vip: 30,
};

export const PLAN_LISTING_ALLOWANCE: Record<PlanId, number> = {
  standart: 0,
  profesyonel: 15,
  vip: 50,
};

export type QuotaUser = {
  plan?: PlanId | string;
  freeListingQuota?: number;
  listingsPosted?: number;
  planListingAllowance?: number;
  dopingUntil?: number;
  planUntil?: number;
  openAccessUntil?: number;
};

export function liveDaysForPlan(plan?: string) {
  if (plan === "vip") return PLAN_LIVE_DAYS.vip;
  if (plan === "profesyonel") return PLAN_LIVE_DAYS.profesyonel;
  return PLAN_LIVE_DAYS.standart;
}

export function liveDaysForUser(user: QuotaUser | null | undefined, now = Date.now()) {
  if (hasOpenAccess(user, now)) return COMPLIMENTARY_ACCESS_DAYS;
  return liveDaysForPlan(user?.plan);
}

export function dopingUntilFromNow(from = Date.now()) {
  return from + DOPING_LIVE_DAYS * DAY_MS;
}

export function hasActiveDoping(dopingUntil?: number, now = Date.now()) {
  return (dopingUntil ?? 0) > now;
}

/** Öne çıkarma yalnızca VIP üyelik ve tekli Doping satın alımına aittir. */
export function listingGetsFeaturedPlacement(plan?: string, dopingUntil?: number, now = Date.now()) {
  return plan === "vip" || hasActiveDoping(dopingUntil, now);
}

export function listingIsPromoted(user: QuotaUser | null | undefined, now = Date.now()) {
  if (hasOpenAccess(user, now)) return true;
  return listingGetsFeaturedPlacement(user?.plan, user?.dopingUntil, now);
}

export function listingCap(user: QuotaUser | null | undefined, now = Date.now()) {
  if (hasOpenAccess(user, now)) {
    return COMPLIMENTARY_LISTING_ALLOWANCE;
  }
  const free = user?.freeListingQuota ?? FREE_LISTING_QUOTA;
  const plan = (user?.plan as PlanId) || "standart";
  const extra =
    typeof user?.planListingAllowance === "number"
      ? user.planListingAllowance
      : (PLAN_LISTING_ALLOWANCE[plan] ?? 0);
  return free + extra;
}

export function listingsPostedOf(user: QuotaUser | null | undefined) {
  return Math.max(0, user?.listingsPosted ?? 0);
}

export function remainingListingSlots(user: QuotaUser | null | undefined, now = Date.now()) {
  if (hasOpenAccess(user, now)) return COMPLIMENTARY_LISTING_ALLOWANCE;
  return Math.max(0, listingCap(user, now) - listingsPostedOf(user));
}

export function canPublishListing(user: QuotaUser | null | undefined, now = Date.now()) {
  if (hasOpenAccess(user, now)) return true;
  return remainingListingSlots(user, now) > 0;
}

export function expiresAtFromNow(plan?: string, from = Date.now()) {
  return from + liveDaysForPlan(plan) * DAY_MS;
}

export function expiresAtForUser(user: QuotaUser | null | undefined, from = Date.now()) {
  if (hasOpenAccess(user, from)) {
    return from + COMPLIMENTARY_ACCESS_DAYS * DAY_MS;
  }
  return expiresAtFromNow(user?.plan, from);
}

export function isListingExpired(listing: { expiresAt?: number; status?: string }, now = Date.now()) {
  if (!listing.expiresAt) return false;
  return listing.expiresAt <= now;
}

export function applyExpiryToListing<T extends { expiresAt?: number; status: "active" | "passive" | "pending" | "rejected" }>(
  listing: T,
  now = Date.now(),
): T {
  if (listing.status === "active" && isListingExpired(listing, now)) {
    return { ...listing, status: "passive" };
  }
  return listing;
}
