"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Store } from "lucide-react";
import { BUSINESS_RETURN } from "@/lib/profile";
import { StoreLogo, VerifiedBusinessBadge } from "@/components/business/StoreBits";
import { catName, useI18n } from "@/context/I18nContext";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { businessCategories, businessCategoryName, type PublicStore } from "@/lib/business/shared";

type Filters = { categoryId: string; city: string; district: string; verified: boolean };

export function StoresDirectory({ stores, filters }: { stores: PublicStore[]; filters: Filters }) {
  const { t } = useI18n();
  const router = useRouter();

  function apply(next: Partial<Filters>) {
    const f = { ...filters, ...next };
    if (next.city !== undefined) f.district = "";
    const qs = new URLSearchParams();
    if (f.categoryId) qs.set("kategori", f.categoryId);
    if (f.city) qs.set("il", f.city);
    if (f.city && f.district) qs.set("ilce", f.district);
    if (f.verified) qs.set("dogrulanmis", "1");
    const s = qs.toString();
    router.push(s ? `/magazalar?${s}` : "/magazalar", { scroll: false });
  }

  const districts = filters.city ? districtsOf(filters.city) : [];

  return (
    <div className="biz-dir">
      <header className="biz-dir-head">
        <h1>
          <Store aria-hidden="true" />
          {t("biz.stores.title")}
        </h1>
        <p>{t("biz.stores.lead")}</p>
        <Link href={BUSINESS_RETURN} className="biz-dir-join">
          <Store aria-hidden="true" />
          <span>{t("biz.stores.join")}</span>
          <ArrowRight className="auth-biz-arrow" aria-hidden="true" />
        </Link>
      </header>

      <form className="biz-filters" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span>{t("biz.f.category")}</span>
          <select value={filters.categoryId} onChange={(e) => apply({ categoryId: e.target.value })}>
            <option value="">{t("biz.f.all")}</option>
            {businessCategories().map((c) => (
              <option key={c.id} value={c.id}>
                {catName(t, c.id, c.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("biz.f.city")}</span>
          <select value={filters.city} onChange={(e) => apply({ city: e.target.value })}>
            <option value="">{t("biz.f.all")}</option>
            {TURKEY_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("biz.f.district")}</span>
          <select value={filters.district} disabled={!filters.city} onChange={(e) => apply({ district: e.target.value })}>
            <option value="">{t("biz.f.all")}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="biz-check">
          <input type="checkbox" checked={filters.verified} onChange={(e) => apply({ verified: e.target.checked })} />
          <span>{t("biz.f.verified")}</span>
        </label>
      </form>

      <p className="biz-dir-count">{t("biz.stores.count", { n: stores.length })}</p>
      {stores.length ? (
        <ul className="biz-dir-grid">
          {stores.map((s) => (
            <li key={s.slug}>
              <Link href={`/magaza/${s.slug}`} className="biz-dir-card">
                <StoreLogo name={s.name} src={s.logoUrl} size={64} />
                <span className="biz-dir-body">
                  <span className="biz-dir-name">{s.name}</span>
                  <VerifiedBusinessBadge />
                  <span className="biz-dir-meta">{catName(t, s.categoryId, businessCategoryName(s.categoryId))}</span>
                  <span className="biz-dir-meta">
                    <MapPin aria-hidden="true" />
                    {[s.district, s.city].filter(Boolean).join(", ")}
                  </span>
                  <span className="biz-dir-count-pill">{t("biz.stores.active", { n: s.activeCount })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="biz-empty">{t("biz.stores.empty")}</p>
      )}
    </div>
  );
}
