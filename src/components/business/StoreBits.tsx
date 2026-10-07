"use client";

import Link from "next/link";
import { useI18n } from "@/context/I18nContext";
import type { StoreRef } from "@/lib/business/shared";

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

/** Seller block addition on listing detail pages for admin-approved stores. */
export function StoreRefCard({ store }: { store: StoreRef }) {
  const { t } = useI18n();
  const href = `/magaza/${store.slug}`;
  return (
    <div className="biz-ref">
      <Link href={href} className="biz-ref-head">
        <StoreLogo name={store.name} src={store.logo} size={44} />
        <span className="min-w-0">
          <span className="biz-ref-name">{store.name}</span>
          <VerifiedBusinessBadge />
        </span>
      </Link>
      <div className="biz-ref-actions">
        <Link href={href} className="biz-btn is-primary">
          {t("biz.goStore")}
        </Link>
        <Link href={`${href}#ilanlar`} className="biz-btn">
          {t("biz.otherListings")}
        </Link>
      </div>
    </div>
  );
}
