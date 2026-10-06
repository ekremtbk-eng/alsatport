import type { UserProfile } from "@/data/store";
import { grantComplimentaryAccessOnce, hasOpenAccess } from "@/lib/campaign";
import {
  DAY_MS,
  FREE_LISTING_QUOTA,
  PLAN_LISTING_ALLOWANCE,
  dopingUntilFromNow,
  expiresAtForUser,
  hasActiveDoping,
  listingIsPromoted,
  liveDaysForPlan,
  liveDaysForUser,
  type PlanId,
} from "@/lib/listingQuota";
export type PaidShopProduct = "profesyonel" | "vip" | "doping";

export function isPaidShopProduct(value: string): value is PaidShopProduct {
  return value === "profesyonel" || value === "vip" || value === "doping";
}

const PLAN_RANK: Record<PlanId, number> = {
  standart: 0,
  profesyonel: 1,
  vip: 2,
};

export function asPlan(plan?: string): PlanId {
  if (plan === "vip" || plan === "profesyonel") return plan;
  return "standart";
}

/** Yeni üye: ücretsiz VIP sınıfı erişim (platform ücretsiz). */
export function standardPackageFields(freeListingQuota = FREE_LISTING_QUOTA): Pick<
  UserProfile,
  | "plan"
  | "freeListingQuota"
  | "listingsPosted"
  | "planListingAllowance"
  | "dopingUntil"
  | "planUntil"
  | "openAccessUntil"
> {
  return grantComplimentaryAccessOnce({
    plan: "standart" as const,
    freeListingQuota,
    listingsPosted: 0,
    planListingAllowance: 0,
    dopingUntil: 0,
    planUntil: 0,
    openAccessUntil: 0,
  });
}

export function ensureEntitlements(profile: UserProfile): UserProfile {
  const granted = grantComplimentaryAccessOnce(profile);
  const plan = asPlan(granted.plan);
  return {
    ...granted,
    plan,
    freeListingQuota: granted.freeListingQuota ?? FREE_LISTING_QUOTA,
    listingsPosted: granted.listingsPosted ?? 0,
    planListingAllowance:
      typeof granted.planListingAllowance === "number"
        ? granted.planListingAllowance
        : PLAN_LISTING_ALLOWANCE[plan],
    dopingUntil: granted.dopingUntil ?? 0,
    planUntil: granted.planUntil ?? 0,
    openAccessUntil: granted.openAccessUntil ?? 0,
  };
}

/** Süresi biten ücretli paket / doping haklarını düşürür; gösterim ve kota bunun üzerinden hesaplanır. */
export function reconcileEntitlements(profile: UserProfile, now = Date.now()): UserProfile {
  const base = ensureEntitlements(profile);
  const dopingUntil = hasActiveDoping(base.dopingUntil, now) ? (base.dopingUntil ?? 0) : 0;
  const paid = base.plan === "vip" || base.plan === "profesyonel";
  const timedOut = typeof base.planUntil === "number" && base.planUntil > 0 && base.planUntil <= now;
  if (paid && timedOut && !hasOpenAccess(base, now)) {
    return {
      ...base,
      plan: "standart",
      planListingAllowance: 0,
      planUntil: 0,
      dopingUntil,
    };
  }
  return { ...base, dopingUntil };
}

export function entitlementsChanged(a: UserProfile, b: UserProfile) {
  return (
    a.plan !== b.plan ||
    a.freeListingQuota !== b.freeListingQuota ||
    a.listingsPosted !== b.listingsPosted ||
    a.planListingAllowance !== b.planListingAllowance ||
    a.dopingUntil !== b.dopingUntil ||
    a.planUntil !== b.planUntil ||
    a.openAccessUntil !== b.openAccessUntil
  );
}

export type ListingEntitlementPatch = {
  expiresAt: number;
  featured: boolean;
  vip: boolean;
  liveDays: number;
};

export function listingPatchForProfile(profile: UserProfile, now = Date.now()): ListingEntitlementPatch {
  const live = reconcileEntitlements(profile, now);
  return {
    liveDays: liveDaysForUser(live, now),
    expiresAt: expiresAtForUser(live, now),
    featured: listingIsPromoted(live, now),
    vip: asPlan(live.plan) === "vip" || hasOpenAccess(live, now),
  };
}
export function fulfillPaidProduct(profile: UserProfile, product: PaidShopProduct, now = Date.now()): UserProfile {
  const base = reconcileEntitlements(profile, now);
  if (product === "doping") {
    const from = Math.max(now, base.dopingUntil ?? 0);
    return {
      ...base,
      dopingUntil: dopingUntilFromNow(from),
    };
  }

  const bought = product as PlanId;
  const current = asPlan(base.plan);
  const nextPlan = PLAN_RANK[bought] >= PLAN_RANK[current] ? bought : current;
  const extra = PLAN_LISTING_ALLOWANCE[bought];
  const liveFrom = Math.max(now, base.planUntil ?? 0);
  return {
    ...base,
    plan: nextPlan,
    planListingAllowance: (base.planListingAllowance ?? 0) + extra,
    planUntil: liveFrom + liveDaysForPlan(nextPlan) * DAY_MS,
  };
}
