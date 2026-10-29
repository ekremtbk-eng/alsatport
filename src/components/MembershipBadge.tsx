"use client";

import { membershipTenureFromJoinedAt, membershipTenureFromSinceLabel, membershipTenureShortLabel } from "@/lib/membershipTenure";
import { useI18n } from "@/context/I18nContext";

type Props = {
  joinedAt?: number | null;
  sinceLabel?: string | null;
  className?: string;
};

/** Green tenure badge from real join data. Not a verified-seller mark. */
export function MembershipBadge({ joinedAt, sinceLabel, className = "" }: Props) {
  const { t } = useI18n();
  const tenure =
    (typeof joinedAt === "number" ? membershipTenureFromJoinedAt(joinedAt) : null) ??
    membershipTenureFromSinceLabel(sinceLabel ?? undefined);
  if (!tenure) return null;
  const label = membershipTenureShortLabel(tenure, t);
  return (
    <span className={`member-badge ${className}`} title={t("member.badge.hint")}>
      <span className="member-badge-ring" aria-hidden />
      <span className="member-badge-txt">{label}</span>
    </span>
  );
}
