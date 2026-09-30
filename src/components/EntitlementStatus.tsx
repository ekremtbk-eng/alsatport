"use client";

import Link from "next/link";
import { Crown, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { hasOpenAccess } from "@/lib/campaign";
import { reconcileEntitlements } from "@/lib/entitlements";
import {
  hasActiveDoping,
  liveDaysForUser,
  remainingListingSlots,
} from "@/lib/listingQuota";

function fmt(ts: number | undefined, locale: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(locale === "tr" ? "tr-TR" : locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PLAN_NAME: Record<string, string> = {
  standart: "pkg.std.name",
  profesyonel: "pkg.pro.name",
  vip: "pkg.vip.name",
};

export function EntitlementStatus({ compact = false }: { compact?: boolean }) {
  const { user } = useApp();
  const { t, locale } = useI18n();
  if (!user) return null;
  const live = reconcileEntitlements(user);
  const open = hasOpenAccess(live);
  const slots = remainingListingSlots(live);
  const liveDays = liveDaysForUser(live);
  const dopingOn = hasActiveDoping(live.dopingUntil);
  const planKey = open ? "pkg.campaign.name" : (PLAN_NAME[live.plan] ?? "pkg.std.name");

  return (
    <div className={`entitlement-card ${open ? "is-vip" : ""} ${compact ? "is-compact" : ""}`}>
      {open ? (
        <div className="entitlement-vip-head">
          <span className="entitlement-badge">VIP</span>
          <span className="entitlement-kicker">{t("pkg.campaign.badge")}</span>
        </div>
      ) : (
        <p className="entitlement-kicker is-plain">{t("pkg.active")}</p>
      )}
      <p className="entitlement-title">
        {open ? <Crown className="entitlement-crown" strokeWidth={1.8} /> : <Sparkles className="entitlement-crown" strokeWidth={1.8} />}
        {t(planKey)}
      </p>
      <ul className="entitlement-list">
        <li>{open ? t("pkg.campaign.slots") : t("quota.left", { n: slots })}</li>
        <li>{t("pkg.liveDays", { n: liveDays })}</li>
        {(open || live.plan !== "standart") && live.planUntil ? (
          <li>{t("pkg.planUntil", { date: fmt(live.openAccessUntil || live.planUntil, locale) })}</li>
        ) : null}
        <li>
          {dopingOn
            ? t("pkg.dopingUntil", { date: fmt(live.dopingUntil, locale) })
            : t("pkg.dopingOff")}
        </li>
      </ul>
      {compact && !open ? (
        <Link href="/paketler" className="entitlement-link">
          {t("footer.packages")}
        </Link>
      ) : null}
    </div>
  );
}
