"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Heart, MessageCircle, PlusCircle, Store } from "lucide-react";
import { ProfileFields, type ProfileValues } from "@/components/business/BusinessFormFields";
import { BusinessStatusCard } from "@/components/business/BusinessStatusCard";
import { StoreLogo, VerifiedBusinessBadge } from "@/components/business/StoreBits";
import { useOwnBusiness } from "@/components/business/useOwnBusiness";
import { SellerListings } from "@/components/listings/SellerListings";
import { useI18n } from "@/context/I18nContext";
import type { OwnerBusiness } from "@/lib/business/shared";
import { apiPatch } from "@/lib/security/client";

function profileOf(b: OwnerBusiness): ProfileValues {
  return {
    categoryId: b.categoryId,
    city: b.city,
    district: b.district,
    description: b.description,
    website: b.website,
    email: b.email,
    phone: b.phone,
    logoUrl: b.logoUrl,
    coverUrl: b.coverUrl,
  };
}

export default function BusinessPanelPage() {
  const { t } = useI18n();
  const { business, setBusiness } = useOwnBusiness();
  const [v, setV] = useState<ProfileValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business?.status === "approved") setV(profileOf(business));
  }, [business]);

  if (business === undefined) {
    return <div className="biz-page"><p className="biz-hint">{t("common.loading")}</p></div>;
  }
  if (!business || business.status !== "approved" || !v) {
    return (
      <div className="biz-page">
        <h1 className="biz-page-title">{t("biz.panel")}</h1>
        <BusinessStatusCard business={business} />
      </div>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!v) return;
    setError("");
    setSaved(false);
    setBusy(true);
    const res = await apiPatch<{ ok?: boolean; error?: string; business?: OwnerBusiness }>("/api/account/business", v);
    setBusy(false);
    if (!res.ok || !res.business) return setError(t(res.error ?? "auth.err.server"));
    setBusiness(res.business);
    setSaved(true);
  }

  const stats = business.stats;
  return (
    <div className="biz-page is-wide">
      <header className="biz-panel-head">
        <StoreLogo name={business.name} src={business.logoUrl} size={64} />
        <div className="min-w-0">
          <h1 className="biz-page-title">{business.name}</h1>
          <VerifiedBusinessBadge />
        </div>
        <div className="biz-panel-links">
          <Link href={`/magaza/${business.slug}`} className="biz-btn">
            <Store aria-hidden="true" className="h-4 w-4" />
            {t("biz.viewStore")}
          </Link>
          <Link href="/mesajlar" className="biz-btn">
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            {t("biz.messages")}
          </Link>
          <Link href="/ilan-ver" className="biz-btn is-primary">
            <PlusCircle aria-hidden="true" className="h-4 w-4" />
            {t("biz.newListing")}
          </Link>
        </div>
      </header>

      {stats ? (
        <section className="biz-panel-stats" aria-label={t("biz.stats")}>
          <div>
            <strong>{stats.active}</strong>
            <span>{t("biz.stat.active")}</span>
          </div>
          <div>
            <strong>{stats.expired}</strong>
            <span>{t("biz.stat.expired")}</span>
          </div>
          <div>
            <strong>{stats.sold}</strong>
            <span>{t("biz.stat.sold")}</span>
          </div>
          <div>
            <strong>
              <Eye aria-hidden="true" />
              {stats.views}
            </strong>
            <span>{t("biz.stat.views")}</span>
          </div>
          <div>
            <strong>
              <Heart aria-hidden="true" />
              {stats.favorites}
            </strong>
            <span>{t("biz.stat.favorites")}</span>
          </div>
        </section>
      ) : null}

      <section className="biz-card">
        <h2>{t("biz.myListings")}</h2>
        <SellerListings rounded="rounded-xl" />
      </section>

      <section className="biz-card">
        <h2>{t("biz.editProfile")}</h2>
        <p className="biz-hint">{t("biz.lockedFields")}</p>
        <form className="biz-form" onSubmit={save}>
          <div className="biz-form-grid">
            <ProfileFields v={v} set={(patch) => setV((cur) => (cur ? { ...cur, ...patch } : cur))} />
          </div>
          {error ? <p className="biz-err">{error}</p> : null}
          {saved ? <p className="biz-ok">{t("biz.saved")}</p> : null}
          <div className="biz-form-actions">
            <button type="submit" className="biz-btn is-primary" disabled={busy}>
              {busy ? t("common.loading") : t("biz.save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
