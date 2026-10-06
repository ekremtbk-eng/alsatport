/** Platform is permanently free: unlimited listings, no PayTR / paid plans. */
export const PLATFORM_FREE = true;
export const PAYMENTS_PAUSED = true;
/** Every listing is live for this many days; republishing is free and starts a new period. */
export const LISTING_LIVE_DAYS = 15;
export const COMPLIMENTARY_LISTING_ALLOWANCE = 1_000_000;

const DAY_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_GRANT_DAYS = 3650;

export type OpenAccessUser = {
  plan?: string;
  planUntil?: number;
  dopingUntil?: number;
  planListingAllowance?: number;
  openAccessUntil?: number;
};

export function paymentsPaused() {
  return PLATFORM_FREE || PAYMENTS_PAUSED;
}

export function complimentaryUntil(from = Date.now()) {
  return from + ACCOUNT_GRANT_DAYS * DAY_MS;
}

export function hasOpenAccess(user: OpenAccessUser | null | undefined, now = Date.now()) {
  if (paymentsPaused()) return true;
  return (user?.openAccessUntil ?? 0) > now;
}

/** Keep VIP-class rights while the platform is free; renew only after expiry. */
export function grantComplimentaryAccessOnce<T extends OpenAccessUser>(user: T, now = Date.now()): T {
  if (paymentsPaused() && (user.openAccessUntil ?? 0) > now) {
    if (user.plan === "vip" && (user.planListingAllowance ?? 0) >= COMPLIMENTARY_LISTING_ALLOWANCE) {
      return user;
    }
  } else if (!paymentsPaused() && (user.openAccessUntil ?? 0) > 0) {
    return user;
  }
  const until = complimentaryUntil(now);
  return {
    ...user,
    plan: "vip",
    planListingAllowance: Math.max(user.planListingAllowance ?? 0, COMPLIMENTARY_LISTING_ALLOWANCE),
    planUntil: Math.max(user.planUntil ?? 0, until),
    dopingUntil: Math.max(user.dopingUntil ?? 0, until),
    openAccessUntil: Math.max(user.openAccessUntil ?? 0, until),
  };
}
