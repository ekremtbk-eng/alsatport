/**
 * Membership tenure for display badges — computed from real join time only.
 * Never invent years. Not a trust/verified guarantee.
 */

export type MembershipTenure = {
  kind: "new" | "months" | "years";
  /** Whole years completed (0 if under 1 year). */
  years: number;
  /** Whole months completed when under 1 year. */
  months: number;
};

export function membershipTenureFromJoinedAt(joinedAt: number, now = Date.now()): MembershipTenure | null {
  if (!Number.isFinite(joinedAt) || joinedAt <= 0 || now < joinedAt) return null;
  const ms = now - joinedAt;
  const days = Math.floor(ms / 86_400_000);
  if (days < 30) return { kind: "new", years: 0, months: 0 };
  const start = new Date(joinedAt);
  const end = new Date(now);
  let years = end.getFullYear() - start.getFullYear();
  const anniversary = new Date(start);
  anniversary.setFullYear(start.getFullYear() + years);
  if (anniversary > end) years -= 1;
  if (years >= 1) return { kind: "years", years, months: 0 };
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(1, months);
  return { kind: "months", years: 0, months };
}

/** Parse locale date strings like "24 Eylül 2016" / "24.09.2016" / ISO when only a year is reliable. */
export function membershipTenureFromSinceLabel(label: string | undefined, now = Date.now()): MembershipTenure | null {
  if (!label?.trim()) return null;
  const iso = Date.parse(label);
  if (Number.isFinite(iso) && iso > 0) return membershipTenureFromJoinedAt(iso, now);
  const y = label.match(/(19|20)\d{2}/)?.[0];
  if (!y) return null;
  // Mid-year approximation when only the year is known from a formatted date.
  return membershipTenureFromJoinedAt(Date.UTC(Number(y), 6, 1), now);
}

export function membershipTenureShortLabel(
  tenure: MembershipTenure,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (tenure.kind === "years") return t("member.badge.years", { n: tenure.years });
  if (tenure.kind === "months") return t("member.badge.months", { n: tenure.months });
  return t("member.badge.new");
}
