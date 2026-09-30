/** Launch window: full VIP-class access, no checkout. Flip PAYMENTS_PAUSED to restore PayTR. */
export const COMPLIMENTARY_ACCESS_DAYS = 90;
export const COMPLIMENTARY_LISTING_ALLOWANCE = 10_000;
export const PAYMENTS_PAUSED = true;

const DAY_MS = 24 * 60 * 60 * 1000;

export type OpenAccessUser = {
  plan?: string;
  planUntil?: number;
  dopingUntil?: number;
  planListingAllowance?: number;
  openAccessUntil?: number;
};

export function paymentsPaused() {
  return PAYMENTS_PAUSED;
}

export function complimentaryUntil(from = Date.now()) {
  return from + COMPLIMENTARY_ACCESS_DAYS * DAY_MS;
}

export function hasOpenAccess(user: OpenAccessUser | null | undefined, now = Date.now()) {
  return (user?.openAccessUntil ?? 0) > now;
}

/** One-time 3-month grant. A past openAccessUntil means the campaign already ran — do not renew. */
export function grantComplimentaryAccessOnce<T extends OpenAccessUser>(user: T, now = Date.now()): T {
  if ((user.openAccessUntil ?? 0) > 0) return user;
  const until = complimentaryUntil(now);
  return {
    ...user,
    plan: "vip",
    planListingAllowance: Math.max(user.planListingAllowance ?? 0, COMPLIMENTARY_LISTING_ALLOWANCE),
    planUntil: Math.max(user.planUntil ?? 0, until),
    dopingUntil: Math.max(user.dopingUntil ?? 0, until),
    openAccessUntil: until,
  };
}
