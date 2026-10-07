"use client";

import Link from "next/link";
import { BadgeCheck, Building2, Clock3, XCircle } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import type { OwnerBusiness } from "@/lib/business/shared";

/** Status of the user's corporate application, shown in the profile and on the application page. */
export function BusinessStatusCard({ business, showApplyLink = true }: { business: OwnerBusiness | null; showApplyLink?: boolean }) {
  const { t } = useI18n();

  if (!business) {
    return (
      <div className="biz-status is-none">
        <Building2 aria-hidden="true" />
        <div>
          <p className="biz-status-title">{t("biz.cta.title")}</p>
          <p className="biz-status-text">{t("biz.cta.text")}</p>
          {showApplyLink ? (
            <Link href="/kurumsal-hesap" className="biz-btn is-primary">
              {t("biz.cta.button")}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const Icon = business.status === "approved" ? BadgeCheck : business.status === "pending" ? Clock3 : XCircle;
  return (
    <div className={`biz-status is-${business.status}`}>
      <Icon aria-hidden="true" />
      <div>
        <p className="biz-status-title">
          {business.name} · <span className="biz-status-pill">{t(`biz.status.${business.status}`)}</span>
        </p>
        <p className="biz-status-text">{t(`biz.status.${business.status}.text`)}</p>
        {business.rejectReason && (business.status === "rejected" || business.status === "revoked") ? (
          <p className="biz-status-reason">
            {t("biz.reason")}: {business.rejectReason}
          </p>
        ) : null}
        <div className="biz-status-actions">
          {business.status === "approved" ? (
            <>
              <Link href="/isletme-paneli" className="biz-btn is-primary">
                {t("biz.panel")}
              </Link>
              <Link href={`/magaza/${business.slug}`} className="biz-btn">
                {t("biz.viewStore")}
              </Link>
            </>
          ) : showApplyLink ? (
            <Link href="/kurumsal-hesap" className="biz-btn is-primary">
              {business.status === "pending" ? t("biz.viewApplication") : t("biz.reapply")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
