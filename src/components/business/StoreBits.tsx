"use client";

import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { businessTypeKey, type StoreRef } from "@/lib/business/shared";

export function VerifiedBusinessBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`biz-badge${compact ? " is-compact" : ""}`} title={t("biz.badge")}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1 3 1 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1L2.7 15.5l1-3-1-3 2.8-1.6.9-3.1 3.2.3z"
          fill="currentColor"
        />
        <path d="M8 12.2l2.6 2.6L16 9.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? <span className="sr-only">{t("biz.badge")}</span> : t("biz.badge")}
    </span>
  );
}

export function StoreLogo({ name, src, size = 48 }: { name: string; src?: string; size?: number }) {
  const initial = name.trim().charAt(0).toLocaleUpperCase("tr") || "M";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="biz-logo" style={{ width: size, height: size }} />
  ) : (
    <span className="biz-logo is-empty" style={{ width: size, height: size }} aria-hidden="true">
      {initial}
    </span>
  );
}

/**
 * Corporate seller card on listing detail pages. `store` is only set for admin-approved stores,
 * which is what the verified badge means; nothing here is shown for individual sellers.
 */
export function StoreRefCard({ store, main = false }: { store: StoreRef; main?: boolean }) {
  const { t } = useI18n();
  const href = `/magaza/${store.slug}`;
  const where = [store.district, store.city].filter(Boolean).join(", ");
  return (
    <div className={`biz-ref${main ? " is-main" : ""}`}>
      <div className="biz-ref-head">
        <Link href={href} className="biz-ref-logo" aria-label={store.name}>
          <StoreLogo name={store.name} src={store.logo} size={main ? 64 : 44} />
        </Link>
        <span className="min-w-0">
          <Link href={href} className="biz-ref-name">
            {store.name}
          </Link>
          <span className="biz-ref-type">{t(businessTypeKey(store.categoryId))}</span>
          <VerifiedBusinessBadge />
        </span>
      </div>
      {where ? (
        <p className="biz-ref-place">
          <MapPin aria-hidden="true" />
          {where}
        </p>
      ) : null}
      <div className="biz-ref-actions">
        <Link href={href} className="biz-btn is-primary">
          <Store aria-hidden="true" className="h-4 w-4" />
          {t("biz.goStore")}
        </Link>
        <Link href={`${href}#ilanlar`} className="biz-btn">
          {t("biz.allListings")}
        </Link>
      </div>
    </div>
  );
}
