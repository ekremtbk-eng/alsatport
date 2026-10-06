"use client";

import { Crown, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { hasOpenAccess } from "@/lib/campaign";
import { reconcileEntitlements } from "@/lib/entitlements";
import { liveDaysForUser, remainingListingSlots } from "@/lib/listingQuota";

const PLAN_NAME: Record<string, string> = {
  standart: "pkg.std.name",
  profesyonel: "pkg.pro.name",
  vip: "pkg.vip.name",
};

export function EntitlementStatus({ compact = false }: { compact?: boolean }) {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) return null;
  const live = reconcileEntitlements(user);
  const open = hasOpenAccess(live);
  const slots = remainingListingSlots(live);
  const liveDays = liveDaysForUser(live);
  const planKey = open ? "pkg.campaign.name" : (PLAN_NAME[live.plan] ?? "pkg.std.name");

  return (
    <div className={`entitlement-card ${open ? "is-vip" : ""} ${compact ? "is-compact" : ""}`}>
      {open ? (
        <div className="entitlement-vip-head">
          <span className="entitlement-badge">Ücretsiz</span>
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
      </ul>
    </div>
  );
}
