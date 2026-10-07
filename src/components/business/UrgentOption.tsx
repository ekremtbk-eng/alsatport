"use client";

import Link from "next/link";
import { Lock, Store, Zap } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import type { OwnerBusiness } from "@/lib/business/shared";
import { BUSINESS_RETURN } from "@/lib/profile";

/**
 * Display only: the server re-checks the seller's approved business account on every create/update,
 * so unlocking this UI cannot grant the flag.
 */
export function UrgentOption({
  business,
  value,
  onChange,
}: {
  business: OwnerBusiness | null | undefined;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useI18n();
  if (business === undefined) return null;

  if (business?.status === "approved") {
    return (
      <label className={`urgent-opt ${value ? "is-on" : ""}`}>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <span className="urgent-opt-icon">
          <Zap className="h-4 w-4" aria-hidden />
        </span>
        <span className="urgent-opt-body">
          <b>{t("urgent.opt.title")}</b>
          <small>{t("urgent.opt.hint")}</small>
        </span>
      </label>
    );
  }

  return (
    <div className="urgent-opt is-locked">
      <span className="urgent-opt-icon">
        <Lock className="h-4 w-4" aria-hidden />
      </span>
      <span className="urgent-opt-body">
        <b>
          {t("urgent.lock.title")} <em>{t("urgent.lock.badge")}</em>
        </b>
        <small>{t(business?.status === "pending" ? "urgent.lock.pending" : "urgent.lock.text")}</small>
        <Link href={BUSINESS_RETURN} className="urgent-opt-cta">
          <Store className="h-4 w-4" aria-hidden />
          {t(business?.status === "pending" ? "biz.viewApplication" : "urgent.lock.cta")}
        </Link>
      </span>
    </div>
  );
}
